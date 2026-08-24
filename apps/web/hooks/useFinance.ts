"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kptFinanceService } from '../lib/api/services';

// ─── Query keys ──────────────────────────────────────────────────────────────
export const financeKeys = {
  overview: () => ['finance', 'overview'] as const,
  invoices: (params?: Record<string, any>) => ['finance', 'invoices', params] as const,
  invoice: (id: number) => ['finance', 'invoice', id] as const,
  skuAnalysis: (params?: Record<string, any>) => ['finance', 'sku-analysis', params] as const,
  skuDetail: (sku: string) => ['finance', 'sku-detail', sku] as const,
  budgets: (params?: Record<string, any>) => ['finance', 'budgets', params] as const,
  budget: (id: number) => ['finance', 'budget', id] as const,
  incentives: (params?: Record<string, any>) => ['finance', 'incentives', params] as const,
  integrationStatus: () => ['finance', 'integration', 'status'] as const,
  integrationLogs: () => ['finance', 'integration', 'logs'] as const,
};

// ─── Overview ────────────────────────────────────────────────────────────────
export function useFinanceOverview() {
  return useQuery({
    queryKey: financeKeys.overview(),
    queryFn: () => kptFinanceService.getOverview(),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────
export function useInvoices(params?: {
  page?: number; limit?: number; search?: string; status?: string;
  partnerId?: number; region?: string; dateFrom?: string; dateTo?: string;
  sortBy?: string; sortOrder?: string;
}) {
  return useQuery({
    queryKey: financeKeys.invoices(params),
    queryFn: () => kptFinanceService.getInvoices(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: financeKeys.invoice(id),
    queryFn: () => kptFinanceService.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => kptFinanceService.createInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      qc.invalidateQueries({ queryKey: financeKeys.overview() });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      kptFinanceService.updateInvoice(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      qc.invalidateQueries({ queryKey: financeKeys.invoice(id) });
      qc.invalidateQueries({ queryKey: financeKeys.overview() });
    },
  });
}

// ─── SKU Analysis ────────────────────────────────────────────────────────────
export function useSkuAnalysis(params?: {
  period?: string; category?: string; sku?: string; partnerId?: number; region?: string;
}) {
  return useQuery({
    queryKey: financeKeys.skuAnalysis(params),
    queryFn: () => kptFinanceService.getSkuAnalysis(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSkuDetail(sku: string) {
  return useQuery({
    queryKey: financeKeys.skuDetail(sku),
    queryFn: () => kptFinanceService.getSkuDetail(sku),
    enabled: !!sku,
  });
}

// ─── Budgets ────────────────────────────────────────────────────────────────
export function useBudgets(params?: {
  year?: number; month?: number; budgetType?: string; dimensionType?: string; partnerId?: number;
}) {
  return useQuery({
    queryKey: financeKeys.budgets(params),
    queryFn: () => kptFinanceService.getBudgets(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudget(id: number) {
  return useQuery({
    queryKey: financeKeys.budget(id),
    queryFn: () => kptFinanceService.getBudget(id),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof kptFinanceService.createBudget>[0]) =>
      kptFinanceService.createBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'budgets'] });
      qc.invalidateQueries({ queryKey: financeKeys.overview() });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { budgetAmount?: number; notes?: string; dimensionValue?: string } }) =>
      kptFinanceService.updateBudget(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['finance', 'budgets'] });
      qc.invalidateQueries({ queryKey: financeKeys.budget(id) });
      qc.invalidateQueries({ queryKey: financeKeys.overview() });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => kptFinanceService.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'budgets'] });
      qc.invalidateQueries({ queryKey: financeKeys.overview() });
    },
  });
}

// ─── Incentives ──────────────────────────────────────────────────────────────
export function useFinanceIncentives(params?: { period?: string; status?: string }) {
  return useQuery({
    queryKey: financeKeys.incentives(params),
    queryFn: () => kptFinanceService.getIncentives(params),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Integration ─────────────────────────────────────────────────────────────
export function useIntegrationStatus() {
  return useQuery({
    queryKey: financeKeys.integrationStatus(),
    queryFn: () => kptFinanceService.getIntegrationStatus(),
    staleTime: 60 * 1000,
  });
}

export function useIntegrationLogs() {
  return useQuery({
    queryKey: financeKeys.integrationLogs(),
    queryFn: () => kptFinanceService.getIntegrationLogs(),
    staleTime: 30 * 1000,
  });
}

export function useSyncIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => kptFinanceService.syncIntegration(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.integrationLogs() });
      qc.invalidateQueries({ queryKey: financeKeys.integrationStatus() });
    },
  });
}
