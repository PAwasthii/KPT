"use client"
export const runtime = "edge"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { useQueryState, parseAsString } from "nuqs"
import {
  Hash, Calendar, FileText, Package, Building2, User, Mail, Phone,
  Clock, CheckCircle2, MapPin, Truck, CreditCard, StickyNote,
  AlertTriangle, CheckSquare, Loader2, ChevronRight, BarChart3,
  XCircle, PauseCircle, PlayCircle, Send, ArrowRight, Circle,
  Clipboard, GitBranch,
} from "lucide-react"
import { Badge, Button, DetailCard, DetailPageHeader, Tabs, TabsContent, TabsContents, TabsList, TabsTrigger } from "@repo/ui"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import {
  useKptOrderDetail,
  useKptStockCheck,
  useUpdateOrderStatus,
  useAllocateStock,
  useDispatchOrder,
  useDeliverOrder,
  useAssignPartner,
} from "@/hooks/useKptOrders"
import { usePartners } from "@/hooks/useKpt"
import { DataTable, type TableColumn } from "@/components/data-table"
import type { KptOrderLineItem, KptOrderDetail, OrderPaymentStatus, StockCheckItem } from "@/lib/api/types"

// ─── Badge config ────────────────────────────────────────────────────────────

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

const PAYMENT_BADGE: Record<OrderPaymentStatus, string> = {
  UNPAID: "bg-red-50 text-red-700 border-red-200",
  PARTIALLY_PAID: "bg-orange-50 text-orange-700 border-orange-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-100 text-red-900 border-red-300",
}

const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
}

const ALLOC_BADGE: Record<string, string> = {
  RESERVED: "bg-blue-50 text-blue-700 border-blue-200",
  DISPATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
}

const INV_STATUS_BADGE: Record<string, string> = {
  HEALTHY: "bg-emerald-50 text-emerald-700",
  LOW: "bg-yellow-50 text-yellow-700",
  CRITICAL: "bg-orange-50 text-orange-700",
  OUT_OF_STOCK: "bg-red-50 text-red-700",
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtCurrency(val: number | string | null | undefined) {
  if (val == null) return "—"
  const n = Number(val)
  if (isNaN(n)) return String(val)
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(val: number | string | null | undefined) {
  if (val == null) return "—"
  return `${Number(val).toFixed(2)}%`
}

function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ") || "—"
}

// ─── Derived fulfillment helpers ─────────────────────────────────────────────

function deriveFulfillmentStatus(order: KptOrderDetail): string {
  if (order.status === "DELIVERED") return "DELIVERED"
  if (order.status === "SHIPPED") return "SHIPPED"
  if (order.status === "IN_FULFILLMENT") {
    const anyAllocs = order.lineItems.some((li) =>
      li.stockAllocations.some((a) => a.status !== "CANCELLED")
    )
    if (!anyAllocs) return "PENDING"
    const allFull = order.lineItems.every((li) => {
      const allocated = li.stockAllocations
        .filter((a) => a.status !== "CANCELLED")
        .reduce((s, a) => s + a.allocatedQty, 0)
      return allocated >= li.quantity
    })
    return allFull ? "ALLOCATED" : "PARTIALLY_FULFILLED"
  }
  return "PENDING"
}

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ALLOCATED: "Allocated",
  PARTIALLY_FULFILLED: "Partial",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
}

const FULFILLMENT_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  ALLOCATED: "bg-blue-100 text-blue-700 border-blue-200",
  PARTIALLY_FULFILLED: "bg-orange-100 text-orange-700 border-orange-200",
  SHIPPED: "bg-sky-100 text-sky-800 border-sky-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

// ─── Attention Required ───────────────────────────────────────────────────────

