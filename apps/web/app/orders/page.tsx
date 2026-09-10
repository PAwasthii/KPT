"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, X, Eye } from "lucide-react"
import { Badge, Button } from "@repo/ui"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DataTable, type TableColumn } from "@/components/data-table"
import { useKptOrders } from "@/hooks/useKptOrders"
import { usePartners } from "@/hooks/useKpt"
import type { KptOrderListItem, OrderPaymentStatus } from "@/lib/api/types"

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_FULFILLMENT: "bg-orange-100 text-orange-800 border-orange-200",
  SHIPPED: "bg-sky-100 text-sky-800 border-sky-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  ON_HOLD: "bg-gray-100 text-gray-700 border-gray-200",
}

const PAYMENT_BADGE: Record<OrderPaymentStatus, string> = {
  UNPAID: "bg-red-50 text-red-700 border-red-200",
  PARTIALLY_PAID: "bg-orange-50 text-orange-700 border-orange-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-100 text-red-900 border-red-300",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Confirmed",
  IN_FULFILLMENT: "In Fulfillment",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
}

// Derive a fulfillment-oriented label from order status
const FULFILLMENT_LABEL: Record<string, string> = {
  DRAFT: "Pending",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Pending",
  IN_FULFILLMENT: "In Progress",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
}

const FULFILLMENT_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  PENDING_APPROVAL: "bg-gray-100 text-gray-600 border-gray-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_FULFILLMENT: "bg-orange-100 text-orange-800 border-orange-200",
  SHIPPED: "bg-sky-100 text-sky-800 border-sky-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  ON_HOLD: "bg-gray-200 text-gray-700 border-gray-300",
}

const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
}

const REGIONS = ["SOUTH", "NORTH", "EAST", "WEST_1", "WEST_2", "APTOC"]
const ORDER_STATUSES = Object.keys(STATUS_LABELS)

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(val: number | string | null | undefined) {
  if (val == null) return "—"
  const n = Number(val)
  if (isNaN(n)) return String(val)
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface Filters {
  status: string
  region: string
  dateFrom: string
  dateTo: string
  search: string
  channelPartnerId: string
}

function OrdersPageContent() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: "",
    region: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    channelPartnerId: "",
  })
  const [applied, setApplied] = useState<Filters>({ ...filters })

  const { data: partnerRes } = usePartners({ limit: 300, status: "ACTIVE" })
  const partners: any[] = (partnerRes as any)?.data ?? []

  const { data: orders, pagination, isLoading } = useKptOrders({
    page,
    limit,
    status: applied.status || undefined,
    region: applied.region || undefined,
    dateFrom: applied.dateFrom || undefined,
    dateTo: applied.dateTo || undefined,
    search: applied.search || undefined,
    channelPartnerId: applied.channelPartnerId ? parseInt(applied.channelPartnerId, 10) : undefined,
  })

  const applyFilters = useCallback(() => {
    setApplied({ ...filters })
    setPage(1)
  }, [filters])

  const clearFilters = useCallback(() => {
    const empty: Filters = { status: "", region: "", dateFrom: "", dateTo: "", search: "", channelPartnerId: "" }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
  }, [])

  const hasActiveFilters = Object.values(applied).some(Boolean)

  const columns: TableColumn<KptOrderListItem>[] = [
    {
      key: "orderNumber",
      label: "Order No.",
      render: (val, item) => (
        <button
          onClick={() => router.push(`/orders/${item.id}`)}
          className="font-mono text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium"
        >
          {val as string}
        </button>
      ),
    },
    {
      key: "orderDate",
      label: "Order Date",
      render: (val) => (
        <span className="text-sm text-gray-700">{formatDate(val as string)}</span>
      ),
    },
    {
      key: "channelPartner",
      label: "Partner",
      render: (_, item) =>
        item.channelPartner ? (
          <div>
            <p className="text-sm font-medium text-gray-800">{item.channelPartner.name}</p>
            <p className="text-xs text-gray-500">{item.channelPartner.type}{item.channelPartner.region ? ` · ${item.channelPartner.region}` : ""}</p>
          </div>
        ) : (
          <span className="text-gray-400 text-sm italic">Unassigned</span>
        ),
    },
    {
      key: "quote",
      label: "Source Quote",
      render: (_, item) =>
        item.quote ? (
          <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
            {item.quote.quoteNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: "_count",
      label: "Items / Qty",
      render: (_, item) => (
        <span className="text-sm text-gray-600">{item._count.lineItems} SKU{item._count.lineItems !== 1 ? "s" : ""}</span>
      ),
    },
    {
      key: "grandTotal",
      label: "Total Amount",
      render: (val) => (
        <span className="text-sm font-semibold text-gray-800">{formatCurrency(val)}</span>
      ),
    },
    {
      key: "status",
      label: "Order Status",
      render: (val) => {
        const s = val as string
        return (
          <Badge className={`text-xs font-medium border ${STATUS_BADGE[s] ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_LABELS[s] ?? s}
          </Badge>
        )
      },
    },
    {
      key: "status",
      label: "Fulfillment",
      render: (val) => {
        const s = val as string
        return (
          <Badge className={`text-xs font-medium border ${FULFILLMENT_BADGE[s] ?? "bg-gray-100 text-gray-700"}`}>
            {FULFILLMENT_LABEL[s] ?? s}
          </Badge>
        )
      },
    },
    {
      key: "expectedDeliveryDate",
      label: "Expected Delivery",
      render: (val) => (
        <span className="text-sm text-gray-600">{formatDate(val as string)}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/orders/${item.id}`)}
          className="text-xs h-7 px-2"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination?.totalItems ?? orders.length} order{(pagination?.totalItems ?? orders.length) !== 1 ? "s" : ""}
              {hasActiveFilters && " · filtered"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((f) => !f)}
            className={showFilters ? "border-orange-400 text-orange-600" : ""}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or partner name…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Order Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* Partner */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Partner</label>
              <select
                value={filters.channelPartnerId}
                onChange={(e) => setFilters((f) => ({ ...f, channelPartnerId: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="">All partners</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Region</label>
              <select
                value={filters.region}
                onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="">All regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
              Reset
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable<KptOrderListItem>
        data={orders}
        columns={columns}
        title="Orders"
        count={pagination?.totalItems ?? orders.length}
        currentPage={page}
        totalPages={pagination?.totalPages ?? 1}
        itemsPerPage={limit}
        onPageChange={setPage}
        columnPreferenceKey="kpt-order-list"
      />
    </div>
  )
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageContent />
    </ProtectedRoute>
  )
}
