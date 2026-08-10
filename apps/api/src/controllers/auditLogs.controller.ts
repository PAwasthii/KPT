import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { AuditCategory } from '@prisma/client';
import { handleError } from '../utils/errorHandler.js';

export class AuditLogsController {
  async getAuditLogs(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const skip = (page - 1) * limit;

      const { category, entityType, action, userId, from, to } = req.query;

      const where: any = {};

      if (category && Object.values(AuditCategory).includes(category as AuditCategory)) {
        where.category = category as AuditCategory;
      }
      if (entityType) {
        where.entityType = { contains: entityType as string, mode: 'insensitive' };
      }
      if (action) {
        where.action = { contains: action as string, mode: 'insensitive' };
      }
      if (userId) {
        const parsedUserId = parseInt(userId as string);
        if (!isNaN(parsedUserId)) where.changedBy = parsedUserId;
      }
      if (from || to) {
        where.changedAt = {};
        if (from) where.changedAt.gte = new Date(from as string);
        if (to) {
          const toDate = new Date(to as string);
          toDate.setHours(23, 59, 59, 999);
          where.changedAt.lte = toDate;
        }
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { changedAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return res.json({
        data: logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      handleError(error, res, 'Get audit logs');
    }
  }

  async getAuditLogById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          changedByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!log) return res.status(404).json({ error: 'Audit log not found' });

      return res.json(log);
    } catch (error) {
      handleError(error, res, 'Get audit log by ID');
    }
  }

  async getEntityTypes(req: Request, res: Response) {
    try {
      const types = await prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
      });
      return res.json(types.map((t) => t.entityType));
    } catch (error) {
      handleError(error, res, 'Get entity types');
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const [total, byCategoryRaw, recentCount] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.groupBy({
          by: ['category'],
          _count: { id: true },
        }),
        prisma.auditLog.count({
          where: {
            changedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const byCategory = Object.fromEntries(
        byCategoryRaw.map((r) => [r.category ?? 'UNCATEGORIZED', r._count.id])
      );

      return res.json({ total, byCategory, last24h: recentCount });
    } catch (error) {
      handleError(error, res, 'Get audit log stats');
    }
  }
}
