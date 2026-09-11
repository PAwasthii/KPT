"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import {
  Users,
  Package,
  IndianRupee,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  Layers,
  FileText,
  ShoppingCart,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useKptKPIs, usePartners, useStockAlerts, useInventoryItems } from "../hooks/useKpt";
import { usePipelineSummary } from "../hooks/useOpportunities";
import { useKptOrders } from "../hooks/useKptOrders";
import { useAllApprovals } from "../hooks/useApprovals";
import { useQuotesWithPagination } from "../hooks/useQuotes";
import { useRecentActivity } from "../hooks/useAuditLogs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Skel({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

const STOCK_BADGE: Record<string, string> = {
  OUT_OF_STOCK: "bg-red-50 text-red-600 border border-red-200",
  CRITICAL:     "bg-red-50 text-red-500 border border-red-100",
  LOW:          "bg-amber-50 text-amber-600 border border-amber-200",
  HEALTHY:      "bg-green-50 text-green-600 border border-green-200",
};

const STOCK_DOT: Record<string, string> = {
  OUT_OF_STOCK: "bg-red-500",
  CRITICAL:     "bg-red-400",
  LOW:          "bg-amber-400",
  HEALTHY:      "bg-green-500",
};

const STOCK_LABEL: Record<string, string> = {
  OUT_OF_STOCK: "Out of stock",
  CRITICAL:     "Critical",
  LOW:          "Low",
  HEALTHY:      "Healthy",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function KptDashboard() {
  const { user } = useAuth();
  const { symbol, currency, convert } = useCurrency();

  const fmt = (n: number) =>
    currency === "INR"
      ? `${symbol}${(n / 100_000).toFixed(1)}L`
      : `${symbol}${convert(n).toLocaleString()}`;
  const fmtCr = (n: number) =>
    currency === "INR" && n >= 10_000_000
      ? `${symbol}${(n / 10_000_000).toFixed(2)} Cr`
      : fmt(n);

  // ── Data hooks ──────────────────────────────────────────────────────────────

  const { data: kpisRaw,      isLoading: kpisLoading      } = useKptKPIs();
  const { data: partnersRaw,  isLoading: partnersLoading  } = usePartners({ limit: 200 });
  const { data: alertsRaw,    isLoading: alertsLoading    } = useStockAlerts();
  const { data: inventoryRaw                               } = useInventoryItems({ limit: 1 });
  const { data: pipelineRaw,  isLoading: pipelineLoading  } = usePipelineSummary();
  const { data: activityRaw,  isLoading: activityLoading  } = useRecentActivity(6);

  // 4 lightweight order-count calls (limit:1 → only need pagination.totalItems)
  const { pagination: pendingPage,   isLoading: pendingLoading   } = useKptOrders({ status: "PENDING_APPROVAL", limit: 1 });
  const { pagination: approvedPage,  isLoading: approvedLoading  } = useKptOrders({ status: "APPROVED",         limit: 1 });
  const { pagination: shippedPage,   isLoading: shippedLoading   } = useKptOrders({ status: "SHIPPED",          limit: 1 });
  const { pagination: deliveredPage, isLoading: deliveredLoading } = useKptOrders({ status: "DELIVERED",        limit: 1 });
  const { pagination: quotesPage,    isLoading: quotesLoading    } = useQuotesWithPagination({ limit: 1 });
  const { pagination: approvalsPage, isLoading: approvalsLoading } = useAllApprovals({ status: "PENDING", limit: 1 });

  const ordersLoading = pendingLoading || approvedLoading || shippedLoading || deliveredLoading;

  // ── Derived values ───────────────────────────────────────────────────────────

  const kpis      = kpisRaw?.data;
  const partners  = (partnersRaw?.data ?? []) as any[];
  const alerts    = (alertsRaw?.data  ?? []) as any[];
  const pipeline  = pipelineRaw?.data;
  const activities = (activityRaw?.data ?? []) as any[];

  const pendingCount   = pendingPage?.totalItems   ?? 0;
  const allocatedCount = approvedPage?.totalItems  ?? 0;
  const shippedCount   = shippedPage?.totalItems   ?? 0;
  const deliveredCount = deliveredPage?.totalItems ?? 0;
  const ordersInFulfillment = pendingCount + allocatedCount + shippedCount;

  const activePartners  = partners.filter((p) => p.status === "ACTIVE");
  const dealersCount    = activePartners.filter((p) => p.type === "DEALER").length;
  const distCount       = activePartners.filter((p) => p.type === "DISTRIBUTOR").length;
  const inactiveCount   = partners.filter((p) => p.status === "INACTIVE").length;

  const outOfStockCount = alerts.filter((a) => a.stockStatus === "OUT_OF_STOCK").length;
  const criticalCount   = alerts.filter((a) => a.stockStatus === "CRITICAL").length;
  const lowCount        = alerts.filter((a) => a.stockStatus === "LOW").length;
  const criticalItems   = alerts.filter((a) => a.stockStatus !== "HEALTHY").slice(0, 5);
  const totalInventory  = inventoryRaw?.pagination?.totalItems as number | undefined;
  const healthyCount    = totalInventory != null
    ? totalInventory - outOfStockCount - criticalCount - lowCount
    : undefined;

  const opportunitiesCount = pipeline?.stages.reduce((s: number, st: any) => s + st.count, 0) ?? 0;
  const quotesCount        = quotesPage?.totalItems ?? 0;
  const confirmedOrders    = allocatedCount + shippedCount + deliveredCount;
  const pendingActions     = (approvalsPage?.totalItems ?? 0) + (kpis?.lowStockAlerts ?? 0);

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "there";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-5">

        {/* ── Zone 1: Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{fmtDate()}</p>
            <h1 className="text-xl font-semibold text-foreground">
              {greeting()}, {userName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Distribution &amp; channel operations overview
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mt-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* ── Zone 2: Business Health KPIs ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Active Channel Partners */}
          <Card className="border border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Active Partners</span>
                <div className="p-1.5 bg-blue-50 rounded-md">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                </div>
              </div>
              {kpisLoading
                ? <Skel className="h-8 w-16 mb-1.5" />
                : <p className="text-2xl font-bold text-foreground leading-none mb-1.5">{kpis?.activePartners ?? "—"}</p>
              }
              <p className="text-xs text-muted-foreground">
                +{kpis?.newDealersThisMonth ?? 0} new this month
              </p>
            </CardContent>
          </Card>

          {/* Orders in Fulfillment */}
          <Card className="border border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Orders in Fulfillment</span>
                <div className="p-1.5 bg-violet-50 rounded-md">
                  <Package className="h-3.5 w-3.5 text-violet-600" />
                </div>
              </div>
              {ordersLoading
                ? <Skel className="h-8 w-16 mb-1.5" />
                : <p className="text-2xl font-bold text-foreground leading-none mb-1.5">{ordersInFulfillment}</p>
              }
              <p className="text-xs text-muted-foreground">
                {deliveredCount} delivered to date
              </p>
            </CardContent>
          </Card>

          {/* Revenue YTD */}
          <Card className="border border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Revenue YTD</span>
                <div className="p-1.5 bg-green-50 rounded-md">
                  <IndianRupee className="h-3.5 w-3.5 text-green-600" />
                </div>
              </div>
              {kpisLoading
                ? <Skel className="h-8 w-24 mb-1.5" />
                : <p className="text-2xl font-bold text-foreground leading-none mb-1.5">{kpis ? fmtCr(kpis.totalRevenueYTD) : "—"}</p>
              }
              <p className="text-xs text-muted-foreground">across all partners</p>
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card className={`border ${pendingActions > 0 ? "border-amber-200 bg-amber-50/30" : "border-border/60"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Pending Actions</span>
                <div className={`p-1.5 rounded-md ${pendingActions > 0 ? "bg-amber-100" : "bg-green-50"}`}>
                  <AlertTriangle className={`h-3.5 w-3.5 ${pendingActions > 0 ? "text-amber-600" : "text-green-500"}`} />
                </div>
              </div>
              {kpisLoading || approvalsLoading
                ? <Skel className="h-8 w-12 mb-1.5" />
                : <p className={`text-2xl font-bold leading-none mb-1.5 ${pendingActions > 0 ? "text-amber-700" : "text-green-600"}`}>
                    {pendingActions}
                  </p>
              }
              <p className="text-xs text-muted-foreground">
                {pendingActions > 0 ? "approvals & stock issues" : "all clear"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Zone 3: Order Fulfillment + Partner Network ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Left — Order Fulfillment (3/5) */}
          <Card className="lg:col-span-3 border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Order Fulfillment</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Current order pipeline status</p>
                </div>
                <Link href="/orders" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                  View Orders <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">

              {/* 4 stage tiles */}
              {ordersLoading ? (
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-20" />)}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {([
                    { label: "Pending",    count: pendingCount,   icon: Clock,        iconColor: "text-amber-600",  bg: "bg-amber-50"  },
                    { label: "Allocated",  count: allocatedCount, icon: CheckCircle,  iconColor: "text-blue-600",   bg: "bg-blue-50"   },
                    { label: "Dispatched", count: shippedCount,   icon: Truck,        iconColor: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Delivered",  count: deliveredCount, icon: Package,      iconColor: "text-green-600",  bg: "bg-green-50"  },
                  ] as const).map((stage) => {
                    const Icon = stage.icon;
                    return (
                      <div key={stage.label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                        <div className={`p-2 rounded-md ${stage.bg}`}>
                          <Icon className={`h-4 w-4 ${stage.iconColor}`} />
                        </div>
                        <p className="text-xl font-bold text-foreground leading-none">{stage.count}</p>
                        <p className="text-xs text-muted-foreground">{stage.label}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total context line */}
              {!ordersLoading && (
                <p className="text-xs text-center text-muted-foreground mb-4">
                  {pendingCount + allocatedCount + shippedCount + deliveredCount} total orders tracked
                </p>
              )}

              {/* Attention exceptions */}
              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2.5">Attention</p>
                {kpisLoading || ordersLoading || approvalsLoading ? (
                  <div className="space-y-2">
                    <Skel className="h-3.5 w-3/4" />
                    <Skel className="h-3.5 w-1/2" />
                  </div>
                ) : pendingCount === 0 && (kpis?.lowStockAlerts ?? 0) === 0 && (approvalsPage?.totalItems ?? 0) === 0 ? (
                  <p className="text-xs text-green-600 font-medium">No immediate actions required</p>
                ) : (
                  <div className="space-y-1.5">
                    {pendingCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs text-foreground">
                          {pendingCount} order{pendingCount !== 1 ? "s" : ""} awaiting stock allocation
                        </span>
                      </div>
                    )}
                    {(kpis?.lowStockAlerts ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs text-foreground">
                          {kpis?.lowStockAlerts} SKU{kpis?.lowStockAlerts !== 1 ? "s" : ""} below reorder level
                        </span>
                      </div>
                    )}
                    {(approvalsPage?.totalItems ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs text-foreground">
                          {approvalsPage?.totalItems} approval{approvalsPage?.totalItems !== 1 ? "s" : ""} pending review
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right — Partner Network (2/5) */}
          <Card className="lg:col-span-2 border border-border/60">
            <CardHeader className="pt-5 px-5 pb-4">
              <CardTitle className="text-sm font-semibold text-foreground">Channel Partner Network</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution network health</p>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              {partnersLoading || kpisLoading ? (
                <div className="space-y-3">
                  <Skel className="h-10 w-20 mb-1" />
                  {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-3.5" />)}
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <p className="text-3xl font-bold text-foreground leading-none">
                      {kpis?.activePartners ?? activePartners.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Active Partners</p>
                  </div>
                  <div className="space-y-2.5">
                    {([
                      { label: "Dealers",        value: dealersCount                      },
                      { label: "Distributors",   value: distCount                         },
                      { label: "New this month", value: kpis?.newDealersThisMonth ?? 0    },
                      { label: "Inactive",       value: inactiveCount                     },
                    ] as const).map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border/40">
                    <Link href="/channel-partners" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                      View Partner Network <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Zone 4: Inventory Intelligence ──────────────────────────────────── */}
        <Card className="border border-border/60">
          <CardHeader className="pt-5 px-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Inventory Intelligence</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Stock status across the distribution network</p>
              </div>
              <Link href="/stock-management/alerts" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                View Inventory <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {alertsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-16" />)}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-10" />)}
                </div>
              </div>
            ) : (
              <>
                {/* 3 status buckets */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-green-50 border border-green-100">
                    <p className="text-2xl font-bold text-green-700">{healthyCount ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Healthy Stock</p>
                  </div>
                  <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-2xl font-bold text-amber-700">{criticalCount + lowCount}</p>
                    <p className="text-xs text-muted-foreground">Critical / Low</p>
                  </div>
                  <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                    <p className="text-xs text-muted-foreground">Out of Stock</p>
                  </div>
                </div>

                {/* Critical SKU list */}
                {criticalItems.length === 0 ? (
                  <div className="py-4 text-center text-sm text-green-600 font-medium">
                    All stock levels are healthy
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2.5">Critical Stock</p>
                    <div className="space-y-1.5">
                      {criticalItems.map((a: any) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 border border-border/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${STOCK_DOT[a.stockStatus] ?? "bg-gray-400"}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{a.productName}</p>
                              <p className="text-xs text-muted-foreground">{a.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-foreground tabular-nums">{a.stockQty} units</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${STOCK_BADGE[a.stockStatus] ?? ""}`}>
                              {STOCK_LABEL[a.stockStatus] ?? a.stockStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Zone 5: Sales → Order Conversion ────────────────────────────────── */}
        <Card className="border border-border/60">
          <CardHeader className="pt-5 px-5 pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">Sales → Order Conversion</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">End-to-end commercial pipeline</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {pipelineLoading || quotesLoading || ordersLoading ? (
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <Skel className="h-20 flex-1" />
                    {i < 3 && <div className="w-4 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <>
                {/* 4 stage columns */}
                <div className="flex items-stretch gap-1.5">
                  {([
                    { label: "Opportunities", count: opportunitiesCount, sub: "open",         icon: Layers,       color: "text-blue-600",   bg: "bg-blue-50"   },
                    { label: "Quotes",         count: quotesCount,        sub: "generated",    icon: FileText,     color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Orders",         count: confirmedOrders,    sub: "confirmed",    icon: ShoppingCart, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "In Fulfillment", count: ordersInFulfillment, sub: "processing", icon: Truck,        color: "text-green-600",  bg: "bg-green-50"  },
                  ] as const).map((stage, idx) => {
                    const Icon = stage.icon;
                    return (
                      <React.Fragment key={stage.label}>
                        <div className="flex-1 flex flex-col gap-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground leading-tight">{stage.label}</p>
                            <div className={`p-1.5 rounded-md ${stage.bg}`}>
                              <Icon className={`h-3.5 w-3.5 ${stage.color}`} />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-foreground leading-none">{stage.count}</p>
                          <p className="text-xs text-muted-foreground">{stage.sub}</p>
                        </div>
                        {idx < 3 && (
                          <div className="flex items-center text-muted-foreground/40 shrink-0 text-base font-light px-0.5">
                            →
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Funnel flow pills */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
                  {([
                    { label: `${opportunitiesCount} Opportunities`, pill: "bg-blue-100 text-blue-700"   },
                    { label: `${quotesCount} Quotes`,               pill: "bg-violet-100 text-violet-700" },
                    { label: `${confirmedOrders} Orders`,           pill: "bg-indigo-100 text-indigo-700" },
                    { label: `${ordersInFulfillment} Fulfillment`,  pill: "bg-green-100 text-green-700"  },
                  ] as const).map((step, idx) => (
                    <React.Fragment key={step.label}>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${step.pill}`}>
                        {step.label}
                      </span>
                      {idx < 3 && <span className="text-muted-foreground/40 text-xs">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Zone 6: Recent Activity ──────────────────────────────────────────── */}
        <Card className="border border-border/60">
          <CardHeader className="pt-5 px-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest actions across orders, quotes &amp; partners
                </p>
              </div>
              <Link href="/audit-logs" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-11" />)}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent activity recorded
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {activities.map((act: any) => {
                  const actor = act.changedByUser
                    ? [act.changedByUser.firstName, act.changedByUser.lastName]
                        .filter(Boolean)
                        .join(" ")
                    : "System";
                  const actionLabel = (act.action as string)
                    ?.toLowerCase()
                    .replace(/_/g, " ") ?? "updated";
                  return (
                    <div key={act.id} className="flex items-start gap-3 py-3">
                      <div className="p-1.5 bg-muted rounded-md mt-0.5 shrink-0">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">
                          <span className="font-medium capitalize">{actionLabel}</span>
                          {" · "}
                          <span className="text-muted-foreground">
                            {act.entityType} #{act.entityId}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{actor}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                        {relativeTime(act.changedAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
