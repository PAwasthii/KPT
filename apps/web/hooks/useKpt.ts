import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kptPartnerService, kptStockService, kptIncentiveSlabService, kptPerformanceService } from '../lib/api/services';

// ============================================
// Static fallback data (shown when API is offline)
// ============================================
const STATIC_PARTNERS = {
  data: [
    { id: 1, code: 'DIST-MH-001', name: 'Shree Ganesh Industrial Tools', type: 'DISTRIBUTOR', tier: 'GOLD', status: 'ACTIVE', contactName: 'Suresh Patil', contactPhone: '9823456789', contactEmail: 'suresh@sgtools.in', city: 'Pune', state: 'Maharashtra', region: 'West', currentMonthSales: 356250, ytdSales: 2850000, targetAmount: 3600000, creditLimit: 1000000, outstandingPayment: 145000 },
    { id: 2, code: 'DIST-MH-002', name: 'Mahalaxmi Hardware & Tools', type: 'DISTRIBUTOR', tier: 'SILVER', status: 'ACTIVE', contactName: 'Ramesh Desai', contactPhone: '9812345678', contactEmail: 'ramesh@mahalaxmi.com', city: 'Kolhapur', state: 'Maharashtra', region: 'West', currentMonthSales: 206250, ytdSales: 1650000, targetAmount: 2400000, creditLimit: 1000000, outstandingPayment: 89000 },
    { id: 3, code: 'DIST-KA-001', name: 'Kaveri Tools & Equipment', type: 'DISTRIBUTOR', tier: 'GOLD', status: 'ACTIVE', contactName: 'Kiran Hegde', contactPhone: '9876543210', contactEmail: 'kiran@kaveritools.in', city: 'Belgaum', state: 'Karnataka', region: 'South', currentMonthSales: 275000, ytdSales: 2200000, targetAmount: 2800000, creditLimit: 1000000, outstandingPayment: 112000 },
    { id: 4, code: 'DLRA-MH-001', name: 'Aarav Engineering Supplies', type: 'DEALER', tier: 'SILVER', status: 'ACTIVE', contactName: 'Anil Jadhav', contactPhone: '9765432109', contactEmail: null, city: 'Satara', state: 'Maharashtra', region: 'West', currentMonthSales: 115000, ytdSales: 920000, targetAmount: 1200000, creditLimit: 300000, outstandingPayment: 45000 },
    { id: 5, code: 'DLRA-MH-002', name: 'Vishwakarma Power Tools', type: 'DEALER', tier: 'BRONZE', status: 'ACTIVE', contactName: 'Vijay Shinde', contactPhone: '9654321098', contactEmail: null, city: 'Sangli', state: 'Maharashtra', region: 'West', currentMonthSales: 47500, ytdSales: 380000, targetAmount: 600000, creditLimit: 300000, outstandingPayment: 22000 },
    { id: 6, code: 'DLRA-MH-003', name: 'Om Sai Hardware Store', type: 'DEALER', tier: 'BRONZE', status: 'ACTIVE', contactName: 'Santosh More', contactPhone: '9543210987', contactEmail: null, city: 'Solapur', state: 'Maharashtra', region: 'West', currentMonthSales: 51250, ytdSales: 410000, targetAmount: 600000, creditLimit: 300000, outstandingPayment: 18000 },
    { id: 7, code: 'DLRA-KA-001', name: 'Siddharth Industrial Corp', type: 'DEALER', tier: 'SILVER', status: 'ACTIVE', contactName: 'Ravi Kumar', contactPhone: '9432109876', contactEmail: 'ravi@sidindustrials.in', city: 'Hubli', state: 'Karnataka', region: 'South', currentMonthSales: 97500, ytdSales: 780000, targetAmount: 1000000, creditLimit: 300000, outstandingPayment: 38000 },
    { id: 8, code: 'DLRA-GOA-001', name: 'Konkan Power Equipment', type: 'DEALER', tier: 'BRONZE', status: 'ACTIVE', contactName: 'Deepak Naik', contactPhone: '9321098765', contactEmail: null, city: 'Panaji', state: 'Goa', region: 'West', currentMonthSales: 36250, ytdSales: 290000, targetAmount: 500000, creditLimit: 300000, outstandingPayment: 12000 },
  ],
  pagination: { page: 1, limit: 100, total: 8, totalPages: 1 },
};

