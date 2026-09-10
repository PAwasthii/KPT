import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kptOrderService } from '../lib/api/services'

export const kptOrderKeys = {
  all: ['kpt-orders'] as const,
  lists: () => [...kptOrderKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...kptOrderKeys.lists(), filters] as const,
  details: () => [...kptOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...kptOrderKeys.details(), id] as const,
  stockCheck: (id: number) => [...kptOrderKeys.all, 'stock-check', id] as const,
}

export function useKptOrders(filters?: {
  page?: number
  limit?: number
  status?: string
  channelPartnerId?: number
  dateFrom?: string
  dateTo?: string
  region?: string
  search?: string
}) {
  const query = useQuery({
    queryKey: kptOrderKeys.list(filters || {}),
    queryFn: () => kptOrderService.listOrders(filters),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
  return {
    ...query,
    data: query.data?.data || [],
    pagination: query.data?.pagination,
  }
}

export function useKptOrderDetail(id: number) {
  return useQuery({
    queryKey: kptOrderKeys.detail(id),
    queryFn: () => kptOrderService.getOrderById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useKptStockCheck(id: number, enabled = false) {
  return useQuery({
    queryKey: kptOrderKeys.stockCheck(id),
    queryFn: () => kptOrderService.checkStock(id),
    enabled: !!id && enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, cancellationReason }: { id: number; status: string; cancellationReason?: string }) =>
      kptOrderService.updateStatus(id, { status, cancellationReason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.lists() })
    },
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: number; paymentStatus: string }) =>
      kptOrderService.updatePaymentStatus(id, paymentStatus),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.lists() })
    },
  })
}

export function useAllocateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => kptOrderService.allocateStock(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.stockCheck(id) })
    },
  })
}

export function useDispatchOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dispatchReference }: { id: number; dispatchReference?: string }) =>
      kptOrderService.dispatchOrder(id, dispatchReference),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.lists() })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.stockCheck(id) })
    },
  })
}

export function useDeliverOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => kptOrderService.deliverOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.lists() })
    },
  })
}

export function useAssignPartner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, channelPartnerId }: { id: number; channelPartnerId: number }) =>
      kptOrderService.assignPartner(id, channelPartnerId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: kptOrderKeys.lists() })
    },
  })
}
