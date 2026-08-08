import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { handleError } from '../utils/errorHandler.js';

export class PerformanceController {
  /**
   * GET /api/kpt/performance/revenue
   * Per-partner revenue sorted by ytdSales desc.
   * Includes tier, type, and key financial fields.
   */
  async getRevenueSummary(req: Request, res: Response) {
    try {
      const partners = await prisma.channelPartner.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          tier: true,
          city: true,
          state: true,
          region: true,
          currentMonthSales: true,
          ytdSales: true,
          targetAmount: true,
          outstandingPayment: true,
          creditLimit: true,
        },
        orderBy: { ytdSales: 'desc' },
      });

      return res.json({ success: true, data: partners, total: partners.length });
    } catch (error) {
      handleError(error, res, 'Get revenue summary');
    }
  }

  /**
   * GET /api/kpt/performance/rankings
   * Leaderboard: rank, partner name, tier, ytdSales, targetAmount, achievementPct
   */
  async getPartnerRankings(req: Request, res: Response) {
    try {
      const partners = await prisma.channelPartner.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          tier: true,
          city: true,
          state: true,
          ytdSales: true,
          targetAmount: true,
          currentMonthSales: true,
        },
        orderBy: { ytdSales: 'desc' },
      });

      const rankings = partners.map((partner, index) => {
        const ytd = Number(partner.ytdSales ?? 0);
        const target = Number(partner.targetAmount ?? 0);
        const achievementPct = target > 0 ? Math.round((ytd / target) * 100 * 100) / 100 : 0;

        return {
          rank: index + 1,
          id: partner.id,
          code: partner.code,
          name: partner.name,
          type: partner.type,
          tier: partner.tier,
          city: partner.city,
          state: partner.state,
          ytdSales: ytd,
          targetAmount: target,
          achievementPct,
          currentMonthSales: Number(partner.currentMonthSales ?? 0),
        };
      });

      return res.json({ success: true, data: rankings, total: rankings.length });
    } catch (error) {
      handleError(error, res, 'Get partner rankings');
    }
  }

  /**
   * GET /api/kpt/performance/trends
   * Last 8 months of incentive data grouped by period,
   * summing salesAmount and incentiveAmount per period.
   */
  async getMonthlyTrends(req: Request, res: Response) {
    try {
      // Build the last 8 month period strings (format: "YYYY-MM")
      const now = new Date();
      const periods: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        periods.push(`${y}-${m}`);
      }

      const incentives = await prisma.partnerIncentive.findMany({
        where: {
          period: { in: periods },
        },
        select: {
          period: true,
          salesAmount: true,
          incentiveAmount: true,
          status: true,
        },
      });

      // Group and aggregate by period
      const periodMap: Record<string, { period: string; totalSales: number; totalIncentive: number; count: number }> = {};

      for (const p of periods) {
        periodMap[p] = { period: p, totalSales: 0, totalIncentive: 0, count: 0 };
      }

      for (const inc of incentives) {
        if (periodMap[inc.period]) {
          periodMap[inc.period].totalSales += Number(inc.salesAmount ?? 0);
          periodMap[inc.period].totalIncentive += Number(inc.incentiveAmount ?? 0);
          periodMap[inc.period].count += 1;
        }
      }

      const trends = periods.map((p) => periodMap[p]);

      return res.json({ success: true, data: trends });
    } catch (error) {
      handleError(error, res, 'Get monthly trends');
    }
  }

  /**
   * GET /api/kpt/performance/kpis
   * Dashboard KPIs: activePartners, totalRevenueYTD, totalPendingIncentives,
   * lowStockAlerts, newDealersThisMonth
   */
  async getDashboardKPIs(req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        activePartners,
        allActivePartners,
        pendingIncentives,
        lowStockAlerts,
        newDealersThisMonth,
      ] = await Promise.all([
        // Count of active partners
        prisma.channelPartner.count({
          where: { status: 'ACTIVE' },
        }),

        // Sum ytdSales across all active partners
        prisma.channelPartner.findMany({
          where: { status: 'ACTIVE' },
          select: { ytdSales: true },
        }),

        // Sum of incentiveAmount for PENDING incentives
        prisma.partnerIncentive.aggregate({
          where: { status: 'PENDING' },
          _sum: { incentiveAmount: true },
          _count: { id: true },
        }),

        // Count of LOW, CRITICAL, OUT_OF_STOCK stock entries
        prisma.stockEntry.count({
          where: { stockStatus: { in: ['LOW', 'CRITICAL', 'OUT_OF_STOCK'] } },
        }),

        // Count of new DEALER-type partners created this month
        prisma.channelPartner.count({
          where: {
            type: 'DEALER',
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

      const totalRevenueYTD = allActivePartners.reduce(
        (sum, p) => sum + Number(p.ytdSales ?? 0),
        0
      );

      return res.json({
        success: true,
        data: {
          activePartners,
          totalRevenueYTD,
          totalPendingIncentives: {
            count: pendingIncentives._count.id,
            amount: Number(pendingIncentives._sum.incentiveAmount ?? 0),
          },
          lowStockAlerts,
          newDealersThisMonth,
        },
      });
    } catch (error) {
      handleError(error, res, 'Get dashboard KPIs');
    }
  }
}
