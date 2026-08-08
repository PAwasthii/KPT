import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';

/**
 * Compute stock status based on current quantity vs minimum stock quantity.
 * OUT_OF_STOCK: qty === 0
 * CRITICAL:     qty > 0 and qty <= 5
 * LOW:          qty > 5 and qty < minStockQty
 * HEALTHY:      qty >= minStockQty
 */
function computeStockStatus(stockQty: number, minStockQty: number): string {
  if (stockQty === 0) return 'OUT_OF_STOCK';
  if (stockQty <= 5) return 'CRITICAL';
  if (stockQty < minStockQty) return 'LOW';
  return 'HEALTHY';
}

export class StockController {
  /**
   * GET /api/kpt/stock
   * Paginated list with optional filters: partnerId, stockStatus, category, search
   */
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
            partner: {
              select: { id: true, name: true, code: true, tier: true },
            },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      handleError(error, res, 'Get all stock entries');
    }
  }

  /**
   * GET /api/kpt/stock/alerts
   * Returns all entries where stockStatus is LOW, CRITICAL, or OUT_OF_STOCK, ordered by severity
   */
  async getAlerts(req: Request, res: Response) {
    try {
      // Order severity: OUT_OF_STOCK > CRITICAL > LOW
      const alerts = await prisma.stockEntry.findMany({
        where: {
          stockStatus: { in: ['OUT_OF_STOCK', 'CRITICAL', 'LOW'] },
        },
        include: {
          partner: {
            select: { id: true, name: true, code: true, tier: true, contactPhone: true },
          },
        },
        orderBy: [
          // Prisma doesn't support custom sort on enum by severity, so we fetch all and sort in JS
          { lastUpdated: 'asc' },
        ],
      });

      // Sort by severity: OUT_OF_STOCK first, then CRITICAL, then LOW
      const severityOrder: Record<string, number> = {
        OUT_OF_STOCK: 0,
        CRITICAL: 1,
        LOW: 2,
      };

      alerts.sort((a, b) => {
        const aOrder = severityOrder[a.stockStatus] ?? 99;
        const bOrder = severityOrder[b.stockStatus] ?? 99;
        return aOrder - bOrder;
      });

      return res.json({
        success: true,
        data: alerts,
        total: alerts.length,
      });
    } catch (error) {
      handleError(error, res, 'Get stock alerts');
    }
  }

  /**
   * GET /api/kpt/stock/partner/:partnerId
   * All stock entries for a specific partner
   */
  async getByPartner(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      if (!partnerId) {
        return handleValidationError(res, 'Partner ID is required', 'partnerId', 'Get stock by partner');
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id: partnerId } });
      if (!partner) {
        return handleNotFoundError(res, 'Channel partner', 'Get stock by partner');
      }

      const entries = await prisma.stockEntry.findMany({
        where: { partnerId },
        orderBy: { productName: 'asc' },
      });

      return res.json({ success: true, data: entries });
    } catch (error) {
      handleError(error, res, 'Get stock by partner');
    }
  }

  /**
   * POST /api/kpt/stock
   * Create a stock entry.
   * Required: partnerId, productName, sku, category, stockQty, unitPrice
   * stockStatus is auto-computed from stockQty vs minStockQty
   */
  async create(req: Request, res: Response) {
    try {
      const {
        partnerId,
        productName,
        sku,
        category,
        stockQty,
        minStockQty,
        reorderQty,
        unitPrice,
      } = req.body;

      if (!partnerId || !productName || !sku || !category || stockQty === undefined || unitPrice === undefined) {
        return handleValidationError(
          res,
          'Missing required fields: partnerId, productName, sku, category, stockQty, unitPrice',
          undefined,
          'Create stock entry'
        );
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id: partnerId } });
      if (!partner) {
        return handleNotFoundError(res, 'Channel partner', 'Create stock entry');
      }

      const resolvedMinQty: number = minStockQty ?? 10;
      const qty: number = Number(stockQty);
      const stockStatus = computeStockStatus(qty, resolvedMinQty);

      const entry = await prisma.stockEntry.create({
        data: {
          partnerId,
          productName: productName.trim(),
          sku: sku.trim(),
          category: category.trim(),
          stockQty: qty,
          minStockQty: resolvedMinQty,
          reorderQty: reorderQty ?? null,
          unitPrice: Number(unitPrice),
          stockStatus,
          lastUpdated: new Date(),
        },
      });

      return res.status(201).json({ success: true, data: entry });
    } catch (error) {
      handleError(error, res, 'Create stock entry');
    }
  }

  /**
   * PUT /api/kpt/stock/:id
   * Update a stock entry. Recomputes stockStatus from updated stockQty.
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return handleValidationError(res, 'Stock entry ID is required', 'id', 'Update stock entry');
      }

      const existing = await prisma.stockEntry.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Stock entry', 'Update stock entry');
      }

      const {
        productName,
        sku,
        category,
        stockQty,
        minStockQty,
        reorderQty,
        unitPrice,
      } = req.body;

      // Resolve new values, falling back to existing for stockStatus computation
      const newQty: number = stockQty !== undefined ? Number(stockQty) : existing.stockQty;
      const newMinQty: number = minStockQty !== undefined ? Number(minStockQty) : existing.minStockQty;
      const stockStatus = computeStockStatus(newQty, newMinQty);

      const updated = await prisma.stockEntry.update({
        where: { id },
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

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update stock entry');
    }
  }

  /**
   * DELETE /api/kpt/stock/:id
   * Delete a stock entry
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return handleValidationError(res, 'Stock entry ID is required', 'id', 'Delete stock entry');
      }

      const existing = await prisma.stockEntry.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Stock entry', 'Delete stock entry');
      }

      await prisma.stockEntry.delete({ where: { id } });

      return res.json({ success: true, message: 'Stock entry deleted successfully' });
    } catch (error) {
      handleError(error, res, 'Delete stock entry');
    }
  }
}