function getAttentionItems(order: KptOrderDetail): { message: string; severity: "warn" | "info" }[] {
  const items: { message: string; severity: "warn" | "info" }[] = []

  if (order.status === "ON_HOLD") {
    items.push({ message: "Order is on hold and cannot be fulfilled until resumed.", severity: "warn" })
  }

  if (
    order.expectedDeliveryDate &&
    !["DELIVERED", "CANCELLED"].includes(order.status) &&
    new Date(order.expectedDeliveryDate) < new Date()
  ) {
    items.push({ message: `Expected delivery date (${fmt(order.expectedDeliveryDate)}) has passed.`, severity: "warn" })
  }

  if (order.status === "IN_FULFILLMENT") {
    const partial = order.lineItems.some((li) => {
      const allocated = li.stockAllocations
        .filter((a) => a.status !== "CANCELLED")
        .reduce((s, a) => s + a.allocatedQty, 0)
      return allocated > 0 && allocated < li.quantity
    })
    const unallocated = order.lineItems.some((li) => {
      const allocated = li.stockAllocations
        .filter((a) => a.status !== "CANCELLED")
        .reduce((s, a) => s + a.allocatedQty, 0)
      return allocated === 0
    })
    if (partial) {
      items.push({ message: "Partial fulfillment — some line items are not fully allocated.", severity: "info" })
    } else if (unallocated) {
      items.push({ message: "Stock not yet allocated for one or more items.", severity: "info" })
    }
  }

  if (!order.channelPartner && !["CANCELLED", "DRAFT"].includes(order.status)) {
    items.push({ message: "No channel partner assigned — required before stock dispatch.", severity: "info" })
  }

  return items
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, color = "blue" }: {
  icon: React.ElementType; label: string; value: React.ReactNode; color?: string
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50", violet: "bg-violet-50", emerald: "bg-emerald-50",
    orange: "bg-orange-50", sky: "bg-sky-50", amber: "bg-amber-50", gray: "bg-gray-100",
  }
  const ic: Record<string, string> = {
    blue: "text-blue-500", violet: "text-violet-500", emerald: "text-emerald-500",
    orange: "text-orange-500", sky: "text-sky-500", amber: "text-amber-500", gray: "text-gray-500",
  }
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${bg[color] ?? bg.blue}`}>
        <Icon className={`h-3.5 w-3.5 ${ic[color] ?? ic.blue}`} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm font-medium text-gray-700">{value}</div>
      </div>
    </div>
  )
}

// ─── Attention Required Banner ────────────────────────────────────────────────

function AttentionBanner({ order }: { order: KptOrderDetail }) {
  const items = getAttentionItems(order)
  if (items.length === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-sm font-semibold text-amber-800">Attention Required</p>
      </div>
      {items.map((item, i) => (
        <p key={i} className="text-sm text-amber-700 pl-6">
          {item.severity === "warn" ? "⚠ " : "ℹ "}{item.message}
        </p>
      ))}
    </div>
  )
}

// ─── Assign Partner Banner ────────────────────────────────────────────────────

function AssignPartnerBanner({ orderId }: { orderId: number }) {
  const { data: partnerRes } = usePartners({ limit: 300, status: "ACTIVE" })
  const partners: any[] = (partnerRes as any)?.data ?? []
  const assign = useAssignPartner()
  const [selected, setSelected] = React.useState("")

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0" />
      <p className="text-sm text-blue-800 font-medium">No channel partner assigned — select one to enable stock dispatch.</p>
      <div className="flex items-center gap-2 ml-auto">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-blue-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 min-w-[180px]"
        >
          <option value="">Select partner…</option>
          {partners.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!selected || assign.isPending}
          onClick={() => assign.mutate({ id: orderId, channelPartnerId: parseInt(selected, 10) })}
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
        >
          {assign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Assign
        </Button>
      </div>
    </div>
  )
}

// ─── Order Actions ────────────────────────────────────────────────────────────

function OrderActions({ order, orderId }: { order: KptOrderDetail; orderId: number }) {
  const updateStatus = useUpdateOrderStatus()
  const allocate = useAllocateStock()
  const dispatch = useDispatchOrder()
  const deliver = useDeliverOrder()
  const [cancelReason, setCancelReason] = React.useState("")
  const [showCancelInput, setShowCancelInput] = React.useState(false)
  const [dispatchRef, setDispatchRef] = React.useState("")
  const [showDispatchInput, setShowDispatchInput] = React.useState(false)

  const doStatus = (status: string, reason?: string) =>
    updateStatus.mutate({ id: orderId, status, cancellationReason: reason })

  const loading = updateStatus.isPending || allocate.isPending || dispatch.isPending || deliver.isPending

  if (order.status === "APPROVED") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => doStatus("IN_FULFILLMENT")}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Package className="h-3.5 w-3.5 mr-1" />}
          Start Fulfillment
        </Button>
        <Button size="sm" variant="outline" onClick={() => doStatus("ON_HOLD")} disabled={loading} className="text-xs">
          <PauseCircle className="h-3.5 w-3.5 mr-1" />
          Put On Hold
        </Button>
        {!showCancelInput ? (
          <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)} disabled={loading} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cancellation reason…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs border border-red-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <Button size="sm" onClick={() => doStatus("CANCELLED", cancelReason)} disabled={loading} className="text-xs bg-red-500 hover:bg-red-600 text-white">
              Confirm Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Back</Button>
          </div>
        )}
      </div>
    )
  }

  if (order.status === "IN_FULFILLMENT") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => allocate.mutate(orderId)}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
        >
          {allocate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
          Allocate Stock
        </Button>
        {!showDispatchInput ? (
          <Button
            size="sm"
            onClick={() => setShowDispatchInput(true)}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Dispatch
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Dispatch ref / GRN (optional)…"
              value={dispatchRef}
              onChange={(e) => setDispatchRef(e.target.value)}
              className="text-xs border border-orange-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300 min-w-[200px]"
            />
            <Button
              size="sm"
              onClick={() => dispatch.mutate({ id: orderId, dispatchReference: dispatchRef || undefined })}
              disabled={loading}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              {dispatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm Dispatch
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDispatchInput(false)} className="text-xs">Back</Button>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => doStatus("ON_HOLD")} disabled={loading} className="text-xs">
          <PauseCircle className="h-3.5 w-3.5 mr-1" />
          On Hold
        </Button>
        {!showCancelInput ? (
          <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)} disabled={loading} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cancellation reason…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs border border-red-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <Button size="sm" onClick={() => doStatus("CANCELLED", cancelReason)} disabled={loading} className="text-xs bg-red-500 hover:bg-red-600 text-white">
              Confirm Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Back</Button>
          </div>
        )}
      </div>
    )
  }

  if (order.status === "SHIPPED") {
    return (
      <Button
        size="sm"
        onClick={() => deliver.mutate(orderId)}
        disabled={loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
        Mark Delivered
      </Button>
    )
  }

  if (order.status === "ON_HOLD") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => doStatus("APPROVED")}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
          Resume
        </Button>
        {!showCancelInput ? (
          <Button size="sm" variant="outline" onClick={() => setShowCancelInput(true)} disabled={loading} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cancellation reason…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs border border-red-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <Button size="sm" onClick={() => doStatus("CANCELLED", cancelReason)} disabled={loading} className="text-xs bg-red-500 hover:bg-red-600 text-white">
              Confirm Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelInput(false)} className="text-xs">Back</Button>
          </div>
        )}
      </div>
    )
  }

  return null
}

// ─── Fulfillment Tab ─────────────────────────────────────────────────────────

function FulfillmentTab({ order, orderId }: { order: KptOrderDetail; orderId: number }) {
  const [runCheck, setRunCheck] = React.useState(false)
  const { data: stockRes, isLoading: stockLoading } = useKptStockCheck(orderId, runCheck)
  const allocate = useAllocateStock()
  const stockData = stockRes?.data

  const fulfillmentStatus = deriveFulfillmentStatus(order)

  return (
    <div className="space-y-6">
      {/* Fulfillment Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">Fulfillment Status</h3>
          <Badge className={`text-xs font-medium border ${FULFILLMENT_STATUS_BADGE[fulfillmentStatus] ?? "bg-gray-100 text-gray-700"}`}>
            {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] ?? fulfillmentStatus}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRunCheck(true)}
            disabled={stockLoading}
            className="text-xs"
          >
            {stockLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
            Check Stock
          </Button>
          {(order.status === "APPROVED" || order.status === "IN_FULFILLMENT") && (
            <Button
              size="sm"
              onClick={() => allocate.mutate(orderId)}
              disabled={allocate.isPending}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              {allocate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
              Allocate Stock
            </Button>
          )}
        </div>
      </div>

      {/* Per-item fulfillment grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Item Fulfillment</h4>
        {order.lineItems.length === 0 ? (
          <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-6 text-center">No line items</div>
        ) : (
          order.lineItems.map((li) => {
            const activeAllocs = li.stockAllocations.filter((a) => a.status !== "CANCELLED")
            const allocatedQty = activeAllocs.reduce((s, a) => s + a.allocatedQty, 0)
            const dispatchedQty = activeAllocs.reduce((s, a) => s + a.dispatchedQty, 0)
            const pendingQty = Math.max(0, li.quantity - allocatedQty)
            const availableQty = li.product.inventoryItem?.totalQty ?? null
            const dispatchStatus = activeAllocs.length === 0 ? "PENDING" :
              activeAllocs.every((a) => a.status === "DISPATCHED") ? "DISPATCHED" : "RESERVED"
            const isPartial = allocatedQty > 0 && allocatedQty < li.quantity
            const isFullyAllocated = allocatedQty >= li.quantity

            return (
              <div
                key={li.id}
                className={`bg-white border rounded-lg p-4 ${
                  isPartial ? "border-orange-200" : isFullyAllocated ? "border-emerald-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{li.product.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{li.product.code}</p>
                    {li.product.inventoryItem?.sku && (
                      <p className="text-xs text-gray-400 mt-0.5">SKU: {li.product.inventoryItem.sku}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {dispatchStatus !== "PENDING" && (
                      <Badge className={`text-xs border ${ALLOC_BADGE[dispatchStatus]}`}>
                        {dispatchStatus === "DISPATCHED" ? "Dispatched" : "Allocated"}
                      </Badge>
                    )}
                    {isPartial && (
                      <Badge className="text-xs border bg-orange-100 text-orange-700 border-orange-200">
                        Partial
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Qty grid */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-gray-50 rounded-md p-2">
                    <p className="text-xs text-gray-400 mb-0.5">Ordered</p>
                    <p className="text-sm font-bold text-gray-800">{li.quantity}</p>
                  </div>
                  <div className={`rounded-md p-2 ${availableQty !== null ? (availableQty >= li.quantity ? "bg-emerald-50" : "bg-red-50") : "bg-gray-50"}`}>
                    <p className="text-xs text-gray-400 mb-0.5">Available</p>
                    <p className={`text-sm font-bold ${availableQty !== null ? (availableQty >= li.quantity ? "text-emerald-700" : "text-red-700") : "text-gray-500"}`}>
                      {availableQty !== null ? availableQty : "—"}
                    </p>
                  </div>
                  <div className={`rounded-md p-2 ${allocatedQty >= li.quantity ? "bg-emerald-50" : allocatedQty > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
                    <p className="text-xs text-gray-400 mb-0.5">Allocated</p>
                    <p className={`text-sm font-bold ${allocatedQty >= li.quantity ? "text-emerald-700" : allocatedQty > 0 ? "text-orange-700" : "text-gray-500"}`}>
                      {allocatedQty}
                    </p>
                  </div>
                  <div className={`rounded-md p-2 ${pendingQty > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                    <p className="text-xs text-gray-400 mb-0.5">Pending</p>
                    <p className={`text-sm font-bold ${pendingQty > 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {pendingQty}
                    </p>
                  </div>
                </div>

                {/* Dispatched info */}
                {dispatchedQty > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <Truck className="h-3.5 w-3.5 text-sky-500" />
                    <span>{dispatchedQty} unit{dispatchedQty !== 1 ? "s" : ""} dispatched to partner</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Stock check results */}
      {stockData && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Warehouse Stock Check
            {stockData.allAllocatable && (
              <span className="ml-2 normal-case text-emerald-600 font-medium">· All items available</span>
            )}
          </h4>
          <div className="space-y-2">
            {stockData.items.map((item: StockCheckItem) => {
              const hasShortage = (item.shortage ?? 0) > 0
              const noLink = !item.hasInventoryLink
              return (
                <div
                  key={item.lineItemId}
                  className={`rounded-lg border p-3 ${
                    noLink ? "bg-gray-50 border-gray-200" :
                    hasShortage ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                      {item.sku && <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-right text-sm">
                      <div><p className="text-xs text-gray-400">Ordered</p><p className="font-semibold text-gray-800">{item.orderedQty}</p></div>
                      {item.hasInventoryLink ? (
                        <>
                          <div>
                            <p className="text-xs text-gray-400">In Warehouse</p>
                            <p className={`font-semibold ${hasShortage ? "text-red-700" : "text-emerald-700"}`}>{item.availableQty}</p>
                          </div>
                          {item.alreadyAllocated > 0 && (
                            <div><p className="text-xs text-gray-400">Allocated</p><p className="font-semibold text-blue-700">{item.alreadyAllocated}</p></div>
                          )}
                          {hasShortage ? (
                            <div><p className="text-xs text-red-400">Shortfall</p><p className="font-semibold text-red-700">{item.shortage}</p></div>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-xs">No inventory link</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delivery timeline */}
      <DetailCard title="Delivery Timeline" className="bg-white border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Expected Ship</p>
            <p className="text-sm font-medium text-gray-700">{fmt(order.expectedShipDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Actual Ship</p>
            <p className={`text-sm font-medium ${order.actualShipDate ? "text-sky-700" : "text-gray-400"}`}>
              {fmt(order.actualShipDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Expected Delivery</p>
            <p className={`text-sm font-medium ${
              order.expectedDeliveryDate && !["DELIVERED", "CANCELLED"].includes(order.status) &&
              new Date(order.expectedDeliveryDate) < new Date()
                ? "text-red-600 font-semibold"
                : "text-gray-700"
            }`}>{fmt(order.expectedDeliveryDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Actual Delivery</p>
            <p className={`text-sm font-medium ${order.actualDeliveryDate ? "text-emerald-700" : "text-gray-400"}`}>
              {fmt(order.actualDeliveryDate)}
            </p>
          </div>
        </div>
        {order.dispatchReference && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Dispatch Reference</p>
            <p className="text-sm font-mono font-medium text-gray-700">{order.dispatchReference}</p>
          </div>
        )}
      </DetailCard>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ order }: { order: KptOrderDetail }) {
  return (
    <div className="space-y-4">
      {/* Source Quote */}
      {order.quote ? (
        <DetailCard title="Source Quote" className="bg-white border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-50">
                  <FileText className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{order.quote.quoteNumber}</p>
                  <Badge className={`text-xs mt-0.5 ${
                    order.quote.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" :
                    order.quote.status === "APPROVED" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {order.quote.status}
                  </Badge>
                </div>
              </div>
              <a
                href={`/sales/quotes/${order.quote.id}`}
                className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium flex items-center gap-1"
              >
                View Quote <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
            {order.quote.opportunity && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">From opportunity:</p>
                <a
                  href={`/sales/opportunities/${order.quote.opportunity.id}`}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  {order.quote.opportunity.name}
                </a>
              </div>
            )}
          </div>
        </DetailCard>
      ) : (
        <DetailCard title="Source Quote" className="bg-white border-gray-200">
          <p className="text-sm text-gray-400">No source quote linked to this order.</p>
        </DetailCard>
      )}

      {/* Order Confirmation */}
      <DetailCard title="Order Confirmation" className="bg-white border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
            <Clipboard className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 font-mono">{order.orderNumber}</p>
            <p className="text-xs text-gray-500">
              Issued {fmt(order.orderDate)} · {STATUS_LABELS[order.status] ?? order.status}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Grand Total</p>
            <p className="font-semibold text-gray-800">{fmtCurrency(order.grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Line Items</p>
            <p className="font-semibold text-gray-800">{order.lineItems.length} SKU{order.lineItems.length !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Payment Status</p>
            <p className="font-semibold text-gray-800">{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</p>
          </div>
        </div>
      </DetailCard>

      {/* Finance Invoices */}
      {order.financeInvoices.length > 0 && (
        <DetailCard title="Finance Invoices" className="bg-white border-gray-200">
          <div className="space-y-2">
            {order.financeInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
                    <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-800">{inv.invoiceNumber}</p>
                    {inv.dueDate && <p className="text-xs text-gray-500">Due: {fmt(inv.dueDate)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-sm font-semibold text-gray-800">{fmtCurrency(inv.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Paid</p>
                    <p className="text-sm font-semibold text-emerald-700">{fmtCurrency(inv.paidAmount)}</p>
                  </div>
                  <Badge className="text-xs">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DetailCard>
      )}
    </div>
  )
}

// ─── Process Flow Tab ─────────────────────────────────────────────────────────

type FlowStepStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING" | "SKIPPED"

interface FlowStep {
  label: string
  detail: string
  status: FlowStepStatus
  ref?: string
}

function processFlowSteps(order: KptOrderDetail): FlowStep[] {
  const fulfillmentStatus = deriveFulfillmentStatus(order)
  const anyAllocations = order.lineItems.some((li) =>
    li.stockAllocations.some((a) => a.status !== "CANCELLED")
  )

  const steps: FlowStep[] = [
    {
      label: "Opportunity",
      detail: order.quote?.opportunity?.name ?? "Not linked",
      ref: order.quote?.opportunity ? `Opp: ${order.quote.opportunity.name}` : undefined,
      status: order.quote?.opportunity ? "COMPLETED" : "SKIPPED",
    },
    {
      label: "Quote",
      detail: order.quote ? `${order.quote.quoteNumber} — ${order.quote.status}` : "No quote linked",
      ref: order.quote?.quoteNumber,
      status: order.quote ? "COMPLETED" : "SKIPPED",
    },
    {
      label: "Approval",
      detail: order.quote
        ? order.quote.status === "APPROVED" || order.quote.status === "ACCEPTED"
          ? "Quote approved"
          : order.quote.status === "IN_REVIEW"
          ? "Pending approval"
          : `Quote ${order.quote.status.toLowerCase()}`
        : "—",
      status: order.quote
        ? order.quote.status === "APPROVED" || order.quote.status === "ACCEPTED"
          ? "COMPLETED"
          : order.quote.status === "IN_REVIEW"
          ? "IN_PROGRESS"
          : "PENDING"
        : "SKIPPED",
    },
    {
      label: "Sales Order",
      detail: `${order.orderNumber} — ${STATUS_LABELS[order.status] ?? order.status}`,
      ref: order.orderNumber,
      status: "COMPLETED",
    },
    {
      label: "Stock Check",
      detail: anyAllocations
        ? "Inventory verified and reserved"
        : ["IN_FULFILLMENT", "SHIPPED", "DELIVERED"].includes(order.status)
        ? "Pending allocation"
        : "Not yet initiated",
      // COMPLETED only when stock was actually reserved (allocations exist)
      // IN_FULFILLMENT alone does not mean stock was checked — show PENDING
      status: anyAllocations ? "COMPLETED" : "PENDING",
    },
    {
      label: "Allocation",
      detail: fulfillmentStatus === "ALLOCATED"
        ? "All items fully allocated"
        : fulfillmentStatus === "PARTIALLY_FULFILLED"
        ? "Partial — some items pending"
        : ["SHIPPED", "DELIVERED"].includes(order.status)
        ? "Completed prior to dispatch"
        : "Stock not yet allocated",
      status:
        fulfillmentStatus === "ALLOCATED" || ["SHIPPED", "DELIVERED"].includes(order.status)
          ? "COMPLETED"
          : fulfillmentStatus === "PARTIALLY_FULFILLED"
          ? "IN_PROGRESS"
          : "PENDING",
    },
    {
      label: "Dispatch",
      detail: order.actualShipDate
        ? `Dispatched on ${fmt(order.actualShipDate)}${order.dispatchReference ? ` · Ref: ${order.dispatchReference}` : ""}`
        : anyAllocations
        ? "Stock allocated — awaiting dispatch"
        : "Not yet dispatched",
      ref: order.dispatchReference ?? undefined,
      // COMPLETED only after actual dispatch (POST /dispatch sets status → SHIPPED)
      // IN_FULFILLMENT does NOT mean dispatch is in progress — show PENDING
      status: ["SHIPPED", "DELIVERED"].includes(order.status) ? "COMPLETED" : "PENDING",
    },
    {
      label: "Delivery",
      detail: order.actualDeliveryDate
        ? `Delivered on ${fmt(order.actualDeliveryDate)}`
        : order.status === "SHIPPED"
        ? `In transit${order.expectedDeliveryDate ? ` · Expected ${fmt(order.expectedDeliveryDate)}` : ""}`
        : order.expectedDeliveryDate
        ? `Expected ${fmt(order.expectedDeliveryDate)}`
        : "Pending",
      status: order.status === "DELIVERED" ? "COMPLETED" : order.status === "SHIPPED" ? "IN_PROGRESS" : "PENDING",
    },
  ]

  return steps
}

function FlowStepDot({ status }: { status: FlowStepStatus }) {
  if (status === "COMPLETED") return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 border-2 border-emerald-400 shrink-0">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    </div>
  )
  if (status === "IN_PROGRESS") return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 border-2 border-orange-400 shrink-0">
      <Clock className="h-4 w-4 text-orange-500" />
    </div>
  )
  if (status === "SKIPPED") return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 border-2 border-gray-300 shrink-0">
      <Circle className="h-4 w-4 text-gray-300" />
    </div>
  )
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 border-2 border-gray-200 shrink-0">
      <Circle className="h-4 w-4 text-gray-300" />
    </div>
  )
}

function ProcessFlowTab({ order }: { order: KptOrderDetail }) {
  const steps = processFlowSteps(order)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Order Process Flow</h3>
        <p className="text-xs text-gray-500 mt-0.5">Shows the actual document and status chain for this order</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="relative">
          {steps.map((step, index) => (
            <div key={step.label} className="flex gap-4">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <FlowStepDot status={step.status} />
                {index < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[28px] mt-1 ${
                    step.status === "COMPLETED" ? "bg-emerald-200" : "bg-gray-200"
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 flex-1 min-w-0 ${index === steps.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-semibold ${
                    step.status === "COMPLETED" ? "text-gray-800" :
                    step.status === "IN_PROGRESS" ? "text-orange-700" :
                    step.status === "SKIPPED" ? "text-gray-400" :
                    "text-gray-500"
                  }`}>
                    {step.label}
                  </p>
                  {step.status === "IN_PROGRESS" && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 border">In Progress</Badge>
                  )}
                  {step.status === "SKIPPED" && (
                    <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200 border">Skipped</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">{step.detail}</p>
                {step.ref && step.status === "COMPLETED" && (
                  <p className="text-xs font-mono text-orange-600 mt-0.5">{step.ref}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function OrderDetailContent() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params?.id ? parseInt(params.id, 10) : 0
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"))

  const { data: res, isLoading, isError } = useKptOrderDetail(orderId)
  const order = res?.data

  const lineItemColumns = React.useMemo<TableColumn<KptOrderLineItem>[]>(
    () => [
      {
        key: "product",
        label: "Product / SKU",
        render: (_, item) => (
          <div>
            <p className="text-sm font-medium text-gray-800">{item.product.name}</p>
            <p className="text-xs text-gray-400 font-mono">{item.product.code}</p>
            {item.product.inventoryItem?.sku && (
              <p className="text-xs text-gray-400">SKU: {item.product.inventoryItem.sku}</p>
            )}
          </div>
        ),
      },
      {
        key: "quantity",
        label: "Qty",
        render: (val) => <span className="text-sm font-semibold text-gray-800">{val as number}</span>,
      },
      {
        key: "unitPrice",
        label: "Unit Price",
        render: (val) => <span className="text-sm text-gray-700">{fmtCurrency(val)}</span>,
      },
      {
        key: "discount",
        label: "Discount",
        render: (val) => <span className="text-sm text-gray-600">{fmtPct(val)}</span>,
      },
      {
        key: "totalPrice",
        label: "Line Total",
        render: (val) => <span className="text-sm font-semibold text-gray-800">{fmtCurrency(val)}</span>,
      },
      {
        key: "product",
        label: "Stock Status",
        render: (_, item) => {
          const inv = item.product.inventoryItem
          if (!inv) return <span className="text-xs text-gray-400">—</span>
          return (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${INV_STATUS_BADGE[inv.stockStatus] ?? "bg-gray-50 text-gray-600"}`}>
              {inv.totalQty} in stock
            </span>
          )
        },
      },
    ],
    []
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading order…
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-gray-700 font-medium">Order not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/orders")}>
          Back to Orders
        </Button>
      </div>
    )
  }

  const fulfillmentStatus = deriveFulfillmentStatus(order)
  const statusBadgeClass = STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
  const payBadgeClass = PAYMENT_BADGE[order.paymentStatus] ?? PAYMENT_BADGE.UNPAID
  const billingLine = [order.billingCity, order.billingState, order.billingPostalCode].filter(Boolean).join(", ")
  const shippingLine = [order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", ")

  const TABS = [
    { value: "overview", label: "Overview" },
    { value: "items", label: "Items" },
    { value: "fulfillment", label: "Fulfillment" },
    { value: "documents", label: "Documents" },
    { value: "process-flow", label: "Process Flow" },
    { value: "finance", label: "Finance" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-4">
      {/* Page Header */}
      <DetailPageHeader
        title={order.name}
        status={STATUS_LABELS[order.status] ?? order.status}
        statusVariant="secondary"
        onBack={() => router.push("/orders")}
        headerRight={
          <div className="flex items-center gap-2">
            <Badge className={`text-xs border ${statusBadgeClass}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
            <Badge className={`text-xs border ${FULFILLMENT_STATUS_BADGE[fulfillmentStatus] ?? "bg-gray-100 text-gray-700"}`}>
              {FULFILLMENT_STATUS_LABELS[fulfillmentStatus] ?? fulfillmentStatus}
            </Badge>
            <Badge className={`text-xs border ${payBadgeClass}`}>
              {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </Badge>
            <OrderActions order={order} orderId={orderId} />
          </div>
        }
      />

      {/* Order key facts bar */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Order No.</p>
          <p className="font-mono font-semibold text-gray-800">{order.orderNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Order Date</p>
          <p className="font-medium text-gray-700">{fmt(order.orderDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Partner</p>
          <p className="font-medium text-gray-700 truncate">{order.channelPartner?.name ?? "—"}</p>
        </div>
        {order.quote && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Source Quote</p>
            <p className="font-mono font-medium text-orange-600">{order.quote.quoteNumber}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Total Value</p>
          <p className="font-semibold text-gray-800">{fmtCurrency(order.grandTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Exp. Delivery</p>
          <p className={`font-medium ${
            order.expectedDeliveryDate && !["DELIVERED", "CANCELLED"].includes(order.status) &&
            new Date(order.expectedDeliveryDate) < new Date()
              ? "text-red-600"
              : "text-gray-700"
          }`}>
            {fmt(order.expectedDeliveryDate)}
          </p>
        </div>
      </div>

      {/* Attention Required */}
      <AttentionBanner order={order} />

      {/* Partner assignment (if missing) */}
      {!order.channelPartner && !["CANCELLED", "DRAFT"].includes(order.status) && (
        <AssignPartnerBanner orderId={orderId} />
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList className="justify-start space-x-10 border-b border-gray-200">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContents className="mt-6">
          {/* ── Overview ─────────────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <DetailCard title="Order Information" className="bg-white border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={Hash} label="Order Number" value={<span className="font-mono">{order.orderNumber}</span>} color="blue" />
                    <InfoRow icon={Calendar} label="Order Date" value={fmt(order.orderDate)} color="violet" />
                    {order.quote && (
                      <InfoRow icon={FileText} label="Source Quote" value={<span className="font-mono text-orange-600">{order.quote.quoteNumber}</span>} color="orange" />
                    )}
                    {order.quote?.opportunity && (
                      <InfoRow icon={ChevronRight} label="Source Opportunity" value={order.quote.opportunity.name} color="amber" />
                    )}
                    {order.expectedShipDate && (
                      <InfoRow icon={Truck} label="Expected Ship" value={fmt(order.expectedShipDate)} color="sky" />
                    )}
                    {order.expectedDeliveryDate && (
                      <InfoRow icon={CheckCircle2} label="Expected Delivery" value={fmt(order.expectedDeliveryDate)} color="emerald" />
                    )}
                    {order.actualShipDate && (
                      <InfoRow icon={Send} label="Actual Ship Date" value={fmt(order.actualShipDate)} color="sky" />
                    )}
                    {order.actualDeliveryDate && (
                      <InfoRow icon={CheckCircle2} label="Delivered On" value={fmt(order.actualDeliveryDate)} color="emerald" />
                    )}
                    {order.dispatchReference && (
                      <InfoRow icon={GitBranch} label="Dispatch Reference" value={<span className="font-mono">{order.dispatchReference}</span>} color="sky" />
                    )}
                    {order.cancellationReason && (
                      <InfoRow icon={XCircle} label="Cancellation Reason" value={order.cancellationReason} color="gray" />
                    )}
                  </div>
                </DetailCard>

                <DetailCard title="Financial Summary" className="bg-white border-gray-200">
                  <div className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Grand Total</p>
                    <p className="mt-1 text-3xl font-bold">{fmtCurrency(order.grandTotal)}</p>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm opacity-90">
                      <div><p className="text-xs opacity-75 uppercase">Subtotal</p><p className="font-semibold">{fmtCurrency(order.subtotal)}</p></div>
                      <div><p className="text-xs opacity-75 uppercase">Discount</p><p className="font-semibold">{fmtPct(order.discountPercent)}</p></div>
                      <div><p className="text-xs opacity-75 uppercase">Tax</p><p className="font-semibold">{fmtPct(order.taxPercent)}</p></div>
                      <div><p className="text-xs opacity-75 uppercase">Shipping</p><p className="font-semibold">{fmtCurrency(order.shippingAmount)}</p></div>
                    </div>
                  </div>
                </DetailCard>

                {order.channelPartner && (
                  <DetailCard title="Partner / Dealer" className="bg-white border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoRow icon={Building2} label="Partner Name" value={order.channelPartner.name} color="orange" />
                      <InfoRow icon={Hash} label="Type / Tier" value={`${order.channelPartner.type} · ${order.channelPartner.tier}`} color="amber" />
                      {order.channelPartner.region && (
                        <InfoRow icon={MapPin} label="Region" value={order.channelPartner.region} color="sky" />
                      )}
                      <InfoRow icon={User} label="Contact" value={order.channelPartner.contactName} color="violet" />
                      {order.channelPartner.contactEmail && (
                        <InfoRow icon={Mail} label="Email" value={order.channelPartner.contactEmail} color="sky" />
                      )}
                      <InfoRow icon={Phone} label="Phone" value={order.channelPartner.contactPhone} color="emerald" />
                    </div>
                  </DetailCard>
                )}

                <DetailCard title="Account" className="bg-white border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={Building2} label="Account" value={order.account.name} color="blue" />
                    {order.contact && (
                      <>
                        <InfoRow icon={User} label="Contact" value={order.contact.name} color="violet" />
                        {order.contact.email && <InfoRow icon={Mail} label="Email" value={order.contact.email} color="sky" />}
                        {order.contact.phone && <InfoRow icon={Phone} label="Phone" value={order.contact.phone} color="emerald" />}
                      </>
                    )}
                  </div>
                </DetailCard>

                {(order.billingName || order.shippingName) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {order.billingName && (
                      <DetailCard title="Billing Address" className="bg-white border-gray-200">
                        <div className="space-y-3">
                          <InfoRow icon={CreditCard} label="Name" value={order.billingName} color="blue" />
                          <InfoRow icon={MapPin} label="Address" value={
                            <span>
                              {order.billingStreet ?? "—"}
                              {billingLine && <span className="block text-gray-500 text-xs">{billingLine}</span>}
                              {order.billingCountry && <span className="block text-gray-500 text-xs">{order.billingCountry}</span>}
                            </span>
                          } color="violet" />
                        </div>
                      </DetailCard>
                    )}
                    {order.shippingName && (
                      <DetailCard title="Shipping Address" className="bg-white border-gray-200">
                        <div className="space-y-3">
                          <InfoRow icon={Truck} label="Name" value={order.shippingName} color="sky" />
                          <InfoRow icon={MapPin} label="Address" value={
                            <span>
                              {order.shippingStreet ?? "—"}
                              {shippingLine && <span className="block text-gray-500 text-xs">{shippingLine}</span>}
                              {order.shippingCountry && <span className="block text-gray-500 text-xs">{order.shippingCountry}</span>}
                            </span>
                          } color="violet" />
                        </div>
                      </DetailCard>
                    )}
                  </div>
                )}

                {(order.paymentTerms || order.deliveryTerms || order.notes) && (
                  <DetailCard title="Terms & Notes" className="bg-white border-gray-200">
                    <div className="space-y-3">
                      {order.paymentTerms && <InfoRow icon={CreditCard} label="Payment Terms" value={order.paymentTerms} color="amber" />}
                      {order.deliveryTerms && <InfoRow icon={Truck} label="Delivery Terms" value={order.deliveryTerms} color="sky" />}
                      {order.notes && <InfoRow icon={StickyNote} label="Notes" value={<span className="whitespace-pre-wrap">{order.notes}</span>} color="gray" />}
                    </div>
                  </DetailCard>
                )}
              </div>

              <div className="space-y-4">
                <DetailCard title="Owner" className="bg-white border-gray-200">
                  <div className="space-y-3">
                    <InfoRow icon={User} label="Owner" value={fullName(order.owner.firstName, order.owner.lastName)} color="violet" />
                    {order.owner.email && <InfoRow icon={Mail} label="Email" value={order.owner.email} color="sky" />}
                    {order.approvedBy && (
                      <InfoRow icon={CheckCircle2} label="Approved By" value={fullName(order.approvedBy.firstName, order.approvedBy.lastName)} color="emerald" />
                    )}
                  </div>
                </DetailCard>

                <DetailCard title="Timestamps" className="bg-white border-gray-200">
                  <div className="space-y-3">
                    <InfoRow icon={Clock} label="Created" value={fmt(order.createdAt)} color="blue" />
                    <InfoRow icon={Clock} label="Updated" value={fmt(order.updatedAt)} color="gray" />
                    {order.approvedAt && <InfoRow icon={CheckCircle2} label="Approved" value={fmt(order.approvedAt)} color="emerald" />}
                    {order.actualShipDate && <InfoRow icon={Truck} label="Shipped" value={fmt(order.actualShipDate)} color="sky" />}
                    {order.actualDeliveryDate && <InfoRow icon={CheckCircle2} label="Delivered" value={fmt(order.actualDeliveryDate)} color="emerald" />}
                    {order.cancelledAt && <InfoRow icon={XCircle} label="Cancelled" value={fmt(order.cancelledAt)} color="gray" />}
                  </div>
                </DetailCard>
              </div>
            </div>
          </TabsContent>

          {/* ── Items ─────────────────────────────────────────────────────── */}
          <TabsContent value="items">
            <DataTable<KptOrderLineItem>
              data={order.lineItems}
              columns={lineItemColumns}
              title="Line Items"
              count={order.lineItems.length}
              columnPreferenceKey="kpt-order-line-items"
            />
            <div className="mt-4 flex justify-end">
              <div className="bg-white border border-gray-200 rounded-lg p-4 w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{fmtCurrency(order.subtotal)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount ({fmtPct(order.discountPercent)})</span>
                    <span className="text-red-600">-{fmtCurrency(order.discount)}</span>
                  </div>
                )}
                {Number(order.taxAmount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({fmtPct(order.taxPercent)})</span><span>{fmtCurrency(order.taxAmount)}</span>
                  </div>
                )}
                {Number(order.shippingAmount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span><span>{fmtCurrency(order.shippingAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Grand Total</span><span className="text-orange-600">{fmtCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Fulfillment ────────────────────────────────────────────────── */}
          <TabsContent value="fulfillment">
            <FulfillmentTab order={order} orderId={orderId} />
          </TabsContent>

          {/* ── Documents ─────────────────────────────────────────────────── */}
          <TabsContent value="documents">
            <DocumentsTab order={order} />
          </TabsContent>

          {/* ── Process Flow ──────────────────────────────────────────────── */}
          <TabsContent value="process-flow">
            <ProcessFlowTab order={order} />
          </TabsContent>

          {/* ── Finance ───────────────────────────────────────────────────── */}
          <TabsContent value="finance">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Linked Invoices</h3>
              {order.financeInvoices.length === 0 ? (
                <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-6 text-center">
                  No invoices linked to this order yet
                </div>
              ) : (
                <div className="space-y-2">
                  {order.financeInvoices.map((inv) => (
                    <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono font-medium text-gray-800">{inv.invoiceNumber}</p>
                        {inv.dueDate && <p className="text-xs text-gray-500">Due: {fmt(inv.dueDate)}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="text-sm font-semibold text-gray-800">{fmtCurrency(inv.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Paid</p>
                          <p className="text-sm font-semibold text-emerald-700">{fmtCurrency(inv.paidAmount)}</p>
                        </div>
                        <Badge className="text-xs">{inv.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <NuqsAdapter>
        <OrderDetailContent />
      </NuqsAdapter>
    </ProtectedRoute>
  )
}
