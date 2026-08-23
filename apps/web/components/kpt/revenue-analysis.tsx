"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, IndianRupee, AlertTriangle, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { useRevenueAnalysis } from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "quarter", label: "Quarter" },
  { value: "ytd", label: "YTD" },
];

const PARTNER_TYPES = [
  { value: "", label: "All Types" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "DEALER", label: "Dealer" },
  { value: "RETAILER", label: "Retailer" },
];

const MONTH_ABBR: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

const TYPE_LABEL: Record<string, string> = {
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
  RETAILER: "Retailer",
};

const STOCK_STYLE: Record<string, string> = {
  HEALTHY: "text-emerald-600",
  LOW: "text-amber-600",
  CRITICAL: "text-orange-600",
  OUT_OF_STOCK: "text-red-600",
};

const STOCK_LABEL: Record<string, string> = {
  HEALTHY: "Healthy",
  LOW: "Low",
  CRITICAL: "Critical",
  OUT_OF_STOCK: "Out of Stock",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTH_ABBR[month ?? ""] ?? month} '${(year ?? "").slice(2)}`;
}

function compactAmount(n: number, currency: string, symbol: string, convert: (n: number) => number): string {
  const v = currency === "INR" ? n : convert(n);
  if (currency === "INR") {
    if (v >= 10_000_000) return `${symbol}${(v / 10_000_000).toFixed(2)} Cr`;
    if (v >= 100_000) return `${symbol}${(v / 100_000).toFixed(1)} L`;
    if (v >= 1_000) return `${symbol}${(v / 1_000).toFixed(1)}K`;
    return `${symbol}${v.toLocaleString()}`;
  }
  if (v >= 1_000_000) return `${symbol}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${symbol}${(v / 1_000).toFixed(1)}K`;
  return `${symbol}${v.toLocaleString()}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function StockBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-xs font-medium ${STOCK_STYLE[status] ?? "text-muted-foreground"}`}>
      {STOCK_LABEL[status] ?? status}
    </span>
  );
}

