"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, FileText, Wallet, BarChart2 } from "lucide-react";
import { useFinanceOverview } from "../../hooks/useFinance";
import { useCurrency } from "../../contexts/CurrencyContext";

function fmt(n: number, symbol: string, currency: string, convert: (v: number) => number): string {
  if (currency === "INR") return `${symbol}${(n / 100000).toFixed(1)} L`;
  return `${symbol}${convert(n).toLocaleString()}`;
}

function KpiCard({
  title, value, sub, icon: Icon, highlight,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType; highlight?: "green" | "red" | "amber";
}) {
  const ringColor = highlight === "green" ? "border-l-4 border-l-green-500" : highlight === "red" ? "border-l-4 border-l-red-500" : highlight === "amber" ? "border-l-4 border-l-amber-500" : "";
  return (
    <Card className={`h-full ${ringColor}`}>
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
  const rvb: Array<{ month: number; actual: number; budget: number; variance: number }> = d?.revenueVsBudget ?? [];
  const invStatus = d?.invoiceStatusSummary ?? {};
  const revenueByPartner: Array<{ name: string; ytdSales: number; targetAmount: number }> = d?.revenueByPartner ?? [];
  const revByCat: Array<{ category: string; revenue: number }> = d?.revenueByCategory ?? [];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const maxBar = Math.max(...rvb.map((m) => Math.max(m.actual, m.budget)), 1);

  const maxPartnerRev = Math.max(...revenueByPartner.map((p) => p.ytdSales), 1);

  const INVOICE_STATUS_COLORS: Record<string, string> = {
    PAID: "bg-green-100 text-green-700 border border-green-200",
    ISSUED: "bg-blue-100 text-blue-700 border border-blue-200",
    OVERDUE: "bg-red-100 text-red-700 border border-red-200",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700 border border-amber-200",
    DRAFT: "bg-gray-100 text-gray-600 border border-gray-200",
    CANCELLED: "bg-gray-50 text-gray-400 border border-gray-200",
  };

  return (
    <div className="p-6 space-y-6 animate-kpt-fade-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard title="Total Revenue (YTD)" value={f(kpis.totalRevenue || 0)} sub={`vs budget ${f(kpis.totalBudget || 0)}`} icon={IndianRupee} />
        <KpiCard title="Total Invoiced" value={f(kpis.totalInvoiced || 0)} icon={FileText} />
        <KpiCard title="Outstanding" value={f(kpis.outstanding || 0)} icon={AlertCircle} highlight={kpis.outstanding > 500000 ? "red" : kpis.outstanding > 200000 ? "amber" : undefined} />
        <KpiCard title="Collections" value={f(kpis.collections || 0)} icon={Wallet} highlight="green" />
        <KpiCard title="Incentive Liability" value={f(kpis.incentiveLiability || 0)} sub="Approved, awaiting payment" icon={TrendingUp} highlight="amber" />
        <KpiCard
          title="Budget Achievement"
          value={kpis.budgetAchievement != null ? `${kpis.budgetAchievement}%` : "—"}
          sub="Revenue vs annual budget"
          icon={BarChart2}
          highlight={kpis.budgetAchievement >= 100 ? "green" : kpis.budgetAchievement >= 75 ? "amber" : "red"}
        />
      </div>

      {/* Revenue vs Budget Chart + Invoice Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue vs Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Revenue vs Budget (2026)</CardTitle>
          </CardHeader>
          <CardContent>
            {rvb.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No budget data configured for 2026.</p>
            ) : (
              <div className="space-y-2">
                {rvb.map((m) => (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground shrink-0">{monthNames[m.month - 1]}</span>
                    <div className="flex-1 space-y-0.5">
                      {/* Actual */}
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 rounded-full bg-primary"
                          style={{ width: `${Math.round((m.actual / maxBar) * 100)}%`, minWidth: m.actual > 0 ? '4px' : '0' }}
                        />
                        <span className="text-foreground font-medium">{f(m.actual)}</span>
                      </div>
                      {/* Budget */}
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 rounded-full bg-muted-foreground/30"
                          style={{ width: `${Math.round((m.budget / maxBar) * 100)}%`, minWidth: m.budget > 0 ? '4px' : '0' }}
                        />
                        <span className="text-muted-foreground">{f(m.budget)}</span>
                      </div>
                    </div>
                    <span className={`w-12 text-right font-semibold shrink-0 ${m.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.variance >= 0 ? '+' : ''}{f(m.variance)}
                    </span>
                  </div>
                ))}
                <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-primary" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-full bg-muted-foreground/30" /> Budget</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Invoice Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(invStatus).map(([status, val]: [string, any]) => (
                <div key={status} className={`rounded-lg p-3 ${INVOICE_STATUS_COLORS[status] || 'bg-muted'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{status.replace('_', ' ')}</p>
                  <p className="text-lg font-bold mt-0.5">{f(val.amount || 0)}</p>
                  <p className="text-xs opacity-70">{val.count} invoice{val.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
              {Object.keys(invStatus).length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No invoices yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Partner + by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue by Partner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Revenue by Partner (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPartner.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No partner revenue data.</p>
            ) : (
              <div className="space-y-3">
                {revenueByPartner.slice(0, 8).map((p) => {
                  const pct = Math.round((p.ytdSales / maxPartnerRev) * 100);
                  const targetPct = p.targetAmount > 0 ? Math.round((p.ytdSales / p.targetAmount) * 100) : 0;
                  return (
                    <div key={p.name} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium text-foreground truncate max-w-[55%]">{p.name}</span>
                        <span className="text-muted-foreground">{f(p.ytdSales)} <span className={targetPct >= 100 ? 'text-green-600 font-semibold' : ''}>{targetPct}%</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-primary">Revenue by Category (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {revByCat.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No category revenue data.</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Category</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {revByCat.map((c) => {
                      const totalRev = revByCat.reduce((s, x) => s + x.revenue, 0);
                      const share = totalRev > 0 ? ((c.revenue / totalRev) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={c.category} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 font-medium">{c.category}</td>
                          <td className="px-3 py-2 text-right">{f(c.revenue)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
