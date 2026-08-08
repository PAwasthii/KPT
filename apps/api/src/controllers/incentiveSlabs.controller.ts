import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';

export class IncentiveSlabController {
  /**
   * GET /api/kpt/incentive-slabs
   * Returns all incentive slabs, optionally filtered by tier or isActive
   */
  async getAll(req: Request, res: Response) {
    try {
      const { tier, isActive } = req.query;

      const where: any = {};

      if (tier) where.tier = tier;
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const slabs = await prisma.incentiveSlab.findMany({
        where,
        orderBy: [
          { tier: 'asc' },
          { minSaleAmount: 'asc' },
        ],
      });

      return res.json({ success: true, data: slabs });
    } catch (error) {
      handleError(error, res, 'Get all incentive slabs');
    }
  }

  /**
   * POST /api/kpt/incentive-slabs
   * Create a new incentive slab.
   * Required: tier, minSaleAmount, incentivePercent
   */
  async create(req: Request, res: Response) {
    try {
      const {
        tier,
        minSaleAmount,
        maxSaleAmount,
        incentivePercent,
        description,
        isActive,
      } = req.body;

      if (!tier || minSaleAmount === undefined || incentivePercent === undefined) {
        return handleValidationError(
          res,
          'Missing required fields: tier, minSaleAmount, incentivePercent',
          undefined,
          'Create incentive slab'
        );
      }

      const slab = await prisma.incentiveSlab.create({
        data: {
          tier,
          minSaleAmount: Number(minSaleAmount),
          maxSaleAmount: maxSaleAmount !== undefined ? Number(maxSaleAmount) : null,
          incentivePercent: Number(incentivePercent),
          description: description ?? null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      return res.status(201).json({ success: true, data: slab });
    } catch (error) {
      handleError(error, res, 'Create incentive slab');
    }
  }

  /**
   * PUT /api/kpt/incentive-slabs/:id
   * Update an incentive slab
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return handleValidationError(res, 'Slab ID is required', 'id', 'Update incentive slab');
      }

      const existing = await prisma.incentiveSlab.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Incentive slab', 'Update incentive slab');
      }

      const {
        tier,
        minSaleAmount,
        maxSaleAmount,
        incentivePercent,
        description,
        isActive,
      } = req.body;

      const updated = await prisma.incentiveSlab.update({
        where: { id },
        data: {
          ...(tier !== undefined && { tier }),
          ...(minSaleAmount !== undefined && { minSaleAmount: Number(minSaleAmount) }),
          ...(maxSaleAmount !== undefined && { maxSaleAmount: Number(maxSaleAmount) }),
          ...(incentivePercent !== undefined && { incentivePercent: Number(incentivePercent) }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update incentive slab');
    }
  }

  /**
   * DELETE /api/kpt/incentive-slabs/:id
   * Delete an incentive slab
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return handleValidationError(res, 'Slab ID is required', 'id', 'Delete incentive slab');
      }

      const existing = await prisma.incentiveSlab.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Incentive slab', 'Delete incentive slab');
      }

      await prisma.incentiveSlab.delete({ where: { id } });

      return res.json({ success: true, message: 'Incentive slab deleted successfully' });
    } catch (error) {
      handleError(error, res, 'Delete incentive slab');
    }
  }
}