const STATIC_INCENTIVE_SLABS = {
  data: [
    { id: 1, tier: 'BRONZE', minSaleAmount: 0, maxSaleAmount: 500000, incentivePercent: 2.0, description: 'Bronze tier — up to ₹5L monthly sales', isActive: true },
    { id: 2, tier: 'SILVER', minSaleAmount: 500001, maxSaleAmount: 1500000, incentivePercent: 3.5, description: 'Silver tier — ₹5L–₹15L monthly sales', isActive: true },
    { id: 3, tier: 'GOLD', minSaleAmount: 1500001, maxSaleAmount: 3000000, incentivePercent: 5.0, description: 'Gold tier — ₹15L–₹30L monthly sales', isActive: true },
    { id: 4, tier: 'PLATINUM', minSaleAmount: 3000001, maxSaleAmount: null, incentivePercent: 7.0, description: 'Platinum tier — above ₹30L monthly sales', isActive: true },
  ],
};

const STATIC_PARTNER_INCENTIVES = [
  { id: 1, partnerId: 1, period: '2026-07', salesAmount: 356250, incentivePercent: 5.0, incentiveAmount: 17813, status: 'UNDER_REVIEW', remarks: null },
  { id: 2, partnerId: 1, period: '2026-06', salesAmount: 342000, incentivePercent: 5.0, incentiveAmount: 17100, status: 'APPROVED', remarks: null },
  { id: 3, partnerId: 1, period: '2026-05', salesAmount: 318000, incentivePercent: 5.0, incentiveAmount: 15900, status: 'PAID', remarks: 'Payment processed via NEFT' },
  { id: 4, partnerId: 2, period: '2026-07', salesAmount: 206250, incentivePercent: 3.5, incentiveAmount: 7219, status: 'PENDING', remarks: null },
  { id: 5, partnerId: 2, period: '2026-06', salesAmount: 198000, incentivePercent: 3.5, incentiveAmount: 6930, status: 'APPROVED', remarks: null },
  { id: 6, partnerId: 3, period: '2026-07', salesAmount: 275000, incentivePercent: 5.0, incentiveAmount: 13750, status: 'UNDER_REVIEW', remarks: null },
  { id: 7, partnerId: 4, period: '2026-07', salesAmount: 115000, incentivePercent: 3.5, incentiveAmount: 4025, status: 'PENDING', remarks: null },
  { id: 8, partnerId: 5, period: '2026-07', salesAmount: 47500, incentivePercent: 2.0, incentiveAmount: 950, status: 'PENDING', remarks: null },
];

const STATIC_STOCK_ALERTS = {
  data: [
    { id: 1, partnerId: 2, productName: 'KPT 100mm Angle Grinder KPT-AG4', sku: 'KPT-AG4-001', category: 'Grinders', stockQty: 0, minStockQty: 20, unitPrice: 2850, stockStatus: 'OUT_OF_STOCK' },
    { id: 2, partnerId: 5, productName: 'KPT SDS Plus Rotary Hammer KPT-SDS', sku: 'KPT-SDS-001', category: 'Drills', stockQty: 3, minStockQty: 10, unitPrice: 8500, stockStatus: 'CRITICAL' },
    { id: 3, partnerId: 8, productName: 'KPT Demolition Hammer KPT-DH', sku: 'KPT-DH-001', category: 'Hammers', stockQty: 2, minStockQty: 10, unitPrice: 12500, stockStatus: 'CRITICAL' },
    { id: 4, partnerId: 4, productName: 'KPT 180mm Angle Grinder KPT-AG7', sku: 'KPT-AG7-001', category: 'Grinders', stockQty: 7, minStockQty: 10, unitPrice: 5400, stockStatus: 'LOW' },
    { id: 5, partnerId: 6, productName: 'KPT Cordless Drill 18V KPT-CD18', sku: 'KPT-CD18-001', category: 'Drills', stockQty: 6, minStockQty: 10, unitPrice: 6200, stockStatus: 'LOW' },
    { id: 6, partnerId: 7, productName: 'KPT Impact Wrench KPT-IW', sku: 'KPT-IW-001', category: 'Others', stockQty: 4, minStockQty: 10, unitPrice: 7200, stockStatus: 'CRITICAL' },
  ],
};

