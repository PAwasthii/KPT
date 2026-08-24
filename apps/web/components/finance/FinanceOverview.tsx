"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import {
  FileText, Wallet, AlertCircle, Clock, BarChart2, TrendingUp,
} from "lucide-react";
import { useFinanceOverview } from "../../hooks/useFinance";
import { useCurrency } from "../../contexts/CurrencyContext";

function fmt(n: number, symbol: string, currency: string, convert: (v: number) => number): string {
  if (currency === "INR") return `${symbol}${(n / 100000).toFixed(1)} L`;
  return `${symbol}${convert(n).toLocaleString()}`;
}

function KpiCard({
  title, value, sub, icon: Icon, highlight,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  highlight?: "green" | "red" | "amber" | "blue";
}) {
  const border =
    highlight === "green" ? "border-l-4 border-l-green-500"
    : highlight === "red" ? "border-l-4 border-l-red-500"
    : highlight === "amber" ? "border-l-4 border-l-amber-500"
    : highlight === "blue" ? "border-l-4 border-l-blue-500"
    : "";
  return (
    <Card className={`h-full ${border}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INCENTIVE_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export function FinanceOverview() {
  const { data: resp, isLoading, error } = useFinanceOverview();
  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => fmt(n, symbol, currency, convert);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center gap-2 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load finance overview.</span>
      </div>
    );
  }

  const d = resp?.data;
  const kpis = d?.kpis ?? {};
  const revenueTrend: Array<{ month: number; revenue: number; collections: number }> = d?.revenueTrend ?? [];
  const rvb: Array<{ month: number; actual: number; budget: number; variance: number }> = d?.revenueVsBudget ?? [];
  const revenueByPartner: Array<{ name: string; ytdSales: number; targetAmount: number }> = d?.revenueByPartner ?? [];
  const topRevenueSkus: Array<{ sku: string; productName: string; revenue: number; unitsSold: number; orderCount: number }> = d?.topRevenueSkus ?? [];
  const overdueReceivables: Array<{ id: number; invoiceNumber: string; partnerName: string; balance: number; dueDate: string | null; daysPastDue: number | null }> = d?.overdueReceivables ?? [];
  const incentiveLiability: Record<string, { count: number; gross: number; net: number }> = d?.incentiveLiability ?? {};

  const maxTrend = Math.max(...revenueTrend.map((m) => Math.max(m.revenue, m.collections)), 1);
  const maxBudget = Math.max(...rvb.map((m) => Math.max(m.actual, m.budget)), 1);
  const maxPartnerRev = Math.max(...revenueByPartner.map((p) => p.ytdSales), 1);
  const maxSkuRev = Math.max(...topRevenueSkus.map((s) => s.revenue), 1);

  const achPct = kpis.budgetAchievement;

  return (
    <div className="p-6 space-y-6 animate-kpt-fade-up">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Invoiced" value={f(kpis.invoiced || 0)} sub="All non-cancelled invoices" icon={FileText} highlight="blue" />
        <KpiCard title="Collected" value={f(kpis.collected || 0)} sub="Payments received" icon={Wallet} highlight="green" />
        <KpiCard
          title="Outstanding"
          value={f(kpis.outstanding || 0)}
          sub="Issued & partial"
          icon={Clock}
          highlight={kpis.outstanding > 500000 ? "amber" : undefined}
        />
        <KpiCard
          title="Overdue"
          value={f(kpis.overdue || 0)}
          sub="Past due date"
          icon={AlertCircle}
          highlight={kpis.overdue > 0 ? "red" : undefined}
        />
        <KpiCard
          title="Budget Achievement"
          value={achPct != null ? `${achPct}%` : "—"}
          sub={`vs ${f(kpis.totalBudget || 0)} annual`}
          icon={BarChart2}
          highlight={achPct == null ? undefined : achPct >= 100 ? "green" : achPct >= 75 ? "amber" : "red"}
        />
        <KpiCard
          title="Incentive Payable"
          value={f(kpis.incentivePayable || 0)}
          sub="Approved, awaiting payout"
          icon={TrendingUp}
          highlight={kpis.incentivePayable > 0 ? "amber" : undefined}
        />
      </div>

      {/* ── Revenue & Collections Trend | Budget vs Actual ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue & Collections trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Revenue & Collections Trend (2026)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {revenueTrend.map((m) => (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground shrink-0">{MONTH_NAMES[m.month - 1]}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((m.revenue / maxTrend) * 100)}%`, minWidth: m.revenue > 0 ? '4px' : '0' }} />
                        <span className="text-foreground font-medium">{f(m.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.round((m.collections / maxTrend) * 100)}%`, minWidth: m.collections > 0 ? '4px' : '0' }} />
                        <span className="text-green-700">{f(m.collections)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 pt-2 text-xs text-muted-foreground border-t">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-primary" /> Revenue</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-green-500" /> Collected</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget vs Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Budget vs Actual (2026)</CardTitle>
          </CardHeader>
          <CardContent>
            {rvb.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No budget configured for 2026.</p>
            ) : (
              <div className="space-y-2">
                {rvb.map((m) => (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground shrink-0">{MONTH_NAMES[m.month - 1]}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((m.actual / maxBudget) * 100)}%`, minWidth: m.actual > 0 ? '4px' : '0' }} />
                        <span className="text-foreground font-medium">{f(m.actual)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 rounded-full bg-muted-foreground/30" style={{ width: `${Math.round((m.budget / maxBudget) * 100)}%`, minWidth: m.budget > 0 ? '4px' : '0' }} />
                        <span className="text-muted-foreground">{f(m.budget)}</span>
                      </div>
                    </div>
                    <span className={`w-12 text-right font-semibold shrink-0 ${m.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.variance >= 0 ? '+' : ''}{f(m.variance)}
                    </span>
                  </div>
                ))}
                <div className="flex gap-4 pt-2 text-xs text-muted-foreground border-t">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-primary" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-muted-foreground/30" /> Budget</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Revenue Partners | Top Revenue SKUs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Revenue Partners */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Top Revenue Partners (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPartner.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No partner revenue data.</p>
            ) : (
              <div className="space-y-3">
                {revenueByPartner.slice(0, 10).map((p, idx) => {
                  const barPct = Math.round((p.ytdSales / maxPartnerRev) * 100);
                  const targetPct = p.targetAmount > 0 ? Math.round((p.ytdSales / p.targetAmount) * 100) : null;
                  return (
                    <div key={p.name} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium text-foreground truncate max-w-[50%]">
                          <span className="text-muted-foreground mr-1">#{idx + 1}</span>{p.name}
                        </span>
                        <span className="text-muted-foreground">
                          {f(p.ytdSales)}
                          {targetPct != null && (
                            <span className={`ml-1 font-semibold ${targetPct >= 100 ? 'text-green-600' : targetPct >= 75 ? 'text-amber-600' : 'text-red-500'}`}>
                              {targetPct}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Revenue SKUs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Top Revenue SKUs (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {topRevenueSkus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No SKU revenue data.</p>
            ) : (
              <div className="space-y-3">
                {topRevenueSkus.slice(0, 10).map((s, idx) => {
                  const barPct = Math.round((s.revenue / maxSkuRev) * 100);
                  return (
                    <div key={s.sku} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium text-foreground truncate max-w-[55%]">
                          <span className="text-muted-foreground mr-1">#{idx + 1}</span>
                          <span className="font-mono">{s.sku}</span>
                        </span>
                        <span className="text-muted-foreground">{f(s.revenue)} · {s.unitsSold} units</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Overdue Receivables | Incentive Liability ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overdue Receivables */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Overdue Receivables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {overdueReceivables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">No overdue invoices.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Invoice</th>
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Partner</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Balance</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overdueReceivables.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-primary">{inv.invoiceNumber}</td>
                        <td className="px-4 py-2 truncate max-w-[120px]">{inv.partnerName}</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">{f(inv.balance)}</td>
                        <td className="px-4 py-2 text-right">
                          {inv.daysPastDue != null ? (
                            <span className={`font-semibold ${inv.daysPastDue > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                              +{inv.daysPastDue}d
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incentive Liability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Incentive Liability</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(incentiveLiability).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No incentive data.</p>
            ) : (
              <div className="space-y-3">
                {(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REJECTED'] as const)
                  .filter((s) => incentiveLiability[s])
                  .map((status) => {
                    const row = incentiveLiability[status];
                    if (!row) return null;
                    return (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${INCENTIVE_STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
                            {status.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground text-xs">{row.count} partner{row.count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{f(row.net)}</p>
                          <p className="text-xs text-muted-foreground">net reward</p>
                        </div>
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
