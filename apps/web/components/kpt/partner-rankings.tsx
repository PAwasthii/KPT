"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePartnerRankings } from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const KPT_ORANGE = "#e8651a";
const KPT_ORANGE_LIGHT = "rgba(232, 101, 26, 0.12)";

interface PartnerRanking {
  rank: number;
  name: string;
  tier: string;
  ytdSales: number;
  targetAmount: number;
  achievementPct: number;
}

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_COLOR: Record<string, string> = {
  BRONZE: "bg-orange-50 text-orange-700 border-orange-200",
  SILVER: "bg-gray-100 text-gray-600 border-gray-200",
  GOLD: "bg-amber-50 text-amber-700 border-amber-200",
  PLATINUM: "bg-violet-50 text-violet-700 border-violet-200",
};

function TrendIndicator({ pct }: { pct: number }) {
  if (pct >= 90)
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
        <TrendingUp className="h-3 w-3" /> On Track
      </span>
    );
  if (pct >= 75)
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
        <Minus className="h-3 w-3" /> Near Target
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
      <TrendingDown className="h-3 w-3" /> Below Target
    </span>
  );
}

export function PartnerRankingsPage() {
  const { data, isLoading } = usePartnerRankings();
  const { symbol, currency, convert } = useCurrency();

  const fmt = (n: number) =>
    currency === "INR"
      ? `${symbol}${(n / 100000).toFixed(1)} L`
      : `${symbol}${convert(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const rankings: PartnerRanking[] = data?.data ?? [];

  // Build chart data — top 10 by ytdSales, reversed so highest is at top
  const chartData = [...rankings]
    .slice(0, 10)
    .reverse();

  const barData = {
    labels: chartData.map((r) => r.name),
    datasets: [
      {
        data: chartData.map((r) => r.ytdSales),
        backgroundColor: KPT_ORANGE,
        borderRadius: 4,
        barThickness: 18,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.parsed.x as number)}`,
        },
        backgroundColor: "#1c1c1c",
        titleColor: "#e5e7eb",
        bodyColor: "#e5e7eb",
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0,0,0,0.06)" },
        ticks: {
          color: "#9ca3af",
          font: { size: 11 },
          callback: (val) =>
            currency === "INR"
              ? `${symbol}${(Number(val) / 100000).toFixed(0)}L`
              : `${symbol}${(Number(val) / 1000).toFixed(0)}k`,
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#374151",
          font: { size: 12 },
          maxRotation: 0,
        },
        border: { display: false },
      },
    },
  };

  const chartHeight = Math.max(160, chartData.length * 36);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partner Rankings</h1>
        <p className="text-sm text-muted-foreground">
          Year-to-date sales performance across all channel partners
        </p>
      </div>

      {/* Horizontal bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            YTD Revenue by Partner
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No ranking data available.
            </p>
          ) : (
            <div style={{ height: chartHeight }}>
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Trophy className="h-4 w-4" style={{ color: KPT_ORANGE }} />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Partner", "Tier", "YTD Sales", "Achievement", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankings.map((r) => (
                  <tr
                    key={r.rank}
                    className="hover:bg-muted/40 transition-colors"
                    style={r.rank === 1 ? { backgroundColor: KPT_ORANGE_LIGHT } : undefined}
                  >
                    <td className="px-4 py-2.5 font-bold text-foreground w-10">
                      {r.rank}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_COLOR[r.tier] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
                      >
                        {TIER_LABEL[r.tier] ?? r.tier}
                      </span>
                    </td>
                    <td
                      className="px-4 py-2.5 font-semibold tabular-nums"
                      style={{ color: KPT_ORANGE }}
                    >
                      {fmt(r.ytdSales)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground text-xs">
                      {r.achievementPct > 0 ? `${Math.round(r.achievementPct)}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.achievementPct > 0 ? (
                        <TrendIndicator pct={r.achievementPct} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No ranking data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
