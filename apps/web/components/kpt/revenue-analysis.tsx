"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { IndianRupee, TrendingUp } from "lucide-react";
import { useRevenueSummary } from "../../hooks/useKpt";

interface RevenuePartner {
  name: string;
  tier: string;
  type: "DISTRIBUTOR" | "DEALER" | "RETAILER";
  ytdSales: number;
  targetAmount: number;
}

const fmt = (n: number) => `₹${(n / 100000).toFixed(1)} L`;

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_STYLE: Record<string, string> = {
  BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
  SILVER: "bg-gray-100 text-gray-600 border-gray-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  PLATINUM: "bg-violet-100 text-violet-700 border-violet-200",
};

const TYPE_LABEL: Record<string, string> = {
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
  RETAILER: "Retailer",
};

const TYPE_COLORS = ["bg-primary", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500"];

export function RevenueAnalysisPage() {
  const { data, isLoading } = useRevenueSummary();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const partners: RevenuePartner[] = data?.data ?? [];

  const totalYtd = partners.reduce((sum, p) => sum + p.ytdSales, 0);
  const totalTarget = partners.reduce((sum, p) => sum + p.targetAmount, 0);
  const avgRevenue = partners.length > 0 ? totalYtd / partners.length : 0;

  const maxRevenue = Math.max(...partners.map((p) => p.ytdSales), 1);

  // Sort by ytdSales descending for display
  const sorted = [...partners].sort((a, b) => b.ytdSales - a.ytdSales);

  // Group by type for breakdown
  const typeGroups = ["DISTRIBUTOR", "DEALER", "RETAILER"].map((type, i) => {
    const group = partners.filter((p) => p.type === type);
    const totalSales = group.reduce((sum, p) => sum + p.ytdSales, 0);
    return { type, label: TYPE_LABEL[type] ?? type, totalSales, count: group.length, colorIndex: i };
  }).filter((g) => g.count > 0);

  const maxGroupSales = Math.max(...typeGroups.map((g) => g.totalSales), 1);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Partner-wise and category-wise revenue breakdown — YTD
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total YTD Revenue",
            value: fmt(totalYtd),
            icon: IndianRupee,
            sub: `vs target ${fmt(totalTarget)}`,
          },
          {
            label: "Overall Achievement",
            value: totalTarget > 0 ? `${Math.round((totalYtd / totalTarget) * 100)}%` : "—",
            icon: TrendingUp,
            sub: "of annual target",
          },
          {
            label: "Avg Revenue / Partner",
            value: fmt(avgRevenue),
            icon: IndianRupee,
            sub: `across ${partners.length} partners`,
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue bar chart by partner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              YTD Revenue by Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sorted.slice(0, 10).map((p) => {
              const barPct = Math.round((p.ytdSales / maxRevenue) * 100);
              const achievement =
                p.targetAmount > 0
                  ? Math.round((p.ytdSales / p.targetAmount) * 100)
                  : 0;
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABEL[p.type] ?? p.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{fmt(p.ytdSales)}</p>
                      <p
                        className={`text-xs font-semibold ${
                          achievement >= 90
                            ? "text-green-600"
                            : achievement >= 75
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {achievement}% of target
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {partners.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue by partner type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              Revenue by Partner Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {typeGroups.map((grp) => {
              const barPct = Math.round((grp.totalSales / maxGroupSales) * 100);
              const totalShare =
                totalYtd > 0 ? Math.round((grp.totalSales / totalYtd) * 100) : 0;
              const colorClass = TYPE_COLORS[grp.colorIndex] ?? "bg-primary";
              return (
                <div key={grp.type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${colorClass}`} />
                      <p className="text-sm font-medium text-foreground">{grp.label}</p>
                      <span className="text-xs text-muted-foreground">({grp.count})</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{fmt(grp.totalSales)}</p>
                      <p className="text-xs text-muted-foreground">{totalShare}% of total</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${colorClass} rounded-full transition-all`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {typeGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full summary table */}
      {sorted.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              Partner Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Rank", "Partner Name", "Type", "Tier", "YTD Sales", "Target", "Achievement %"].map(
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
                  {sorted.map((p, i) => {
                    const achievement =
                      p.targetAmount > 0
                        ? Math.round((p.ytdSales / p.targetAmount) * 100)
                        : 0;
                    return (
                      <tr key={p.name} className="hover:bg-accent/40 transition-colors">
                        <td className="px-6 py-3 font-bold text-foreground">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_STYLE[p.tier] ?? ""}`}
                          >
                            {TIER_LABEL[p.tier] ?? p.tier}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-primary">{fmt(p.ytdSales)}</td>
                        <td className="px-6 py-3 text-muted-foreground">{fmt(p.targetAmount)}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs font-bold ${
                              achievement >= 90
                                ? "text-green-600"
                                : achievement >= 75
                                ? "text-amber-600"
                                : "text-red-500"
                            }`}
                          >
                            {achievement}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
