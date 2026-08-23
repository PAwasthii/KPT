import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { SalesOrderStatus } from '@prisma/client';
import { handleError } from '../utils/errorHandler.js';

const ACTIVE_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.IN_FULFILLMENT,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
];

// ─── Revenue Analysis helpers ───────────────────────────────────────────────

function getPeriodDates(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  switch (period) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case 'quarter': {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qStart, 1);
      const end = new Date();
      const prevStart = new Date(now.getFullYear(), qStart - 3, 1);
      const prevEnd = new Date(now.getFullYear(), qStart, 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case 'custom': {
      const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate) : new Date();
      const duration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - duration);
      return { start, end, prevStart, prevEnd };
    }
    default: {
      // ytd
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date();
      const prevStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
  }
}

function mkMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= endDate) {
    months.push(mkMonthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function getPeriodLabel(period: string, start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const labels: Record<string, string> = {
    this_month: 'This Month',
    last_month: 'Last Month',
    quarter: 'This Quarter',
    ytd: 'Year to Date',
    custom: `${fmt(start)} – ${fmt(end)}`,
  };
  return labels[period] ?? 'Selected Period';
}

export class PerformanceController {
  /**
   * GET /api/kpt/performance/revenue-analysis
   * Comprehensive revenue analysis: KPIs, trend, partner table, product table, categories, alerts.
   * Query params: period, startDate, endDate, partnerId, partnerType, region, partnerPage, productPage
   */
  async getRevenueAnalysis(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || 'ytd';
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const partnerIdRaw = req.query.partnerId as string | undefined;
      const partnerType = req.query.partnerType as string | undefined;
      const region = req.query.region as string | undefined;
      const partnerPage = Math.max(1, parseInt((req.query.partnerPage as string) || '1') || 1);
      const productPage = Math.max(1, parseInt((req.query.productPage as string) || '1') || 1);
      const PAGE_SIZE = 10;

      const { start, end, prevStart, prevEnd } = getPeriodDates(period, startDate, endDate);

      // Resolve optional partner filter to a list of IDs
      let filteredPartnerIds: number[] | null = null;
      if (partnerIdRaw || partnerType || region) {
        const pwhere: Record<string, unknown> = { status: 'ACTIVE' };
        if (partnerIdRaw) pwhere.id = parseInt(partnerIdRaw);
        if (partnerType) pwhere.type = partnerType;
        if (region) pwhere.region = { contains: region, mode: 'insensitive' };
        const fp = await prisma.channelPartner.findMany({ where: pwhere as any, select: { id: true } });
        filteredPartnerIds = fp.map(p => p.id);
      }

      const cpField = (filteredPartnerIds !== null
        ? { channelPartnerId: { in: filteredPartnerIds } }
        : { channelPartnerId: { not: null } }) as Record<string, unknown>;

      const orderWhere = (s: Date, e: Date): any => ({
        status: { in: ACTIVE_ORDER_STATUSES },
        ...cpField,
        orderDate: { gte: s, lte: e },
      });

      const liWhere = (s: Date, e: Date): any => ({
        salesOrder: { status: { in: ACTIVE_ORDER_STATUSES }, ...cpField, orderDate: { gte: s, lte: e } },
      });

      // ── Round 1: parallel DB queries ──────────────────────────────────────
      const [
        ordersCur,
        ordersPrev,
        liCur,
        liPrev,
        invoiceAgg,
        outstandingAgg,
        overdueInvoices,
        activePartnerCount,
      ] = await Promise.all([
        prisma.salesOrder.findMany({
          where: orderWhere(start, end),
          select: { channelPartnerId: true, grandTotal: true, orderDate: true },
        }),
        prisma.salesOrder.findMany({
          where: orderWhere(prevStart, prevEnd),
          select: { channelPartnerId: true, grandTotal: true, orderDate: true },
        }),
        prisma.salesOrderLineItem.findMany({
          where: liWhere(start, end),
          select: { productId: true, totalPrice: true, quantity: true },
        }),
        prisma.salesOrderLineItem.findMany({
          where: liWhere(prevStart, prevEnd),
          select: { productId: true, totalPrice: true },
        }),
        prisma.financeInvoice.aggregate({
          where: { invoiceDate: { gte: start, lte: end }, status: { notIn: ['CANCELLED', 'DRAFT'] as any } },
          _sum: { totalAmount: true },
        }),
        prisma.financeInvoice.aggregate({
          where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as any } },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        prisma.financeInvoice.findMany({
          where: { status: 'OVERDUE' as any },
          select: { totalAmount: true, paidAmount: true },
        }),
        prisma.channelPartner.count({ where: { status: 'ACTIVE' } }),
      ]);

      // ── In-memory aggregation ──────────────────────────────────────────────

      const revenue = ordersCur.reduce((s, o) => s + Number(o.grandTotal), 0);
      const prevRevenue = ordersPrev.reduce((s, o) => s + Number(o.grandTotal), 0);
      const growthPct = prevRevenue > 0
        ? Math.round(((revenue - prevRevenue) / prevRevenue) * 10000) / 100
        : null;

      // Partner maps
      const partnerRevCur = new Map<number, { revenue: number; count: number; lastDate: Date | null }>();
      for (const o of ordersCur) {
        if (!o.channelPartnerId) continue;
        const e = partnerRevCur.get(o.channelPartnerId) ?? { revenue: 0, count: 0, lastDate: null };
        e.revenue += Number(o.grandTotal);
        e.count += 1;
        if (!e.lastDate || o.orderDate > e.lastDate) e.lastDate = o.orderDate;
        partnerRevCur.set(o.channelPartnerId, e);
      }
      const partnerRevPrev = new Map<number, number>();
      for (const o of ordersPrev) {
        if (!o.channelPartnerId) continue;
        partnerRevPrev.set(o.channelPartnerId, (partnerRevPrev.get(o.channelPartnerId) ?? 0) + Number(o.grandTotal));
      }

      // Product maps
      const skuRevCur = new Map<number, { revenue: number; units: number; count: number }>();
      for (const li of liCur) {
        const e = skuRevCur.get(li.productId) ?? { revenue: 0, units: 0, count: 0 };
        e.revenue += Number(li.totalPrice);
        e.units += li.quantity;
        e.count += 1;
        skuRevCur.set(li.productId, e);
      }
      const skuRevPrev = new Map<number, number>();
      for (const li of liPrev) {
        skuRevPrev.set(li.productId, (skuRevPrev.get(li.productId) ?? 0) + Number(li.totalPrice));
      }

      // Trend (monthly)
      const months = getMonthsBetween(start, end);
      const prevMonths = getMonthsBetween(prevStart, prevEnd);
      const trendCur = new Map<string, number>();
      const trendPrev = new Map<string, number>();
      for (const o of ordersCur) {
        const k = mkMonthKey(o.orderDate);
        trendCur.set(k, (trendCur.get(k) ?? 0) + Number(o.grandTotal));
      }
      for (const o of ordersPrev) {
        const k = mkMonthKey(o.orderDate);
        trendPrev.set(k, (trendPrev.get(k) ?? 0) + Number(o.grandTotal));
      }
      const trend = months.map((m, i) => ({
        period: m,
        revenue: trendCur.get(m) ?? 0,
        prevRevenue: prevMonths[i] ? (trendPrev.get(prevMonths[i]!) ?? 0) : 0,
      }));

      // ── Round 2: fetch entity details ─────────────────────────────────────
      const partnerIdsNeeded = Array.from(partnerRevCur.keys());
      const productIdsNeeded = Array.from(skuRevCur.keys());

      const [partnerDetails, productDetails] = await Promise.all([
        partnerIdsNeeded.length > 0
          ? prisma.channelPartner.findMany({
              where: { id: { in: partnerIdsNeeded } },
              select: { id: true, name: true, type: true, region: true },
            })
          : Promise.resolve([]),
        productIdsNeeded.length > 0
          ? prisma.product.findMany({
              where: { id: { in: productIdsNeeded } },
              include: {
                category: { select: { id: true, name: true } },
                inventoryItem: { select: { totalQty: true, stockStatus: true } },
              },
            })
          : Promise.resolve([]),
      ]);

      const partnerInfoMap = new Map(partnerDetails.map(p => [p.id, p]));
      const productInfoMap = new Map(productDetails.map(p => [p.id, p]));

      // ── Build partner rows ─────────────────────────────────────────────────
      const allPartnerRows = Array.from(partnerRevCur.entries())
        .map(([pid, cur]) => {
          const info = partnerInfoMap.get(pid);
          const prev = partnerRevPrev.get(pid) ?? 0;
          const growth = prev > 0 ? Math.round(((cur.revenue - prev) / prev) * 10000) / 100 : null;
          return {
            id: pid,
            name: info?.name ?? 'Unknown',
            type: info?.type ?? 'DISTRIBUTOR',
            region: info?.region ?? null,
            revenue: cur.revenue,
            previousRevenue: prev,
            growthPct: growth,
            contributionPct: revenue > 0 ? Math.round((cur.revenue / revenue) * 10000) / 100 : 0,
            orderCount: cur.count,
            lastOrderDate: cur.lastDate?.toISOString() ?? null,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .map((p, i) => ({ rank: i + 1, ...p }));

      const partnerTotal = allPartnerRows.length;
      const partnerDataPage = allPartnerRows.slice((partnerPage - 1) * PAGE_SIZE, partnerPage * PAGE_SIZE);

      // ── Build product rows ─────────────────────────────────────────────────
      const allProductRows = Array.from(skuRevCur.entries())
        .map(([pid, cur]) => {
          const info = productInfoMap.get(pid);
          if (!info) return null;
          return {
            productId: pid,
            productCode: info.code,
            productName: info.name,
            categoryName: info.category.name,
            unitsSold: cur.units,
            revenue: cur.revenue,
            contributionPct: revenue > 0 ? Math.round((cur.revenue / revenue) * 10000) / 100 : 0,
            orderCount: cur.count,
            currentStock: info.inventoryItem?.totalQty ?? null,
            stockStatus: info.inventoryItem?.stockStatus ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.revenue - a.revenue);

      const productTotal = allProductRows.length;
      const productDataPage = allProductRows.slice((productPage - 1) * PAGE_SIZE, productPage * PAGE_SIZE);

      // ── Build category breakdown ───────────────────────────────────────────
      const catMap = new Map<number, { id: number; name: string; revenue: number; unitsSold: number; prevRevenue: number }>();
      for (const [pid, cur] of skuRevCur.entries()) {
        const info = productInfoMap.get(pid);
        if (!info) continue;
        const cat = catMap.get(info.category.id) ?? { id: info.category.id, name: info.category.name, revenue: 0, unitsSold: 0, prevRevenue: 0 };
        cat.revenue += cur.revenue;
        cat.unitsSold += cur.units;
        catMap.set(info.category.id, cat);
      }
      for (const [pid, prev] of skuRevPrev.entries()) {
        const info = productInfoMap.get(pid);
        if (!info) continue;
        const cat = catMap.get(info.category.id);
        if (cat) cat.prevRevenue += prev;
      }
      const categories = Array.from(catMap.values())
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          revenue: cat.revenue,
          unitsSold: cat.unitsSold,
          contributionPct: revenue > 0 ? Math.round((cat.revenue / revenue) * 10000) / 100 : 0,
          growthPct: cat.prevRevenue > 0
            ? Math.round(((cat.revenue - cat.prevRevenue) / cat.prevRevenue) * 10000) / 100
            : null,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── KPI values ────────────────────────────────────────────────────────
      const invoicedAmount = Number(invoiceAgg._sum.totalAmount ?? 0);
      const totalOwed = Number(outstandingAgg._sum.totalAmount ?? 0);
      const totalPaid = Number(outstandingAgg._sum.paidAmount ?? 0);
      const outstandingReceivables = Math.max(0, totalOwed - totalPaid);
      const avgRevenuePerActivePartner = activePartnerCount > 0
        ? Math.round(revenue / activePartnerCount) : 0;

      // ── Alerts ────────────────────────────────────────────────────────────
      const alerts: Array<{ type: string; severity: string; message: string }> = [];

      if (prevRevenue > 0 && growthPct !== null && growthPct < -20) {
        alerts.push({
          type: 'revenue_drop',
          severity: 'warning',
          message: `Revenue is down ${Math.abs(growthPct).toFixed(1)}% vs the previous equivalent period`,
        });
      }

      if (overdueInvoices.length > 0) {
        const overdueTotal = overdueInvoices.reduce(
          (s, inv) => s + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)), 0
        );
        const fmtCr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
        alerts.push({
          type: 'overdue_invoices',
          severity: 'critical',
          message: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} — ${fmtCr(overdueTotal)} outstanding`,
        });
      }

      let stockAlertCount = 0;
      for (let i = 0; i < Math.min(allProductRows.length, 10) && stockAlertCount < 2; i++) {
        const p = allProductRows[i]!;
        if (!['LOW', 'CRITICAL', 'OUT_OF_STOCK'].includes(p.stockStatus ?? '')) continue;
        const label =
          p.stockStatus === 'OUT_OF_STOCK' ? 'out of stock' :
          p.stockStatus === 'CRITICAL' ? 'critically low stock' : 'low stock';
        alerts.push({
          type: 'low_stock_high_sales',
          severity: p.stockStatus === 'OUT_OF_STOCK' ? 'critical' : 'warning',
          message: `${p.productName} — ${i < 3 ? 'top seller' : 'active seller'} but ${label} (${p.currentStock ?? 0} units)`,
        });
        stockAlertCount++;
      }

      return res.json({
        success: true,
        data: {
          kpis: {
            revenue,
            previousRevenue: prevRevenue,
            growthPct,
            invoicedAmount,
            outstandingReceivables,
            avgRevenuePerActivePartner,
            activePartnersWithOrders: partnerRevCur.size,
            activePartnerCount,
            periodLabel: getPeriodLabel(period, start, end),
          },
          trend,
          partners: {
            data: partnerDataPage,
            total: partnerTotal,
            page: partnerPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.ceil(partnerTotal / PAGE_SIZE),
          },
          products: {
            data: productDataPage,
            total: productTotal,
            page: productPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.ceil(productTotal / PAGE_SIZE),
          },
          categories,
          alerts,
        },
      });
    } catch (error) {
      handleError(error, res, 'Get revenue analysis');
    }
  }

  /**
   * GET /api/kpt/performance/revenue
   * Per-partner revenue derived from actual SalesOrders.
   */
  async getRevenueSummary(req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [partners, ytdTotals, monthTotals] = await Promise.all([
        prisma.channelPartner.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true, code: true, name: true, type: true, tier: true,
            city: true, state: true, region: true,
            targetAmount: true, outstandingPayment: true, creditLimit: true,
          },
        }),
        prisma.salesOrder.groupBy({
          by: ['channelPartnerId'],
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfYear },
          },
          _sum: { grandTotal: true },
        }),
        prisma.salesOrder.groupBy({
          by: ['channelPartnerId'],
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfMonth },
          },
          _sum: { grandTotal: true },
        }),
      ]);

      const ytdMap = new Map(ytdTotals.map(o => [o.channelPartnerId, Number(o._sum.grandTotal || 0)]));
      const monthMap = new Map(monthTotals.map(o => [o.channelPartnerId, Number(o._sum.grandTotal || 0)]));

      const enriched = partners.map(p => ({
        ...p,
        ytdSales: ytdMap.get(p.id) ?? 0,
        currentMonthSales: monthMap.get(p.id) ?? 0,
      })).sort((a, b) => b.ytdSales - a.ytdSales);

      return res.json({ success: true, data: enriched, total: enriched.length });
    } catch (error) {
      handleError(error, res, 'Get revenue summary');
    }
  }

  /**
   * GET /api/kpt/performance/rankings
   * Leaderboard ordered by derived YTD revenue from SalesOrders.
   */
  async getPartnerRankings(req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [partners, ytdTotals, monthTotals] = await Promise.all([
        prisma.channelPartner.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true, code: true, name: true, type: true, tier: true,
            city: true, state: true, targetAmount: true,
          },
        }),
        prisma.salesOrder.groupBy({
          by: ['channelPartnerId'],
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfYear },
          },
          _sum: { grandTotal: true },
        }),
        prisma.salesOrder.groupBy({
          by: ['channelPartnerId'],
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfMonth },
          },
          _sum: { grandTotal: true },
        }),
      ]);

      const ytdMap = new Map(ytdTotals.map(o => [o.channelPartnerId, Number(o._sum.grandTotal || 0)]));
      const monthMap = new Map(monthTotals.map(o => [o.channelPartnerId, Number(o._sum.grandTotal || 0)]));

      const rankings = partners
        .map(p => {
          const ytd = ytdMap.get(p.id) ?? 0;
          const target = Number(p.targetAmount ?? 0);
          return {
            id: p.id,
            code: p.code,
            name: p.name,
            type: p.type,
            tier: p.tier,
            city: p.city,
            state: p.state,
            ytdSales: ytd,
            targetAmount: target,
            achievementPct: target > 0 ? Math.round((ytd / target) * 10000) / 100 : 0,
            currentMonthSales: monthMap.get(p.id) ?? 0,
          };
        })
        .sort((a, b) => b.ytdSales - a.ytdSales)
        .map((p, index) => ({ ...p, rank: index + 1 }));

      return res.json({ success: true, data: rankings, total: rankings.length });
    } catch (error) {
      handleError(error, res, 'Get partner rankings');
    }
  }

  /**
   * GET /api/kpt/performance/trends
   * Last 8 months: actual sales from SalesOrders + incentive totals.
   */
  async getMonthlyTrends(req: Request, res: Response) {
    try {
      const now = new Date();
      const periods: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      // Build date range covering all periods
      const firstPeriodParts = (periods[0] ?? '').split('-').map(Number);
      const firstYear = firstPeriodParts[0] ?? now.getFullYear();
      const firstMonth = firstPeriodParts[1] ?? 1;
      const rangeStart = new Date(firstYear, firstMonth - 1, 1);

      const [salesOrders, incentives] = await Promise.all([
        prisma.salesOrder.findMany({
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: rangeStart },
          },
          select: { orderDate: true, grandTotal: true },
        }),
        prisma.partnerIncentive.findMany({
          where: { period: { in: periods } },
          select: { period: true, incentiveAmount: true },
        }),
      ]);

      const periodMap: Record<string, { period: string; totalSales: number; totalIncentive: number; count: number }> = {};
      for (const p of periods) {
        periodMap[p] = { period: p, totalSales: 0, totalIncentive: 0, count: 0 };
      }

      for (const order of salesOrders) {
        const d = new Date(order.orderDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (periodMap[key]) {
          periodMap[key].totalSales += Number(order.grandTotal);
          periodMap[key].count += 1;
        }
      }
      for (const inc of incentives) {
        const entry = periodMap[inc.period];
        if (entry) {
          entry.totalIncentive += Number(inc.incentiveAmount ?? 0);
        }
      }

      return res.json({ success: true, data: periods.map(p => periodMap[p]) });
    } catch (error) {
      handleError(error, res, 'Get monthly trends');
    }
  }

  /**
   * GET /api/kpt/performance/kpis
   * Dashboard KPIs: active partners, total YTD revenue (from orders), pending incentives, stock alerts.
   */
  async getDashboardKPIs(req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        activePartners,
        revenueYtdAgg,
        pendingIncentives,
        lowStockAlerts,
        newDealersThisMonth,
      ] = await Promise.all([
        prisma.channelPartner.count({ where: { status: 'ACTIVE' } }),

        // Total YTD revenue derived from actual SalesOrders with channelPartnerId
        prisma.salesOrder.aggregate({
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfYear },
          },
          _sum: { grandTotal: true },
        }),

        prisma.partnerIncentive.aggregate({
          where: { status: 'PENDING' },
          _sum: { incentiveAmount: true },
          _count: { id: true },
        }),

        prisma.stockEntry.count({
          where: { stockStatus: { in: ['LOW', 'CRITICAL', 'OUT_OF_STOCK'] } },
        }),

        prisma.channelPartner.count({
          where: { type: 'DEALER', createdAt: { gte: startOfMonth } },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          activePartners,
          totalRevenueYTD: Number(revenueYtdAgg._sum.grandTotal ?? 0),
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
