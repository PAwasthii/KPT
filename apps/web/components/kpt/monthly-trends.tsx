"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { TrendingUp, Users, IndianRupee, AlertTriangle, Star } from "lucide-react";
import { useMonthlyTrends, useKptKPIs } from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

interface MonthlyTrend {
  period: string;
  salesAmount: number;
  incentiveAmount: number;
}

interface KPIData {
  activePartners: number;
  totalRevenueYTD: number;
  totalPendingIncentives: number;
  lowStockAlerts: number;
  newDealersThisMonth: number;
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-8 flex items-end">
      <div
        className={`w-full ${color} rounded-t-sm transition-all`}
        style={{ height: `${pct}%`, minHeight: "4px" }}
      />
    </div>
  );
}

function formatPeriod(period: string): string {
  // period is YYYY-MM, format to "Jan 2026"
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function shortPeriod(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short" });
}

export function MonthlyTrendsPage() {
  const { data: trendsData, isLoading: loadingTrends } = useMonthlyTrends();
  const { data: kpiData, isLoading: loadingKPIs } = useKptKPIs();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) => currency === 'INR'
    ? `${symbol}${(n / 100000).toFixed(1)} L`
    : `${symbol}${convert(n).toLocaleString()}`;

  if (loadingTrends || loadingKPIs) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const trends: MonthlyTrend[] = trendsData?.data ?? [];
  const kpis: KPIData | null = kpiData?.data ?? null;

  const maxSales = Math.max(...trends.map((d) => d.salesAmount), 1);
  const maxIncentive = Math.max(...trends.map((d) => d.incentiveAmount), 1);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Monthly Trends</h1>
        <p className="text-sm text-muted-foreground">
          Revenue and incentive performance trends over time
        </p>
      </div>

      {/* KPI summary cards */}
      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Active Partners",
              value: kpis.activePartners,
              icon: Users,
              color: "text-primary",
            },
            {
              label: "Total Revenue YTD",
              value: fmt(kpis.totalRevenueYTD),
              icon: IndianRupee,
              color: "text-green-600",
            },
            {
              label: "Pending Incentives",
              value: fmt(kpis.totalPendingIncentives),
              icon: TrendingUp,
              color: "text-amber-600",
            },
            {
              label: "Low Stock Alerts",
              value: kpis.lowStockAlerts,
              icon: AlertTriangle,
              color: "text-red-600",
            },
            {
              label: "New Dealers (Month)",
              value: kpis.newDealersThisMonth,
              icon: Star,
              color: "text-blue-600",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-7 w-7 shrink-0 ${s.color}`} />
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Monthly revenue bar chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Monthly Sales &amp; Incentives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-400 inline-block" />
                Incentives
              </span>
            </div>
            <div
              className="grid items-end gap-2 h-40"
              style={{ gridTemplateColumns: `repeat(${trends.length}, minmax(0, 1fr))` }}
            >
              {trends.map((d) => (
                <div key={d.period} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold text-primary">{fmt(d.salesAmount)}</span>
                  <div className="w-full flex gap-0.5 items-end h-28">
                    <div className="flex-1 flex items-end h-full">
                      <MiniBar value={d.salesAmount} max={maxSales} color="bg-primary" />
                    </div>
                    <div className="flex-1 flex items-end h-full">
                      <MiniBar value={d.incentiveAmount} max={maxSales} color="bg-blue-400" />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{shortPeriod(d.period)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
            Period Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Period", "Total Sales", "Incentive Paid", "Incentive Rate %", "MoM Growth"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trends.map((d, i) => {
                const prev = trends[i - 1];
                const growth =
                  prev && prev.salesAmount > 0
                    ? (((d.salesAmount - prev.salesAmount) / prev.salesAmount) * 100).toFixed(1)
                    : null;
                const incentiveRate =
                  d.salesAmount > 0
                    ? ((d.incentiveAmount / d.salesAmount) * 100).toFixed(2)
                    : "0.00";
                const isLatest = i === trends.length - 1;
                return (
                  <tr
                    key={d.period}
                    className={`hover:bg-accent/40 transition-colors ${isLatest ? "bg-primary/5 font-medium" : ""}`}
                  >
                    <td className="px-6 py-3 font-semibold text-foreground">
                      {formatPeriod(d.period)}
                    </td>
                    <td className="px-6 py-3 font-bold text-primary">{fmt(d.salesAmount)}</td>
                    <td className="px-6 py-3 text-foreground">{fmt(d.incentiveAmount)}</td>
                    <td className="px-6 py-3 text-muted-foreground">{incentiveRate}%</td>
                    <td className="px-6 py-3">
                      {growth !== null ? (
                        <span
                          className={`text-xs font-bold ${
                            Number(growth) >= 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {Number(growth) >= 0 ? "+" : ""}
                          {growth}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {trends.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No trend data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