const STATIC_STOCK = {
  data: [
    { id: 1, partnerId: 1, productName: 'KPT 100mm Angle Grinder KPT-AG4', sku: 'KPT-AG4-001', category: 'Grinders', stockQty: 28, minStockQty: 20, unitPrice: 2850, stockStatus: 'HEALTHY' },
    { id: 2, partnerId: 1, productName: 'KPT 115mm Angle Grinder KPT-AG5', sku: 'KPT-AG5-001', category: 'Grinders', stockQty: 22, minStockQty: 20, unitPrice: 3200, stockStatus: 'HEALTHY' },
    { id: 3, partnerId: 1, productName: 'KPT 13mm Impact Drill KPT-ID13', sku: 'KPT-ID13-001', category: 'Drills', stockQty: 35, minStockQty: 20, unitPrice: 3600, stockStatus: 'HEALTHY' },
    { id: 4, partnerId: 2, productName: 'KPT 100mm Angle Grinder KPT-AG4', sku: 'KPT-AG4-001', category: 'Grinders', stockQty: 0, minStockQty: 20, unitPrice: 2850, stockStatus: 'OUT_OF_STOCK' },
    { id: 5, partnerId: 2, productName: 'KPT SDS Plus Rotary Hammer KPT-SDS', sku: 'KPT-SDS-001', category: 'Drills', stockQty: 14, minStockQty: 20, unitPrice: 8500, stockStatus: 'LOW' },
    { id: 6, partnerId: 3, productName: 'KPT 180mm Angle Grinder KPT-AG7', sku: 'KPT-AG7-001', category: 'Grinders', stockQty: 18, minStockQty: 20, unitPrice: 5400, stockStatus: 'LOW' },
    { id: 7, partnerId: 3, productName: 'KPT Demolition Hammer KPT-DH', sku: 'KPT-DH-001', category: 'Hammers', stockQty: 25, minStockQty: 20, unitPrice: 12500, stockStatus: 'HEALTHY' },
    { id: 8, partnerId: 4, productName: 'KPT 13mm Impact Drill KPT-ID13', sku: 'KPT-ID13-001', category: 'Drills', stockQty: 8, minStockQty: 10, unitPrice: 3600, stockStatus: 'LOW' },
    { id: 9, partnerId: 5, productName: 'KPT SDS Plus Rotary Hammer KPT-SDS', sku: 'KPT-SDS-001', category: 'Drills', stockQty: 3, minStockQty: 10, unitPrice: 8500, stockStatus: 'CRITICAL' },
    { id: 10, partnerId: 6, productName: 'KPT Cordless Drill 18V KPT-CD18', sku: 'KPT-CD18-001', category: 'Drills', stockQty: 6, minStockQty: 10, unitPrice: 6200, stockStatus: 'LOW' },
  ],
  pagination: { page: 1, limit: 100, total: 10, totalPages: 1 },
};

const STATIC_RANKINGS = {
  data: [
    { rank: 1, name: 'Shree Ganesh Industrial Tools', tier: 'GOLD', type: 'DISTRIBUTOR', ytdSales: 2850000, targetAmount: 3600000, achievementPct: 79.17 },
    { rank: 2, name: 'Kaveri Tools & Equipment', tier: 'GOLD', type: 'DISTRIBUTOR', ytdSales: 2200000, targetAmount: 2800000, achievementPct: 78.57 },
    { rank: 3, name: 'Mahalaxmi Hardware & Tools', tier: 'SILVER', type: 'DISTRIBUTOR', ytdSales: 1650000, targetAmount: 2400000, achievementPct: 68.75 },
    { rank: 4, name: 'Aarav Engineering Supplies', tier: 'SILVER', type: 'DEALER', ytdSales: 920000, targetAmount: 1200000, achievementPct: 76.67 },
    { rank: 5, name: 'Siddharth Industrial Corp', tier: 'SILVER', type: 'DEALER', ytdSales: 780000, targetAmount: 1000000, achievementPct: 78.00 },
    { rank: 6, name: 'Om Sai Hardware Store', tier: 'BRONZE', type: 'DEALER', ytdSales: 410000, targetAmount: 600000, achievementPct: 68.33 },
    { rank: 7, name: 'Vishwakarma Power Tools', tier: 'BRONZE', type: 'DEALER', ytdSales: 380000, targetAmount: 600000, achievementPct: 63.33 },
    { rank: 8, name: 'Konkan Power Equipment', tier: 'BRONZE', type: 'DEALER', ytdSales: 290000, targetAmount: 500000, achievementPct: 58.00 },
  ],
};

