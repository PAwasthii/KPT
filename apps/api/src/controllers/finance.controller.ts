import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import {
  AuditCategory,
  FinanceInvoiceStatus,
  FinanceBudgetType,
  FinanceBudgetDimension,
  SalesOrderStatus,
  IncentiveStatus,
} from '@prisma/client';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { recordAuditLog } from '../utils/audit.utils.js';

const ACTIVE_ORDER_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.APPROVED,
  SalesOrderStatus.IN_FULFILLMENT,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
];

export class FinanceController {
  // ─── OVERVIEW ────────────────────────────────────────────────────────────────

  async getOverview(req: Request, res: Response) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);

      const [
        revenueAgg,
        invoiceAgg,
        outstandingAgg,
        collectionsAgg,
        incentiveLiabilityAgg,
        yearBudgetAgg,
        invoicesByStatus,
        salesOrders,
        partnerIncentives,
        lineItemsByCategory,
        partnerRevenue,
        monthlyBudgets,
      ] = await Promise.all([
        // Total revenue from active sales orders YTD
        prisma.salesOrder.aggregate({
          where: { status: { in: ACTIVE_ORDER_STATUSES }, orderDate: { gte: startOfYear } },
          _sum: { grandTotal: true },
        }),
        // Total invoiced (non-cancelled)
        prisma.financeInvoice.aggregate({
          where: { status: { not: FinanceInvoiceStatus.CANCELLED } },
          _sum: { totalAmount: true },
        }),
        // Outstanding: unpaid invoices
        prisma.financeInvoice.findMany({
          where: { status: { in: [FinanceInvoiceStatus.ISSUED, FinanceInvoiceStatus.OVERDUE, FinanceInvoiceStatus.PARTIALLY_PAID] } },
          select: { totalAmount: true, paidAmount: true },
        }),
        // Collections: paid amounts
        prisma.financeInvoice.aggregate({
          where: { status: { in: [FinanceInvoiceStatus.PAID, FinanceInvoiceStatus.PARTIALLY_PAID] } },
          _sum: { paidAmount: true },
        }),
        // Incentive liability: approved but not paid
        prisma.partnerIncentive.aggregate({
          where: { status: IncentiveStatus.APPROVED },
          _sum: { netReward: true },
        }),
        // Budget for current year (TOTAL dimension REVENUE)
        prisma.financeBudget.aggregate({
          where: { year: currentYear, budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL },
          _sum: { budgetAmount: true },
        }),
        // Invoice counts and amounts by status
        prisma.financeInvoice.groupBy({
          by: ['status'],
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
        // Monthly sales orders for revenue vs budget chart
        prisma.salesOrder.findMany({
          where: { status: { in: ACTIVE_ORDER_STATUSES }, orderDate: { gte: startOfYear } },
          select: { orderDate: true, grandTotal: true },
        }),
        // Incentive financial impact
        prisma.partnerIncentive.groupBy({
          by: ['status'],
          _sum: { incentiveAmount: true, adjustment: true, netReward: true },
        }),
        // Revenue by product category via sales order line items
        prisma.salesOrderLineItem.findMany({
          where: { salesOrder: { status: { in: ACTIVE_ORDER_STATUSES }, orderDate: { gte: startOfYear } } },
          select: { totalPrice: true, product: { select: { category: { select: { name: true } } } } },
        }),
        // Revenue by partner — derived from actual SalesOrders with channelPartnerId
        prisma.salesOrder.groupBy({
          by: ['channelPartnerId'],
          where: {
            channelPartnerId: { not: null },
            status: { in: ACTIVE_ORDER_STATUSES },
            orderDate: { gte: startOfYear },
          },
          _sum: { grandTotal: true },
          orderBy: { _sum: { grandTotal: 'desc' } },
          take: 10,
        }),
        // Monthly budgets for current year
        prisma.financeBudget.findMany({
          where: { year: currentYear, budgetType: FinanceBudgetType.REVENUE, month: { not: null } },
          select: { month: true, budgetAmount: true },
        }),
      ]);

      // Compute outstanding
      const outstanding = outstandingAgg.reduce((sum, inv) => {
        return sum + (Number(inv.totalAmount) - Number(inv.paidAmount));
      }, 0);

      // Revenue vs budget chart: aggregate per month
      const monthlyRevenue: Record<number, number> = {};
      for (const order of salesOrders) {
        const m = new Date(order.orderDate).getMonth() + 1;
        monthlyRevenue[m] = (monthlyRevenue[m] || 0) + Number(order.grandTotal);
      }
      const monthlyBudgetMap: Record<number, number> = {};
      for (const b of monthlyBudgets) {
        if (b.month) monthlyBudgetMap[b.month] = Number(b.budgetAmount);
      }
      const currentMonth = now.getMonth() + 1;
      const revenueVsBudget = Array.from({ length: currentMonth }, (_, i) => {
        const m = i + 1;
        const actual = monthlyRevenue[m] || 0;
        const budget = monthlyBudgetMap[m] || 0;
        return { month: m, actual, budget, variance: actual - budget };
      });

      // Invoice status summary
      const invoiceStatusMap: Record<string, { count: number; amount: number }> = {};
      for (const row of invoicesByStatus) {
        invoiceStatusMap[row.status] = { count: row._count.id, amount: Number(row._sum.totalAmount || 0) };
      }

      // Revenue by category
      const categoryRevMap: Record<string, number> = {};
      for (const item of lineItemsByCategory) {
        const cat = item.product?.category?.name || 'Uncategorised';
        categoryRevMap[cat] = (categoryRevMap[cat] || 0) + Number(item.totalPrice);
      }
      const revenueByCategory = Object.entries(categoryRevMap)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // Incentive financial impact
      const incentiveImpact: Record<string, { grossIncentive: number; adjustment: number; netReward: number }> = {};
      for (const row of partnerIncentives) {
        incentiveImpact[row.status] = {
          grossIncentive: Number(row._sum.incentiveAmount || 0),
          adjustment: Number(row._sum.adjustment || 0),
          netReward: Number(row._sum.netReward || 0),
        };
      }

      // Enrich partner revenue with names and targets
      const partnerIds = partnerRevenue
        .map(r => r.channelPartnerId)
        .filter((id): id is number => id !== null);
      const partnerDetails = partnerIds.length
        ? await prisma.channelPartner.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, name: true, targetAmount: true, region: true },
          })
        : [];
      const partnerMap = new Map(partnerDetails.map(p => [p.id, p]));
      const revenueByPartner = partnerRevenue.map(r => {
        const detail = partnerMap.get(r.channelPartnerId!);
        return {
          id: r.channelPartnerId,
          name: detail?.name ?? 'Unknown',
          ytdSales: Number(r._sum.grandTotal || 0),
          targetAmount: detail?.targetAmount ?? 0,
          region: detail?.region ?? null,
        };
      });

      const totalRevenue = Number(revenueAgg._sum.grandTotal || 0);
      const totalBudget = Number(yearBudgetAgg._sum.budgetAmount || 0);
      const budgetAchievement = totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) : null;

      return res.json({
        success: true,
        data: {
          kpis: {
            totalRevenue,
            totalInvoiced: Number(invoiceAgg._sum.totalAmount || 0),
            outstanding,
            collections: Number(collectionsAgg._sum.paidAmount || 0),
            incentiveLiability: Number(incentiveLiabilityAgg._sum.netReward || 0),
            budgetAchievement,
            totalBudget,
          },
          revenueVsBudget,
          invoiceStatusSummary: invoiceStatusMap,
          revenueByPartner,
          revenueByCategory,
          incentiveFinancialImpact: incentiveImpact,
        },
      });
    } catch (error) {
      handleError(error, res, 'Finance overview');
    }
  }

  // ─── INVOICES ─────────────────────────────────────────────────────────────────

  async getInvoices(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const requestedLimit = parseInt(req.query.limit as string);
      const limit = requestedLimit >= 1 && requestedLimit <= 100 ? requestedLimit : 10;
      const skip = (page - 1) * limit;

      const { search, status, partnerId, region, dateFrom, dateTo, sortBy, sortOrder } = req.query;

      const where: any = {};

      if (status) where.status = status as FinanceInvoiceStatus;
      if (partnerId) where.partnerId = parseInt(partnerId as string);
      if (region) where.region = region;
      if (dateFrom || dateTo) {
        where.invoiceDate = {};
        if (dateFrom) where.invoiceDate.gte = new Date(dateFrom as string);
        if (dateTo) where.invoiceDate.lte = new Date(dateTo as string);
      }
      if (search) {
        const q = search as string;
        where.OR = [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { billingName: { contains: q, mode: 'insensitive' } },
          { partner: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }

      const orderByField = (sortBy as string) || 'invoiceDate';
      const orderByDir = (sortOrder as string) === 'asc' ? 'asc' : 'desc';

      const [total, invoices] = await Promise.all([
        prisma.financeInvoice.count({ where }),
        prisma.financeInvoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [orderByField]: orderByDir },
          include: {
            partner: { select: { id: true, name: true, code: true, region: true } },
            salesOrder: { select: { id: true, orderNumber: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: invoices,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      handleError(error, res, 'Get invoices');
    }
  }

  async getInvoiceById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) return handleValidationError(res, 'Invoice ID is required', 'id', 'Get invoice');

      const invoice = await prisma.financeInvoice.findUnique({
        where: { id },
        include: {
          partner: true,
          salesOrder: { select: { id: true, orderNumber: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, code: true } } }, orderBy: { sortOrder: 'asc' } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      if (!invoice) return handleNotFoundError(res, 'Invoice', 'Get invoice');
      return res.json({ success: true, data: invoice });
    } catch (error) {
      handleError(error, res, 'Get invoice by ID');
    }
  }

  async createInvoice(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { partnerId, salesOrderId, billingName, billingAddress, gstin, region,
              subtotal, taxAmount, taxPercent, discountAmount, totalAmount, dueDate,
              paymentMethod, notes, items = [] } = req.body;

      if (!totalAmount) return handleValidationError(res, 'totalAmount is required', 'totalAmount', 'Create invoice');

      // Auto-generate invoice number
      const count = await prisma.financeInvoice.count();
      const invoiceNumber = `KPT-INV-${String(count + 1).padStart(5, '0')}`;

      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.financeInvoice.create({
          data: {
            invoiceNumber,
            partnerId: partnerId ? parseInt(partnerId) : null,
            salesOrderId: salesOrderId ? parseInt(salesOrderId) : null,
            billingName, billingAddress, gstin, region,
            subtotal: subtotal || 0,
            taxAmount: taxAmount || 0,
            taxPercent: taxPercent || 18,
            discountAmount: discountAmount || 0,
            totalAmount,
            dueDate: dueDate ? new Date(dueDate) : null,
            paymentMethod, notes,
            createdBy: user.id,
          },
        });

        if (items.length > 0) {
          await tx.financeInvoiceItem.createMany({
            data: items.map((item: any, idx: number) => ({
              invoiceId: inv.id,
              productId: item.productId || null,
              sku: item.sku || null,
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              discount: item.discount || 0,
              taxAmount: item.taxAmount || 0,
              lineTotal: item.lineTotal || 0,
              sortOrder: idx,
            })),
          });
        }

        return inv;
      });

      await recordAuditLog({
        action: 'INVOICE_CREATED',
        changedBy: user.id,
        entityType: 'FinanceInvoice',
        entityId: invoice.id,
        newValues: { invoiceNumber: invoice.invoiceNumber, totalAmount, partnerId },
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      handleError(error, res, 'Create invoice');
    }
  }

  async updateInvoice(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) return handleValidationError(res, 'Invoice ID is required', 'id', 'Update invoice');

      const existing = await prisma.financeInvoice.findUnique({ where: { id } });
      if (!existing) return handleNotFoundError(res, 'Invoice', 'Update invoice');

      const { status, paidAmount, paymentDate, paymentMethod, notes, dueDate,
              billingName, billingAddress, gstin, region, subtotal, taxAmount,
              taxPercent, discountAmount, totalAmount } = req.body;

      const updated = await prisma.financeInvoice.update({
        where: { id },
        data: {
          ...(status && { status: status as FinanceInvoiceStatus }),
          ...(paidAmount !== undefined && { paidAmount }),
          ...(paymentDate && { paymentDate: new Date(paymentDate) }),
          ...(paymentMethod !== undefined && { paymentMethod }),
          ...(notes !== undefined && { notes }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(billingName !== undefined && { billingName }),
          ...(billingAddress !== undefined && { billingAddress }),
          ...(gstin !== undefined && { gstin }),
          ...(region !== undefined && { region }),
          ...(subtotal !== undefined && { subtotal }),
          ...(taxAmount !== undefined && { taxAmount }),
          ...(taxPercent !== undefined && { taxPercent }),
          ...(discountAmount !== undefined && { discountAmount }),
          ...(totalAmount !== undefined && { totalAmount }),
        },
      });

      const action = status && status !== existing.status ? 'INVOICE_STATUS_CHANGED' : 'INVOICE_UPDATED';
      await recordAuditLog({
        action,
        changedBy: user.id,
        entityType: 'FinanceInvoice',
        entityId: id,
        oldValues: action === 'INVOICE_STATUS_CHANGED' ? { status: existing.status } : undefined,
        newValues: action === 'INVOICE_STATUS_CHANGED' ? { status } : req.body,
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update invoice');
    }
  }

  // ─── SKU ANALYSIS ────────────────────────────────────────────────────────────

  async getSkuAnalysis(req: Request, res: Response) {
    try {
      const { period, category, sku: skuFilter, partnerId, region } = req.query;

      // Parse period: "YYYY-MM" = month filter, "YYYY" = year filter
      let dateFilter: any = {};
      if (period) {
        const p = period as string;
        if (/^\d{4}-\d{2}$/.test(p)) {
          const parts = p.split('-').map(Number);
          const y = parts[0]!;
          const m = parts[1]!;
          dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
        } else if (/^\d{4}$/.test(p)) {
          const y = parseInt(p);
          dateFilter = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
        }
      }

      const lineItemWhere: any = {};
      if (Object.keys(dateFilter).length) {
        lineItemWhere.salesOrder = { orderDate: dateFilter, status: { in: ACTIVE_ORDER_STATUSES } };
      } else {
        lineItemWhere.salesOrder = { status: { in: ACTIVE_ORDER_STATUSES } };
      }

      if (partnerId) {
        lineItemWhere.salesOrder = { ...lineItemWhere.salesOrder };
      }

      // Inventory items as SKU master
      const inventoryWhere: any = {};
      if (category) inventoryWhere.category = { contains: category as string, mode: 'insensitive' };
      if (skuFilter) inventoryWhere.sku = { contains: skuFilter as string, mode: 'insensitive' };

      const [inventoryItems, lineItemsRaw, stockEntries] = await Promise.all([
        prisma.inventoryItem.findMany({
          where: inventoryWhere,
          orderBy: { sku: 'asc' },
        }),
        // Revenue + units via SalesOrderLineItem joined to Product
        prisma.salesOrderLineItem.findMany({
          where: lineItemWhere,
          select: { quantity: true, totalPrice: true, product: { select: { code: true } } },
        }),
        // Current stock per SKU (sum across partners)
        prisma.stockEntry.groupBy({
          by: ['sku'],
          _sum: { stockQty: true },
          _min: { stockStatus: true },
        }),
      ]);

      // Aggregate line items by SKU (product.code = sku)
      const revenueBySkuCode: Record<string, { units: number; revenue: number }> = {};
      for (const li of lineItemsRaw) {
        const code = li.product?.code;
        if (!code) continue;
        if (!revenueBySkuCode[code]) revenueBySkuCode[code] = { units: 0, revenue: 0 };
        revenueBySkuCode[code].units += li.quantity;
        revenueBySkuCode[code].revenue += Number(li.totalPrice);
      }

      const stockBySku: Record<string, { qty: number; status: string }> = {};
      for (const se of stockEntries) {
        stockBySku[se.sku] = { qty: Number(se._sum.stockQty || 0), status: se._min.stockStatus || 'HEALTHY' };
      }

      const skus = inventoryItems.map((item) => {
        const rev = revenueBySkuCode[item.sku] || { units: 0, revenue: 0 };
        const stock = stockBySku[item.sku] || { qty: item.totalQty, status: item.stockStatus };
        return {
          sku: item.sku,
          productName: item.productName,
          category: item.category,
          unitsSold: rev.units,
          revenue: rev.revenue,
          cost: null,
          grossProfit: null,
          margin: null,
          currentStock: stock.qty,
          stockStatus: stock.status,
        };
      });

      const totalSkuRevenue = skus.reduce((s, x) => s + x.revenue, 0);
      const topRevenueSku = skus.reduce((best, x) => (x.revenue > (best?.revenue || -1) ? x : best), skus[0] || null);
      const topSellingSku = skus.reduce((best, x) => (x.unitsSold > (best?.unitsSold || -1) ? x : best), skus[0] || null);
      const lowStockSkus = skus.filter((x) => x.stockStatus === 'LOW' || x.stockStatus === 'CRITICAL' || x.stockStatus === 'OUT_OF_STOCK').length;

      return res.json({
        success: true,
        data: {
          skus,
          summaryCards: {
            totalSkus: skus.length,
            topRevenueSku: topRevenueSku?.sku || null,
            topSellingSku: topSellingSku?.sku || null,
            lowStockSkus,
            totalSkuRevenue,
          },
        },
      });
    } catch (error) {
      handleError(error, res, 'SKU analysis');
    }
  }

  async getSkuDetail(req: Request, res: Response) {
    try {
      const { sku } = req.params;
      if (!sku) return handleValidationError(res, 'SKU is required', 'sku', 'Get SKU detail');

      const [inventoryItem, lineItems, stockEntries] = await Promise.all([
        prisma.inventoryItem.findUnique({ where: { sku } }),
        prisma.salesOrderLineItem.findMany({
          where: { product: { code: sku }, salesOrder: { status: { in: ACTIVE_ORDER_STATUSES } } },
          select: { quantity: true, totalPrice: true, salesOrder: { select: { orderDate: true } } },
          orderBy: { salesOrder: { orderDate: 'asc' } },
        }),
        prisma.stockEntry.findMany({
          where: { sku },
          include: { partner: { select: { id: true, name: true } } },
        }),
      ]);

      if (!inventoryItem) return handleNotFoundError(res, 'SKU', 'Get SKU detail');

      // Monthly trend
      const monthlyMap: Record<string, { units: number; revenue: number }> = {};
      for (const li of lineItems) {
        const key = new Date(li.salesOrder.orderDate).toISOString().slice(0, 7);
        if (!monthlyMap[key]) monthlyMap[key] = { units: 0, revenue: 0 };
        monthlyMap[key].units += li.quantity;
        monthlyMap[key].revenue += Number(li.totalPrice);
      }
      const trend = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

      return res.json({
        success: true,
        data: { inventoryItem, trend, stockByPartner: stockEntries, cost: null, margin: null },
      });
    } catch (error) {
      handleError(error, res, 'Get SKU detail');
    }
  }

  // ─── BUDGETS ─────────────────────────────────────────────────────────────────

  async getBudgets(req: Request, res: Response) {
    try {
      const { year, month, budgetType, dimensionType, partnerId } = req.query;

      const where: any = {};
      if (year) where.year = parseInt(year as string);
      if (month) where.month = parseInt(month as string);
      if (budgetType) where.budgetType = budgetType as FinanceBudgetType;
      if (dimensionType) where.dimensionType = dimensionType as FinanceBudgetDimension;
      if (partnerId) where.partnerId = parseInt(partnerId as string);

      const budgets = await prisma.financeBudget.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, code: true } },
          productCategory: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      // Compute actuals for each budget
      const now = new Date();
      const budgetsWithActuals = await Promise.all(
        budgets.map(async (budget) => {
          let dateFilter: any = {};
          if (budget.month) {
            dateFilter = { gte: new Date(budget.year, budget.month - 1, 1), lt: new Date(budget.year, budget.month, 1) };
          } else {
            dateFilter = { gte: new Date(budget.year, 0, 1), lt: new Date(budget.year + 1, 0, 1) };
          }

          let actualQuery: any = { status: { in: ACTIVE_ORDER_STATUSES }, orderDate: dateFilter };
          if (budget.partnerId && budget.dimensionType === FinanceBudgetDimension.PARTNER) {
            // Can't directly filter sales orders by partner; skip granular filter
          }

          const agg = await prisma.salesOrder.aggregate({
            where: actualQuery,
            _sum: { grandTotal: true },
          });

          const actual = Number(agg._sum.grandTotal || 0);
          const budgetAmt = Number(budget.budgetAmount);
          const variance = actual - budgetAmt;
          const achievement = budgetAmt > 0 ? Math.round((actual / budgetAmt) * 100) : null;

          return { ...budget, actual, variance, achievement };
        })
      );

      return res.json({ success: true, data: budgetsWithActuals });
    } catch (error) {
      handleError(error, res, 'Get budgets');
    }
  }

  async getBudgetById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) return handleValidationError(res, 'Budget ID is required', 'id', 'Get budget');

      const budget = await prisma.financeBudget.findUnique({
        where: { id },
        include: {
          partner: { select: { id: true, name: true, code: true } },
          productCategory: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          updatedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!budget) return handleNotFoundError(res, 'Budget', 'Get budget');
      return res.json({ success: true, data: budget });
    } catch (error) {
      handleError(error, res, 'Get budget by ID');
    }
  }

  async createBudget(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { year, month, budgetType, dimensionType, dimensionValue, partnerId,
              productCategoryId, budgetAmount, notes } = req.body;

      if (!year || !budgetType || !budgetAmount) {
        return handleValidationError(res, 'year, budgetType and budgetAmount are required', 'body', 'Create budget');
      }

      const budget = await prisma.financeBudget.create({
        data: {
          year: parseInt(year),
          month: month ? parseInt(month) : null,
          budgetType: budgetType as FinanceBudgetType,
          dimensionType: (dimensionType as FinanceBudgetDimension) || FinanceBudgetDimension.TOTAL,
          dimensionValue: dimensionValue || null,
          partnerId: partnerId ? parseInt(partnerId) : null,
          productCategoryId: productCategoryId ? parseInt(productCategoryId) : null,
          budgetAmount,
          notes: notes || null,
          createdBy: user.id,
        },
      });

      await recordAuditLog({
        action: 'BUDGET_CREATED',
        changedBy: user.id,
        entityType: 'FinanceBudget',
        entityId: budget.id,
        newValues: { year, month, budgetType, budgetAmount },
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: budget });
    } catch (error) {
      handleError(error, res, 'Create budget');
    }
  }

  async updateBudget(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) return handleValidationError(res, 'Budget ID is required', 'id', 'Update budget');

      const existing = await prisma.financeBudget.findUnique({ where: { id } });
      if (!existing) return handleNotFoundError(res, 'Budget', 'Update budget');

      const { budgetAmount, notes, dimensionValue } = req.body;

      const updated = await prisma.financeBudget.update({
        where: { id },
        data: {
          ...(budgetAmount !== undefined && { budgetAmount }),
          ...(notes !== undefined && { notes }),
          ...(dimensionValue !== undefined && { dimensionValue }),
          updatedBy: user.id,
        },
      });

      await recordAuditLog({
        action: 'BUDGET_UPDATED',
        changedBy: user.id,
        entityType: 'FinanceBudget',
        entityId: id,
        oldValues: { budgetAmount: existing.budgetAmount },
        newValues: { budgetAmount: updated.budgetAmount },
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update budget');
    }
  }

  async deleteBudget(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) return handleValidationError(res, 'Budget ID is required', 'id', 'Delete budget');

      const existing = await prisma.financeBudget.findUnique({ where: { id } });
      if (!existing) return handleNotFoundError(res, 'Budget', 'Delete budget');

      await prisma.financeBudget.delete({ where: { id } });

      await recordAuditLog({
        action: 'BUDGET_DELETED',
        changedBy: user.id,
        entityType: 'FinanceBudget',
        entityId: id,
        oldValues: { year: existing.year, month: existing.month, budgetType: existing.budgetType, budgetAmount: existing.budgetAmount },
        newValues: null,
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.json({ success: true, message: 'Budget deleted' });
    } catch (error) {
      handleError(error, res, 'Delete budget');
    }
  }

  // ─── INTEGRATION (STUB) ───────────────────────────────────────────────────────

  async getIntegrationStatus(_req: Request, res: Response) {
    return res.json({
      success: true,
      data: { provider: 'MANUAL', connected: false, lastSync: null, message: 'ERP integration not configured' },
    });
  }

  async syncIntegration(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const log = await prisma.financeIntegrationLog.create({
        data: {
          provider: 'MANUAL',
          action: 'SYNC_STARTED',
          status: 'PARTIAL',
          errorMessage: 'No ERP provider configured. This is a stub endpoint for future integration.',
          initiatedBy: user.id,
        },
      });

      await recordAuditLog({
        action: 'FINANCE_SYNC_INITIATED',
        changedBy: user.id,
        entityType: 'FinanceIntegrationLog',
        entityId: log.id,
        newValues: { provider: 'MANUAL' },
        category: AuditCategory.FINANCE_MANAGEMENT,
      });

      return res.json({ success: true, data: log });
    } catch (error) {
      handleError(error, res, 'Sync integration');
    }
  }

  async getIntegrationLogs(_req: Request, res: Response) {
    try {
      const logs = await prisma.financeIntegrationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.json({ success: true, data: logs });
    } catch (error) {
      handleError(error, res, 'Get integration logs');
    }
  }
}
