import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { AuditCategory, StockStatus } from '@prisma/client';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { recordAuditLog } from '../utils/audit.utils.js';
import { createNotification, notifyAdmins } from './notification.controller.js';

const STOCK_ALERT_LABELS: Record<string, string> = {
  LOW: 'Low Stock',
  CRITICAL: 'Critical Stock',
  OUT_OF_STOCK: 'Out of Stock',
};

function computeStockStatus(totalQty: number, minStockQty: number): StockStatus {
  if (totalQty === 0) return StockStatus.OUT_OF_STOCK;
  if (totalQty <= 5) return StockStatus.CRITICAL;
  if (totalQty < minStockQty) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

/**
 * Find or create a Product record for a given SKU/productName/category.
 * Returns the Product's id, or null on failure.
 */
async function syncProductRecord(opts: {
  sku: string;
  productName: string;
  category: string;
  description?: string | null;
  existingProductId?: number | null;
}): Promise<number | null> {
  try {
    // If we already have a linked product, return it
    if (opts.existingProductId) return opts.existingProductId;

    // Find existing Product by matching code (SKU)
    const existing = await prisma.product.findUnique({ where: { code: opts.sku } });
    if (existing) return existing.id;

    // Find or create ProductCategory by string name (case-insensitive)
    let cat = await prisma.productCategory.findFirst({
      where: { name: { equals: opts.category, mode: 'insensitive' } },
    });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: { name: opts.category, description: `${opts.category} products` },
      });
    }

    const created = await prisma.product.create({
      data: {
        code: opts.sku,
        name: opts.productName,
        description: opts.description ?? null,
        categoryId: cat.id,
        active: true,
      },
    });
    return created.id;
  } catch {
    return null;
  }
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

      const skuTrimmed = String(sku).trim();
      const existing = await prisma.inventoryItem.findUnique({ where: { sku: skuTrimmed } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `SKU "${skuTrimmed}" already exists in inventory. Edit the existing item to update its quantity.`,
        });
      }

      const qty = Number(totalQty);
      const minQty = Number(minStockQty ?? 10);
      const stockStatus = computeStockStatus(qty, minQty);

      // Find or create linked Product record (canonical product for Sales flow)
      const productId = await syncProductRecord({
        sku: skuTrimmed,
        productName: String(productName).trim(),
        category: String(category).trim(),
        description: description ? String(description).trim() : null,
      });

      const item = await prisma.inventoryItem.create({
        data: {
          productName: String(productName).trim(),
          sku: skuTrimmed,
          category: String(category).trim(),
          description: description ? String(description).trim() : null,
          totalQty: qty,
          minStockQty: minQty,
          reorderQty: reorderQty !== undefined ? Number(reorderQty) : 20,
          unitPrice: Number(unitPrice),
          stockStatus,
          lastUpdated: new Date(),
          ...(productId ? { productId } : {}),
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

      createNotification({
        userId: req.user!.id,
        type: 'INVENTORY_CREATED',
        title: 'Inventory Item Added',
        message: `"${item.productName}" (SKU: ${item.sku}) added with ${qty} unit(s).`,
        link: '/stock-inventory',
      }).catch(() => {});

      if (stockStatus !== StockStatus.HEALTHY) {
        const label = STOCK_ALERT_LABELS[stockStatus] ?? stockStatus;
        notifyAdmins({
          type: stockStatus === StockStatus.OUT_OF_STOCK ? 'INVENTORY_OUT_OF_STOCK'
            : stockStatus === StockStatus.CRITICAL ? 'INVENTORY_CRITICAL_STOCK' : 'INVENTORY_LOW_STOCK',
          title: `${label} — ${item.productName}`,
          message: `Newly added item "${item.productName}" (SKU: ${item.sku}) has only ${qty} unit(s), below minimum threshold.`,
          link: '/stock-visibility/alerts',
        }).catch(() => {});
      }

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
        const categoryStr = String(raw.category ?? 'Uncategorized').trim();

        const existingInv = await prisma.inventoryItem.findUnique({ where: { sku } });

        if (existingInv) {
          await prisma.inventoryItem.update({
            where: { sku },
            data: {
              productName,
              category: categoryStr,
              description: raw.description ? String(raw.description).trim() : existingInv.description,
              totalQty: qty,
              minStockQty: minQty,
              reorderQty: raw.reorderQty !== undefined ? Number(raw.reorderQty) : existingInv.reorderQty,
              unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : existingInv.unitPrice,
              stockStatus,
              lastUpdated: new Date(),
            },
          });

          // Sync name/category to linked Product
          if (existingInv.productId) {
            const productUpdate: any = { name: productName };
            const cat = await prisma.productCategory.findFirst({
              where: { name: { equals: categoryStr, mode: 'insensitive' } },
            });
            if (cat) productUpdate.categoryId = cat.id;
            if (raw.description !== undefined) productUpdate.description = raw.description ? String(raw.description).trim() : null;
            await prisma.product.update({ where: { id: existingInv.productId }, data: productUpdate }).catch(() => {});
          }

          updated++;
        } else {
          // New item: find or create Product
          const productId = await syncProductRecord({
            sku,
            productName,
            category: categoryStr,
            description: raw.description ? String(raw.description).trim() : null,
          });

          await prisma.inventoryItem.create({
            data: {
              productName,
              sku,
              category: categoryStr,
              description: raw.description ? String(raw.description).trim() : null,
              totalQty: qty,
              minStockQty: minQty,
              reorderQty: raw.reorderQty !== undefined ? Number(raw.reorderQty) : 20,
              unitPrice: raw.unitPrice !== undefined ? Number(raw.unitPrice) : 0,
              stockStatus,
              lastUpdated: new Date(),
              ...(productId ? { productId } : {}),
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

      const allFailed = created === 0 && updated === 0 && errors.length > 0;
      const hasErrors = errors.length > 0;
      createNotification({
        userId: req.user!.id,
        type: 'INVENTORY_BULK_IMPORT',
        title: allFailed ? 'Bulk Import Failed' : hasErrors ? 'Bulk Import Completed with Errors' : 'Bulk Import Successful',
        message: allFailed
          ? `All ${errors.length} row(s) failed to import. Please check the file and try again.`
          : `${created} item(s) added, ${updated} item(s) updated${hasErrors ? `, ${errors.length} row(s) skipped` : ''}.`,
        link: '/stock-inventory',
      }).catch(() => {});

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

      // Sync changes to linked Product (non-fatal)
      if (updated.productId) {
        const productUpdate: any = {};
        if (productName !== undefined) productUpdate.name = String(productName).trim();
        if (description !== undefined) productUpdate.description = description ? String(description).trim() : null;
        if (sku !== undefined && sku !== existing.sku) productUpdate.code = String(sku).trim();

        if (category !== undefined) {
          const catStr = String(category).trim();
          let cat = await prisma.productCategory.findFirst({
            where: { name: { equals: catStr, mode: 'insensitive' } },
          });
          if (!cat) {
            cat = await prisma.productCategory.create({
              data: { name: catStr, description: `${catStr} products` },
            });
          }
          productUpdate.categoryId = cat.id;
        }

        if (Object.keys(productUpdate).length > 0) {
          await prisma.product.update({ where: { id: updated.productId }, data: productUpdate }).catch(() => {});
        }
      }

      await recordAuditLog({
        action: 'INVENTORY_UPDATED',
        changedBy: req.user!.id,
        entityType: 'InventoryItem',
        entityId: existing.id,
        oldValues: { totalQty: existing.totalQty, stockStatus: existing.stockStatus },
        newValues: { totalQty: newQty, stockStatus },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      if (stockStatus !== StockStatus.HEALTHY && stockStatus !== existing.stockStatus) {
        const label = STOCK_ALERT_LABELS[stockStatus] ?? stockStatus;
        notifyAdmins({
          type: stockStatus === StockStatus.OUT_OF_STOCK ? 'INVENTORY_OUT_OF_STOCK'
            : stockStatus === StockStatus.CRITICAL ? 'INVENTORY_CRITICAL_STOCK' : 'INVENTORY_LOW_STOCK',
          title: `${label} Alert — ${existing.productName}`,
          message: `"${existing.productName}" (SKU: ${existing.sku}) now has ${newQty} unit(s) remaining.`,
          link: '/stock-visibility/alerts',
        }).catch(() => {});
      }

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

      // Handle linked Product before deleting InventoryItem
      if (existing.productId) {
        const [pbeCount, oliCount, qliCount, soliCount] = await Promise.all([
          prisma.priceBookEntry.count({ where: { productId: existing.productId } }),
          prisma.opportunityLineItem.count({ where: { productId: existing.productId } }),
          prisma.quoteLineItem.count({ where: { productId: existing.productId } }),
          prisma.salesOrderLineItem.count({ where: { productId: existing.productId } }),
        ]);

        const hasDownstreamRefs = pbeCount + oliCount + qliCount + soliCount > 0;

        if (hasDownstreamRefs) {
          // Deactivate Product to prevent it appearing in new transactions
          await prisma.product.update({
            where: { id: existing.productId },
            data: { active: false },
          }).catch(() => {});
        } else {
          // No downstream refs — safe to delete the Product too
          // First null the FK so InventoryItem can be deleted
          await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { productId: null },
          }).catch(() => {});
          await prisma.product.delete({ where: { id: existing.productId } }).catch(() => {});
        }
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