const STATIC_TRENDS = {
  data: [
    { period: '2026-01', salesAmount: 820000, incentiveAmount: 28700 },
    { period: '2026-02', salesAmount: 915000, incentiveAmount: 32025 },
    { period: '2026-03', salesAmount: 1050000, incentiveAmount: 36750 },
    { period: '2026-04', salesAmount: 980000, incentiveAmount: 34300 },
    { period: '2026-05', salesAmount: 1140000, incentiveAmount: 39900 },
    { period: '2026-06', salesAmount: 1285000, incentiveAmount: 44975 },
    { period: '2026-07', salesAmount: 1380000, incentiveAmount: 48300 },
    { period: '2026-08', salesAmount: 520000, incentiveAmount: 18200 },
  ],
};

const STATIC_KPIS = {
  data: {
    activePartners: 8,
    totalRevenueYTD: 9480000,
    totalPendingIncentives: 4380750,
    lowStockAlerts: 6,
    newDealersThisMonth: 2,
  },
};

// ============================================
// Helper: wrap query to fall back to static data on failure
// ============================================
async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ============================================
// Query keys
// ============================================
export const kptKeys = {
  partners: {
    all: ['kpt-partners'] as const,
    list: (params?: any) => [...kptKeys.partners.all, 'list', params || {}] as const,
    detail: (id: number) => [...kptKeys.partners.all, 'detail', id] as const,
    incentives: (id: number) => [...kptKeys.partners.all, 'incentives', id] as const,
  },
  stock: {
    all: ['kpt-stock'] as const,
    list: (params?: any) => [...kptKeys.stock.all, 'list', params || {}] as const,
    alerts: () => [...kptKeys.stock.all, 'alerts'] as const,
    byPartner: (partnerId: number) => [...kptKeys.stock.all, 'partner', partnerId] as const,
  },
  incentiveSlabs: {
    all: ['kpt-incentive-slabs'] as const,
    list: (params?: any) => [...kptKeys.incentiveSlabs.all, 'list', params || {}] as const,
  },
  performance: {
    all: ['kpt-performance'] as const,
    revenue: () => [...kptKeys.performance.all, 'revenue'] as const,
    rankings: () => [...kptKeys.performance.all, 'rankings'] as const,
    trends: () => [...kptKeys.performance.all, 'trends'] as const,
    kpis: () => [...kptKeys.performance.all, 'kpis'] as const,
  },
};

// ============================================
// Channel Partner hooks
// ============================================
export function usePartners(params?: { page?: number; limit?: number; type?: string; tier?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: kptKeys.partners.list(params),
    queryFn: () => withFallback(() => kptPartnerService.getAll(params), STATIC_PARTNERS),
  });
}

export function usePartnerById(id: number) {
  return useQuery({
    queryKey: kptKeys.partners.detail(id),
    queryFn: () => kptPartnerService.getById(id),
    enabled: !!id,
  });
}

export function usePartnerIncentives(partnerId: number) {
  return useQuery({
    queryKey: kptKeys.partners.incentives(partnerId),
    queryFn: () => withFallback(
      () => kptPartnerService.getIncentives(partnerId),
      { data: STATIC_PARTNER_INCENTIVES.filter(i => i.partnerId === partnerId) }
    ),
    enabled: !!partnerId,
  });
}

// Helper: attempt API call, fall back to returning the provided mock result
async function tryApi<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kptPartnerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kptKeys.partners.all });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => kptPartnerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kptKeys.partners.all });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => kptPartnerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kptKeys.partners.all });
    },
  });
}

export function useCreateIncentive(partnerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) =>
      tryApi(() => kptPartnerService.createIncentive(partnerId, data), {
        ...data,
        id: Date.now(),
        partnerId,
        incentiveAmount: data.salesAmount * (data.incentivePercent / 100),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      }),
    onSuccess: (newInc: any) => {
      queryClient.setQueriesData({ queryKey: kptKeys.partners.incentives(partnerId) }, (old: any) => {
        const arr = old?.data ?? old ?? [];
        return { data: [newInc, ...arr] };
      });
    },
  });
}

export function useUpdateIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      tryApi(() => kptPartnerService.updateIncentive(id, data), { id, ...data }),
    onSuccess: (updated: any) => {
      // Invalidate all incentive queries so the status refresh appears
      queryClient.invalidateQueries({ queryKey: kptKeys.partners.all });
    },
  });
}

// ============================================
// Stock hooks
// ============================================
export function useStockEntries(params?: { page?: number; limit?: number; partnerId?: number; stockStatus?: string; category?: string; search?: string }) {
  return useQuery({
    queryKey: kptKeys.stock.list(params),
    queryFn: () => withFallback(() => kptStockService.getAll(params), STATIC_STOCK),
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: kptKeys.stock.alerts(),
    queryFn: () => withFallback(kptStockService.getAlerts, STATIC_STOCK_ALERTS),
  });
}