function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 text-xs text-muted-foreground">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2 py-1 rounded border border-border hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2 py-1 rounded border transition-colors ${
              p === page
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent/40"
            }`}
          >
            {p}
          </button>
        ))}
        {totalPages > 5 && <span className="px-1">…</span>}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2 py-1 rounded border border-border hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-7 w-44 bg-muted rounded" />
        <div className="h-8 w-72 bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-44 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RevenueAnalysisPage() {
  const [period, setPeriod] = useState("ytd");
  const [partnerType, setPartnerType] = useState("");
  const [region, setRegion] = useState("");
  const [partnerPage, setPartnerPage] = useState(1);
  const [productPage, setProductPage] = useState(1);

  const { data, isLoading } = useRevenueAnalysis({
    period,
    partnerType: partnerType || undefined,
    region: region || undefined,
    partnerPage,
    productPage,
  });

  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) => compactAmount(n, currency, symbol, convert);

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    setPartnerPage(1);
    setProductPage(1);
  };
  const handlePartnerTypeChange = (t: string) => {
    setPartnerType(t);
    setPartnerPage(1);
  };
  const handleRegionChange = (r: string) => {
    setRegion(r);
    setPartnerPage(1);
  };

  if (isLoading) return <LoadingSkeleton />;

  const analysis = data?.data;
  const kpis = analysis?.kpis;
  const trend = analysis?.trend ?? [];
  const partners = analysis?.partners;
  const products = analysis?.products;
  const categories = analysis?.categories ?? [];
  const alerts = analysis?.alerts ?? [];

  const maxTrend = Math.max(...trend.map((t: { revenue: number; prevRevenue: number }) => Math.max(t.revenue, t.prevRevenue)), 1);
  const hasPrevTrend = trend.some((t: { prevRevenue: number }) => t.prevRevenue > 0);

  const kpiCards = [
    {
      label: "Revenue",
      value: kpis ? fmt(kpis.revenue) : "—",
      sub: kpis ? <GrowthBadge pct={kpis.growthPct} /> : null,
      subText: "vs prev period",
      icon: IndianRupee,
      highlight: undefined as "positive" | "negative" | "warning" | undefined,
    },
    {
      label: "Growth",
      value:
        kpis?.growthPct !== null && kpis?.growthPct !== undefined
          ? `${kpis.growthPct >= 0 ? "+" : ""}${kpis.growthPct.toFixed(1)}%`
          : "—",
      sub: null,
      subText: "vs equivalent prior period",
      icon: kpis?.growthPct !== null && kpis?.growthPct !== undefined && kpis.growthPct >= 0 ? TrendingUp : TrendingDown,
      highlight:
        kpis?.growthPct !== null && kpis?.growthPct !== undefined
          ? kpis.growthPct >= 0
            ? ("positive" as const)
            : ("negative" as const)
          : undefined,
    },
    {
      label: "Invoiced",
      value: kpis ? fmt(kpis.invoicedAmount) : "—",
      sub: null,
      subText: kpis?.invoicedAmount === 0 ? "No invoices in period" : "Invoices issued",
      icon: IndianRupee,
      highlight: undefined as undefined,
    },
    {
      label: "Outstanding",
      value: kpis ? fmt(kpis.outstandingReceivables) : "—",
      sub: null,
      subText: "Open receivables",
      icon: AlertTriangle,
      highlight: kpis?.outstandingReceivables && kpis.outstandingReceivables > 0
        ? ("warning" as const)
        : undefined,
    },
    {
      label: "Avg / Partner",
      value: kpis ? fmt(kpis.avgRevenuePerActivePartner) : "—",
      sub: null,
      subText: `${kpis?.activePartnerCount ?? 0} active partners`,
      icon: Users,
      highlight: undefined as undefined,
    },
  ];

  return (
    <div className="space-y-5 p-6">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Revenue Analysis</h1>
          {kpis && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpis.periodLabel} · {kpis.activePartnersWithOrders} partner
              {kpis.activePartnersWithOrders !== 1 ? "s" : ""} with orders
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 self-start sm:self-auto">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                period === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: { severity: string; message: string }, i: number) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-4 py-2.5 rounded-lg border text-sm ${
                alert.severity === "critical"
                  ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                  : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
              }`}
            >
              {alert.severity === "critical" ? (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                  {kpi.label}
                </p>
                <kpi.icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    kpi.highlight === "positive"
                      ? "text-emerald-500"
                      : kpi.highlight === "negative"
                      ? "text-red-500"
                      : kpi.highlight === "warning"
                      ? "text-amber-500"
                      : "text-primary"
                  }`}
                />
              </div>
              <p
                className={`text-lg font-bold leading-tight ${
                  kpi.highlight === "positive"
                    ? "text-emerald-600"
                    : kpi.highlight === "negative"
                    ? "text-red-600"
                    : "text-foreground"
                }`}
              >
                {kpi.value}
              </p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {kpi.sub}
                <p className="text-xs text-muted-foreground">{kpi.subText}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue trend chart */}
      {trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Revenue Trend</CardTitle>
              {hasPrevTrend && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-primary rounded-sm inline-block" />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-primary/25 rounded-sm inline-block" />
                    Previous
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-36 mt-2">
              {trend.map((t: { period: string; revenue: number; prevRevenue: number; label: string }) => {
                const curH = Math.max(3, Math.round((t.revenue / maxTrend) * 100));
                const prevH =
                  hasPrevTrend && t.prevRevenue > 0
                    ? Math.max(2, Math.round((t.prevRevenue / maxTrend) * 100))
                    : 0;
                return (
                  <div key={t.period} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-md px-2.5 py-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-md">
                      <div className="font-semibold text-foreground mb-1">{formatMonthLabel(t.period)}</div>
                      <div className="text-primary">{fmt(t.revenue)}</div>
                      {t.prevRevenue > 0 && (
                        <div className="text-muted-foreground">Prev: {fmt(t.prevRevenue)}</div>
                      )}
                    </div>
                    {/* Bar group */}
                    <div className="w-full flex items-end justify-center gap-0.5 h-32">
                      {prevH > 0 && (
                        <div
                          className="flex-1 bg-primary/25 rounded-t-sm transition-all"
                          style={{ height: `${prevH}%` }}
                        />
                      )}
                      <div
                        className="flex-1 bg-primary rounded-t-sm transition-all"
                        style={{ height: `${curH}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {formatMonthLabel(t.period)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters for tables */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        <select
          value={partnerType}
          onChange={(e) => handlePartnerTypeChange(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PARTNER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Region..."
          value={region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground w-28 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {(partnerType || region) && (
          <button
            onClick={() => { handlePartnerTypeChange(""); handleRegionChange(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Partner Revenue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Partner Revenue
            {partners && partners.total > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({partners.total} partners)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!partners?.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              No partner revenue data for this period.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["#", "Partner", "Type", "Revenue", "Prev Period", "Growth", "Share", "Orders", "Last Order"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {partners.data.map((p: any) => (
                      <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-bold text-muted-foreground">{p.rank}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          {p.region && (
                            <span className="block text-xs text-muted-foreground">{p.region}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-primary whitespace-nowrap">
                          {fmt(p.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {fmt(p.previousRevenue)}
                        </td>
                        <td className="px-4 py-2.5">
                          <GrowthBadge pct={p.growthPct} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {p.contributionPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.orderCount}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(p.lastOrderDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={partners.page}
                totalPages={partners.totalPages}
                total={partners.total}
                pageSize={partners.pageSize}
                onChange={setPartnerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Product / SKU Revenue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Product / SKU Revenue
            {products && products.total > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({products.total} products)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!products?.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              No product revenue data for this period.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Code", "Product", "Category", "Units", "Revenue", "Share", "Lines", "Stock", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {products.data.map((p: any) => (
                      <tr key={p.productId} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {p.productCode}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-medium text-foreground">{p.productName}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.categoryName}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">{p.unitsSold}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-primary whitespace-nowrap">
                          {fmt(p.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {p.contributionPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.orderCount}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">
                          {p.currentStock ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StockBadge status={p.stockStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={products.page}
                totalPages={products.totalPages}
                total={products.total}
                pageSize={products.pageSize}
                onChange={setProductPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Category", "Revenue", "Units Sold", "Share", "Growth"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {categories.map((cat: any) => (
                    <tr key={cat.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{cat.name}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary whitespace-nowrap">
                        {fmt(cat.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{cat.unitsSold}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {cat.contributionPct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5">
                        <GrowthBadge pct={cat.growthPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no data at all */}
      {!isLoading &&
        !partners?.data?.length &&
        !products?.data?.length &&
        !categories?.length &&
        !alerts?.length && (
          <div className="text-center py-12 text-muted-foreground">
            <IndianRupee className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No revenue data for this period</p>
            <p className="text-xs mt-1">
              Revenue data is generated from approved Sales Orders linked to channel partners.
            </p>
          </div>
        )}
    </div>
  );
}
