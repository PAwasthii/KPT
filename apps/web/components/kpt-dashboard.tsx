"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  Gift,
  IndianRupee,
  UserPlus,
} from "lucide-react";
import { useKptKPIs, usePartnerRankings, useStockAlerts } from "../hooks/useKpt";

const fmt = (n: number) => `₹${(n / 100000).toFixed(1)} L`;
const fmtCr = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : fmt(n);

const TIER_COLORS: Record<string, string> = {
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  SILVER: "bg-gray-100 text-gray-600 border-gray-200",
  BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
  PLATINUM: "bg-purple-100 text-purple-700 border-purple-200",
};

const STOCK_STATUS_DOT: Record<string, string> = {
  OUT_OF_STOCK: "bg-red-600",
  CRITICAL: "bg-red-400",
  LOW: "bg-amber-500",
  HEALTHY: "bg-green-500",
};

export function KptDashboard() {
  const { data: kpisData, isLoading: kpisLoading } = useKptKPIs();
  const { data: rankingsData, isLoading: rankingsLoading } = usePartnerRankings();
  const { data: alertsData, isLoading: alertsLoading } = useStockAlerts();

  const kpis = kpisData?.data;
  const rankings = rankingsData?.data ?? [];
  const alerts = alertsData?.data ?? [];

  const kpiCards = kpis
    ? [
        {
          title: "Active Channel Partners",
          value: String(kpis.activePartners),
          change: `+${kpis.newDealersThisMonth}`,
          changeLabel: "new this month",
          positive: true,
          icon: Users,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          title: "Revenue (YTD)",
          value: fmtCr(kpis.totalRevenueYTD),
          change: "YTD",
          changeLabel: "across all partners",
          positive: true,
          icon: IndianRupee,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          title: "Pending Incentives",
          value: fmt(kpis.totalPendingIncentives),
          change: "Pending",
          changeLabel: "awaiting payout",
          positive: true,
          icon: Gift,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          title: "Low Stock Alerts",
          value: String(kpis.lowStockAlerts),
          change: kpis.lowStockAlerts > 0 ? "Needs attention" : "All clear",
          changeLabel: "SKUs below reorder level",
          positive: kpis.lowStockAlerts === 0,
          icon: AlertTriangle,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          title: "New Dealers This Month",
          value: String(kpis.newDealersThisMonth),
          change: "Active",
          changeLabel: "registered recently",
          positive: true,
          icon: UserPlus,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          title: "Total Partners",
          value: String(kpis.activePartners),
          change: "ACTIVE",
          changeLabel: "in distribution network",
          positive: true,
          icon: Package,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
      ]
    : [];

  const top5 = rankings.slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            KPT Partner Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Channel partner performance & distribution overview — August 2026
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium border border-primary/30 bg-primary/5 rounded-full px-3 py-1 self-start">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>

      {/* KPI Grid */}
      {kpisLoading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="transition-all duration-200 hover:shadow-md hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{kpi.title}</p>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
                  <div className="flex items-center gap-1.5">
                    {kpi.positive ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-xs font-semibold ${kpi.positive ? "text-green-600" : "text-red-500"}`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Middle row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Partners */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              Top Performing Partners
            </CardTitle>
            <p className="text-xs text-muted-foreground">By YTD revenue — all partners</p>
          </CardHeader>
          <CardContent className="p-0">
            {rankingsLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : top5.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No partner data yet</div>
            ) : (
              <div className="divide-y divide-border">
                {top5.map((p: any, i: number) => (
                  <div key={p.name} className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.achievementPct.toFixed(0)}% of target</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-foreground">{fmt(p.ytdSales)}</span>
                      <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_COLORS[p.tier] ?? "bg-muted text-muted-foreground"}`}>
                        {p.tier.charAt(0) + p.tier.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              Stock Alerts
            </CardTitle>
            <p className="text-xs text-muted-foreground">SKUs below reorder level</p>
          </CardHeader>
          <CardContent className="p-0">
            {alertsLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-green-600 text-sm font-medium">All stock levels healthy</div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.slice(0, 6).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STOCK_STATUS_DOT[a.stockStatus] ?? "bg-gray-400"}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{a.productName}</p>
                        <p className="text-xs text-muted-foreground">{a.sku} · {a.category}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-foreground">{a.stockQty} units</p>
                      <p className="text-xs text-muted-foreground">{a.stockStatus.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