export function useStockByPartner(partnerId: number) {
  return useQuery({
    queryKey: kptKeys.stock.byPartner(partnerId),
    queryFn: () => withFallback(
      () => kptStockService.getByPartner(partnerId),
      { data: STATIC_STOCK.data.filter(s => s.partnerId === partnerId) }
    ),
    enabled: !!partnerId,
  });
}

function computeStockStatus(qty: number, minQty: number) {
  if (qty === 0) return 'OUT_OF_STOCK';
  if (qty <= 5) return 'CRITICAL';
  if (qty < minQty) return 'LOW';
  return 'HEALTHY';
}

export function useCreateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) =>
      tryApi(() => kptStockService.create(data), {
        ...data,
        id: Date.now(),
        minStockQty: data.minStockQty ?? 10,
        reorderQty: data.reorderQty ?? 20,
        stockStatus: computeStockStatus(data.stockQty, data.minStockQty ?? 10),
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: (newEntry: any) => {
      queryClient.setQueriesData({ queryKey: kptKeys.stock.all }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: [newEntry, ...old.data] };
      });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      tryApi(() => kptStockService.update(id, data), {
        id,
        ...data,
        stockStatus: data.stockQty !== undefined
          ? computeStockStatus(data.stockQty, data.minStockQty ?? 10)
          : undefined,
        lastUpdated: new Date().toISOString(),
      }),
    onSuccess: (updated: any) => {
      queryClient.setQueriesData({ queryKey: kptKeys.stock.all }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((s: any) => s.id === updated.id ? { ...s, ...updated } : s) };
      });
    },
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      tryApi(() => kptStockService.delete(id), { id }),
    onSuccess: (_: any, id: number) => {
      queryClient.setQueriesData({ queryKey: kptKeys.stock.all }, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((s: any) => s.id !== id) };
      });
    },
  });
}

// ============================================
// Incentive Slab hooks
// ============================================
export function useIncentiveSlabs(params?: { tier?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: kptKeys.incentiveSlabs.list(params),
    queryFn: () => withFallback(() => kptIncentiveSlabService.getAll(params), STATIC_INCENTIVE_SLABS),
  });
}

export function useCreateIncentiveSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) =>
      tryApi(() => kptIncentiveSlabService.create(data), {
        ...data, id: Date.now(), isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }),
    onSuccess: (newSlab: any) => {
      queryClient.setQueriesData({ queryKey: kptKeys.incentiveSlabs.all }, (old: any) => {
        const arr = old?.data ?? old ?? [];
        return { data: [...arr, newSlab] };
      });
    },
  });
}

export function useUpdateIncentiveSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      tryApi(() => kptIncentiveSlabService.update(id, data), { id, ...data }),
    onSuccess: (updated: any) => {
      queryClient.setQueriesData({ queryKey: kptKeys.incentiveSlabs.all }, (old: any) => {
        const arr = old?.data ?? old ?? [];
        return { data: arr.map((s: any) => s.id === updated.id ? { ...s, ...updated } : s) };
      });
    },
  });
}

export function useDeleteIncentiveSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      tryApi(() => kptIncentiveSlabService.delete(id), { id }),
    onSuccess: (_: any, id: number) => {
      queryClient.setQueriesData({ queryKey: kptKeys.incentiveSlabs.all }, (old: any) => {
        const arr = old?.data ?? old ?? [];
        return { data: arr.filter((s: any) => s.id !== id) };
      });
    },
  });
}

// ============================================
// Performance hooks
// ============================================
export function useRevenueSummary() {
  return useQuery({
    queryKey: kptKeys.performance.revenue(),
    queryFn: () => withFallback(kptPerformanceService.getRevenueSummary, STATIC_RANKINGS),
  });
}

export function usePartnerRankings() {
  return useQuery({
    queryKey: kptKeys.performance.rankings(),
    queryFn: () => withFallback(kptPerformanceService.getPartnerRankings, STATIC_RANKINGS),
  });
}

export function useMonthlyTrends() {
  return useQuery({
    queryKey: kptKeys.performance.trends(),
    queryFn: () => withFallback(kptPerformanceService.getMonthlyTrends, STATIC_TRENDS),
  });
}

export function useKptKPIs() {
  return useQuery({
    queryKey: kptKeys.performance.kpis(),
    queryFn: () => withFallback(kptPerformanceService.getDashboardKPIs, STATIC_KPIS),
  });
}
