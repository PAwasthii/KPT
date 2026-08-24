"use client";

import { useState } from "react";
import { Card, CardContent } from "@repo/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useFinanceIncentives } from "../../hooks/useFinance";
import { useCurrency } from "../../contexts/CurrencyContext";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TIER_STYLES: Record<string, string> = {
  BRONZE: "text-orange-700",
  SILVER: "text-gray-500",
  GOLD: "text-yellow-600",
  PLATINUM: "text-blue-700",
};

const STATUS_OPTIONS = ['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REJECTED'];

export function IncentivesPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('');

  const { data: resp, isLoading, error } = useFinanceIncentives({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    period: periodFilter || undefined,
  });

  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => currency === "INR" ? `${symbol}${Number(n).toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;

  const incentives: any[] = resp?.data?.incentives ?? [];
  const summary: Record<string, { count: number; gross: number; net: number }> = resp?.data?.summary ?? {};

  const approved = summary['APPROVED'] ?? { count: 0, gross: 0, net: 0 };
  const pending = summary['PENDING'] ?? { count: 0, gross: 0, net: 0 };
  const underReview = summary['UNDER_REVIEW'] ?? { count: 0, gross: 0, net: 0 };
  const paid = summary['PAID'] ?? { count: 0, gross: 0, net: 0 };

  return (
    <div className="p-6 space-y-6 animate-kpt-fade-up">
      {/* Summary cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved (Payable)</p>
              <p className="text-xl font-bold">{f(approved.net)}</p>
              <p className="text-xs text-muted-foreground">{approved.count} partner{approved.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Under Review</p>
              <p className="text-xl font-bold">{f(underReview.net)}</p>
              <p className="text-xs text-muted-foreground">{underReview.count} partner{underReview.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-xl font-bold">{f(pending.net)}</p>
              <p className="text-xs text-muted-foreground">{pending.count} partner{pending.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid (YTD)</p>
              <p className="text-xl font-bold text-green-700">{f(paid.net)}</p>
              <p className="text-xs text-muted-foreground">{paid.count} partner{paid.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="month"
          className="h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          placeholder="Period"
          title="Filter by period"
        />
        {(statusFilter !== 'ALL' || periodFilter) && (
          <button
            onClick={() => { setStatusFilter('ALL'); setPeriodFilter(''); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border hover:border-foreground/30 transition-colors"
          >
            Clear
          </button>
        )}
        {incentives.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{incentives.length} record{incentives.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/30 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 p-6"><AlertCircle className="h-5 w-5" /><span>Failed to load incentives.</span></div>
          ) : incentives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No incentive records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Partner</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Period</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Sales</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Rate %</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Gross</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Adj.</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Net Reward</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {incentives.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{inc.partner?.name || '—'}</td>
                      <td className={`px-4 py-3 font-semibold text-xs ${TIER_STYLES[inc.partner?.tier] || ''}`}>
                        {inc.partner?.tier || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inc.period}</td>
                      <td className="px-4 py-3 text-right">{f(inc.salesAmount)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{inc.incentivePercent}%</td>
                      <td className="px-4 py-3 text-right">{f(inc.incentiveAmount)}</td>
                      <td className={`px-4 py-3 text-right ${inc.adjustment !== 0 ? (inc.adjustment > 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                        {inc.adjustment !== 0 ? `${inc.adjustment > 0 ? '+' : ''}${f(inc.adjustment)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{inc.netReward != null ? f(inc.netReward) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inc.status] || 'bg-gray-100 text-gray-600'}`}>
                          {inc.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
