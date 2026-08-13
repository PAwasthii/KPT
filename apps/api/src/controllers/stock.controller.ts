import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { AuditCategory, StockStatus } from '@prisma/client';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { recordAuditLog } from '../utils/audit.utils.js';

function computeStockStatus(stockQty: number, minStockQty: number): StockStatus {
  if (stockQty === 0) return StockStatus.OUT_OF_STOCK;
  if (stockQty <= 5) return StockStatus.CRITICAL;
  if (stockQty < minStockQty) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

export class StockController {
  async getAll(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const requestedLimit = parseInt(req.query.limit as string);
      const limit = requestedLimit >= 1 && requestedLimit <= 100 ? requestedLimit : 20;
      const skip = (page - 1) * limit;

      const { partnerId, stockStatus, category, search } = req.query;

      const where: any = {};
      if (partnerId) where.partnerId = partnerId as string;
      if (stockStatus) where.stockStatus = stockStatus;
      if (category) where.category = { contains: category as string, mode: 'insensitive' };

      if (search) {
        const q = search as string;
        where.OR = [
          { productName: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [total, entries] = await Promise.all([
        prisma.stockEntry.count({ where }),
        prisma.stockEntry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { productName: 'asc' },
          include: {
            partner: { select: { id: true, name: true, code: true, tier: true } },
            inventoryItem: { select: { id: true, totalQty: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: entries,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      handleError(error, res, 'Get all stock entries');
    }
  }

  async getAlerts(req: Request, res: Response) {
    try {
      const alerts = await prisma.stockEntry.findMany({
        where: { stockStatus: { in: ['OUT_OF_STOCK', 'CRITICAL', 'LOW'] } },
        include: {
          partner: { select: { id: true, name: true, code: true, tier: true, contactPhone: true } },
        },
        orderBy: [{ lastUpdated: 'asc' }],
      });

      const severityOrder: Record<string, number> = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2 };
      alerts.sort((a, b) => (severityOrder[a.stockStatus] ?? 99) - (severityOrder[b.stockStatus] ?? 99));

      return res.json({ success: true, data: alerts, total: alerts.length });
    } catch (error) {
      handleError(error, res, 'Get stock alerts');
    }
  }

  async getByPartner(req: Request, res: Response) {
    try {
      const partnerId = parseInt(req.params.partnerId ?? '');
      if (!partnerId || isNaN(partnerId)) {
        return handleValidationError(res, 'Partner ID is required', 'partnerId', 'Get stock by partner');
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id: partnerId } });
      if (!partner) return handleNotFoundError(res, 'Channel partner', 'Get stock by partner');

      const entries = await prisma.stockEntry.findMany({
        where: { partnerId },
        orderBy: { productName: 'asc' },
        include: { inventoryItem: { select: { id: true, totalQty: true } } },
      });

      return res.json({ success: true, data: entries });
    } catch (error) {
      handleError(error, res, 'Get stock by partner');
    }
  }

  async create(req: Request, res: Response) {
    try {
      const {
        partnerId,
        inventoryItemId,
        productName,
        sku,
        category,
        stockQty,
        minStockQty,
        reorderQty,
        unitPrice,
      } = req.body;

      if (!partnerId || stockQty === undefined) {
        return handleValidationError(res, 'Missing required fields: partnerId, stockQty', undefined, 'Create stock entry');
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id: Number(partnerId) } });
      if (!partner) return handleNotFoundError(res, 'Channel partner', 'Create stock entry');

      const qty = Number(stockQty);
      let resolvedInventoryItemId: number | null = null;
      let resolvedProductName = productName;
      let resolvedSku = sku;
      let resolvedCategory = category;
      let resolvedUnitPrice = Number(unitPrice ?? 0);
      const resolvedMinQty = Number(minStockQty ?? 10);

      if (inventoryItemId) {
        const invItem = await prisma.inventoryItem.findUnique({ where: { id: Number(inventoryItemId) } });
        if (!invItem) return handleNotFoundError(res, 'Inventory item', 'Create stock entry');

        if (invItem.totalQty < qty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient inventory. Available: ${invItem.totalQty}, requested: ${qty}`,
          });
        }

        // Deduct from inventory
        await prisma.inventoryItem.update({
          where: { id: invItem.id },
          data: {
            totalQty: invItem.totalQty - qty,
            stockStatus: computeStockStatus(invItem.totalQty - qty, invItem.minStockQty),
            lastUpdated: new Date(),
          },
        });

        resolvedInventoryItemId = invItem.id;
        resolvedProductName = invItem.productName;
        resolvedSku = invItem.sku;
        resolvedCategory = invItem.category;
        resolvedUnitPrice = invItem.unitPrice;
      } else {
        // Legacy path — no inventory link
        if (!productName || !sku || !category) {
          return handleValidationError(res, 'Missing required fields: productName, sku, category', undefined, 'Create stock entry');
        }
      }

      const stockStatus = computeStockStatus(qty, resolvedMinQty);

      const entry = await prisma.stockEntry.create({
        data: {
          partnerId: Number(partnerId),
          inventoryItemId: resolvedInventoryItemId,
          productName: String(resolvedProductName).trim(),
          sku: String(resolvedSku).trim(),
          category: String(resolvedCategory).trim(),
          stockQty: qty,
          minStockQty: resolvedMinQty,
          reorderQty: reorderQty !== undefined ? Number(reorderQty) : resolvedMinQty * 2,
          unitPrice: resolvedUnitPrice,
          stockStatus,
          lastUpdated: new Date(),
        },
      });

      await recordAuditLog({
        action: 'STOCK_CREATED',
        changedBy: req.user!.id,
        entityType: 'StockEntry',
        entityId: entry.id,
        newValues: { partnerId, productName: entry.productName, sku: entry.sku, stockQty: qty, stockStatus, inventoryItemId: resolvedInventoryItemId },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: entry });
    } catch (error) {
      handleError(error, res, 'Create stock entry');
    }
  }

  async update(req: Request, res: Response) {
    try {
      const stockId = parseInt(req.params.id ?? '');
      if (!stockId || isNaN(stockId)) {
        return handleValidationError(res, 'Stock entry ID is required', 'id', 'Update stock entry');
      }

      const existing = await prisma.stockEntry.findUnique({ where: { id: stockId } });
      if (!existing) return handleNotFoundError(res, 'Stock entry', 'Update stock entry');

      const { productName, sku, category, stockQty, minStockQty, reorderQty, unitPrice } = req.body;

      const newQty = stockQty !== undefined ? Number(stockQty) : existing.stockQty;
      const newMinQty = minStockQty !== undefined ? Number(minStockQty) : existing.minStockQty;
      const stockStatus = computeStockStatus(newQty, newMinQty);

      // Sync inventory if linked and qty is increasing (more stock dispatched to partner)
      if (existing.inventoryItemId && stockQty !== undefined) {
        const diff = newQty - existing.stockQty;
        if (diff > 0) {
          const invItem = await prisma.inventoryItem.findUnique({ where: { id: existing.inventoryItemId } });
          if (invItem) {
            if (invItem.totalQty < diff) {
              return res.status(400).json({
                success: false,
                error: `Insufficient inventory. Available: ${invItem.totalQty}, additional needed: ${diff}`,
              });
            }
            await prisma.inventoryItem.update({
              where: { id: invItem.id },
              data: {
                totalQty: invItem.totalQty - diff,
                stockStatus: computeStockStatus(invItem.totalQty - diff, invItem.minStockQty),
                lastUpdated: new Date(),
              },
            });
          }
        }
        // If qty decreases (stock sold at partner), inventory stays the same — it's left the system
      }

      const updated = await prisma.stockEntry.update({
        where: { id: stockId },
        data: {
          ...(productName !== undefined && { productName: productName.trim() }),
          ...(sku !== undefined && { sku: sku.trim() }),
          ...(category !== undefined && { category: category.trim() }),
          stockQty: newQty,
          minStockQty: newMinQty,
          ...(reorderQty !== undefined && { reorderQty }),
          ...(unitPrice !== undefined && { unitPrice: Number(unitPrice) }),
          stockStatus,
          lastUpdated: new Date(),
        },
      });

      await recordAuditLog({
        action: 'STOCK_UPDATED',
        changedBy: req.user!.id,
        entityType: 'StockEntry',
        entityId: existing.id,
        oldValues: { stockQty: existing.stockQty, stockStatus: existing.stockStatus },
        newValues: { stockQty: newQty, stockStatus },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update stock entry');
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const stockId = parseInt(req.params.id ?? '');
      if (!stockId || isNaN(stockId)) {
        return handleValidationError(res, 'Stock entry ID is required', 'id', 'Delete stock entry');
      }

      const existing = await prisma.stockEntry.findUnique({ where: { id: stockId } });
      if (!existing) return handleNotFoundError(res, 'Stock entry', 'Delete stock entry');

      await prisma.stockEntry.delete({ where: { id: stockId } });

      // Return stock to inventory on delete (partner return)
      if (existing.inventoryItemId && existing.stockQty > 0) {
        const invItem = await prisma.inventoryItem.findUnique({ where: { id: existing.inventoryItemId } });
        if (invItem) {
          const restoredQty = invItem.totalQty + existing.stockQty;
          await prisma.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              totalQty: restoredQty,
              stockStatus: computeStockStatus(restoredQty, invItem.minStockQty),
              lastUpdated: new Date(),
            },
          });
        }
      }

      await recordAuditLog({
        action: 'STOCK_DELETED',
        changedBy: req.user!.id,
        entityType: 'StockEntry',
        entityId: existing.id,
        oldValues: { productName: existing.productName, sku: existing.sku, stockQty: existing.stockQty },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, message: 'Stock entry deleted successfully' });
    } catch (error) {
      handleError(error, res, 'Delete stock entry');
    }
  }
}
