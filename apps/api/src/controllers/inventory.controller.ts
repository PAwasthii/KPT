import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { AuditCategory, StockStatus } from '@prisma/client';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { recordAuditLog } from '../utils/audit.utils.js';

function computeStockStatus(totalQty: number, minStockQty: number): StockStatus {
  if (totalQty === 0) return StockStatus.OUT_OF_STOCK;
  if (totalQty <= 5) return StockStatus.CRITICAL;
  if (totalQty < minStockQty) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

export class InventoryController {
  async getAll(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const requestedLimit = parseInt(req.query.limit as string);
      const limit = requestedLimit >= 1 && requestedLimit <= 500 ? requestedLimit : 50;
      const skip = (page - 1) * limit;

      const { stockStatus, category, search } = req.query;

      const where: any = {};
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

      const [total, items] = await Promise.all([
        prisma.inventoryItem.count({ where }),
        prisma.inventoryItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { productName: 'asc' },
        }),
      ]);

      return res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      handleError(error, res, 'Get all inventory items');
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { productName, sku, category, description, totalQty, minStockQty, reorderQty, unitPrice } = req.body;

      if (!productName || !sku || !category || totalQty === undefined || unitPrice === undefined) {
        return handleValidationError(
          res,
          'Missing required fields: productName, sku, category, totalQty, unitPrice',
          undefined,
          'Create inventory item'
        );
      }

      const qty = Number(totalQty);
      const minQty = Number(minStockQty ?? 10);
      const stockStatus = computeStockStatus(qty, minQty);

      const item = await prisma.inventoryItem.create({
        data: {
          productName: String(productName).trim(),
          sku: String(sku).trim(),
          category: String(category).trim(),
          description: description ? String(description).trim() : null,
          totalQty: qty,
          minStockQty: minQty,
          reorderQty: reorderQty !== undefined ? Number(reorderQty) : 20,
          unitPrice: Number(unitPrice),
          stockStatus,
          lastUpdated: new Date(),
        },
      });

      await recordAuditLog({
        action: 'INVENTORY_CREATED',
        changedBy: req.user!.id,
        entityType: 'InventoryItem',
        entityId: item.id,
        newValues: { productName: item.productName, sku: item.sku, totalQty: qty, stockStatus },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      handleError(error, res, 'Create inventory item');
    }
  }

  async bulkImport(req: Request, res: Response) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return handleValidationError(res, 'items must be a non-empty array', 'items', 'Bulk import inventory');
      }

      if (items.length > 500) {
        return handleValidationError(res, 'Maximum 500 items per import', 'items', 'Bulk import inventory');
      }

      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const raw of items) {
        const sku = String(raw.sku ?? '').trim();
        const productName = String(raw.productName ?? '').trim();

        if (!sku || !productName) {
          errors.push(`Skipped row — missing SKU or Product Name`);
          continue;
        }

        const qty = Number(raw.totalQty ?? 0);
        const minQty = Number(raw.minStockQty ?? 10);
        const stockStatus = computeStockStatus(qty, minQty);

        const existing = await prisma.inventoryItem.findUnique({ where: { sku } });

        if (existing) {
          await prisma.inventoryItem.update({
            where: { sku },
            data: {
              productName,
              category: String(raw.category ?? existing.category).trim(),
              description: raw.description ? String(raw.description).trim() : existing.description,
              totalQty: qty,
              minStockQty: minQty,
              reorderQty: raw.reorderQty !== undefined ? Number(raw.reorderQty) : existing.reorderQty,
              unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : existing.unitPrice,
              stockStatus,
              lastUpdated: new Date(),
            },
          });
          updated++;
        } else {
          await prisma.inventoryItem.create({
            data: {
              productName,
              sku,
              category: String(raw.category ?? 'Uncategorized').trim(),
              description: raw.description ? String(raw.description).trim() : null,
              totalQty: qty,
              minStockQty: minQty,
              reorderQty: raw.reorderQty !== undefined ? Number(raw.reorderQty) : 20,
              unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : 0,
              stockStatus,
              lastUpdated: new Date(),
            },
          });
          created++;
        }
      }

      await recordAuditLog({
        action: 'INVENTORY_BULK_IMPORT',
        changedBy: req.user!.id,
        entityType: 'InventoryItem',
        entityId: 0,
        newValues: { created, updated, errors: errors.length },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, created, updated, errors });
    } catch (error) {
      handleError(error, res, 'Bulk import inventory');
    }
  }

  async update(req: Request, res: Response) {
    try {
      const itemId = parseInt(req.params.id ?? '');
      if (!itemId || isNaN(itemId)) {
        return handleValidationError(res, 'Inventory item ID is required', 'id', 'Update inventory item');
      }

      const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
      if (!existing) {
        return handleNotFoundError(res, 'Inventory item', 'Update inventory item');
      }

      const { productName, sku, category, description, totalQty, minStockQty, reorderQty, unitPrice } = req.body;

      const newQty = totalQty !== undefined ? Number(totalQty) : existing.totalQty;
      const newMinQty = minStockQty !== undefined ? Number(minStockQty) : existing.minStockQty;
      const stockStatus = computeStockStatus(newQty, newMinQty);

      const updated = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          ...(productName !== undefined && { productName: String(productName).trim() }),
          ...(sku !== undefined && { sku: String(sku).trim() }),
          ...(category !== undefined && { category: String(category).trim() }),
          ...(description !== undefined && { description: description ? String(description).trim() : null }),
          totalQty: newQty,
          minStockQty: newMinQty,
          ...(reorderQty !== undefined && { reorderQty: Number(reorderQty) }),
          ...(unitPrice !== undefined && { unitPrice: Number(unitPrice) }),
          stockStatus,
          lastUpdated: new Date(),
        },
      });

      await recordAuditLog({
        action: 'INVENTORY_UPDATED',
        changedBy: req.user!.id,
        entityType: 'InventoryItem',
        entityId: existing.id,
        oldValues: { totalQty: existing.totalQty, stockStatus: existing.stockStatus },
        newValues: { totalQty: newQty, stockStatus },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update inventory item');
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const itemId = parseInt(req.params.id ?? '');
      if (!itemId || isNaN(itemId)) {
        return handleValidationError(res, 'Inventory item ID is required', 'id', 'Delete inventory item');
      }

      const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
      if (!existing) {
        return handleNotFoundError(res, 'Inventory item', 'Delete inventory item');
      }

      await prisma.inventoryItem.delete({ where: { id: itemId } });

      await recordAuditLog({
        action: 'INVENTORY_DELETED',
        changedBy: req.user!.id,
        entityType: 'InventoryItem',
        entityId: existing.id,
        oldValues: { productName: existing.productName, sku: existing.sku, totalQty: existing.totalQty },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (error) {
      handleError(error, res, 'Delete inventory item');
    }
  }
}
