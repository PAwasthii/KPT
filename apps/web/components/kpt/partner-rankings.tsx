"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePartnerRankings } from "../../hooks/useKpt";

interface PartnerRanking {
  rank: number;
  name: string;
  tier: string;
  ytdSales: number;
  targetAmount: number;
  achievementPct: number;
}

const fmt = (n: number) => `₹${(n / 100000).toFixed(1)} L`;

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_COLOR: Record<string, string> = {
  BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
  SILVER: "bg-gray-100 text-gray-600 border-gray-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  PLATINUM: "bg-violet-100 text-violet-700 border-violet-200",
};

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function AchievementBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const colorClass =
    pct >= 90 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${capped}%` }} />
      </div>
      <span
        className={`text-xs font-bold ${
          pct >= 90 ? "text-green-600" : pct >= 75 ? "text-amber-600" : "text-red-500"
        }`}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function TrendIndicator({ achievementPct }: { achievementPct: number }) {
  if (achievementPct >= 90) {
    return (
      <span className="flex items-center gap-0.5 text-green-600 text-xs font-bold">
        <TrendingUp className="h-3 w-3" /> On Track
      </span>
    );
  }
  if (achievementPct >= 75) {
    return (
      <span className="flex items-center gap-0.5 text-amber-600 text-xs font-bold">
        <Minus className="h-3 w-3" /> Near Target
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-red-500 text-xs font-bold">
      <TrendingDown className="h-3 w-3" /> Below Target
    </span>
  );
}

export function PartnerRankingsPage() {
  const { data, isLoading } = usePartnerRankings();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const rankings: PartnerRanking[] = data?.data ?? [];
  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partner Rankings</h1>
        <p className="text-sm text-muted-foreground">
          Overall performance ranking across all channel partners
        </p>
      </div>

      {/* Podium top 3 */}
      {top3.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((p) => (
            <Card
              key={p.rank}
              className={
                p.rank === 1 ? "border-2 border-primary ring-2 ring-primary/20" : ""
              }
            >
              <CardContent className="p-5 text-center">
                <div className="text-3xl mb-2">{RANK_MEDALS[p.rank] ?? `#${p.rank}`}</div>
                <p className="font-bold text-foreground">{p.name}</p>
                <div className="mt-2 mb-3">
                  <span
                    className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_COLOR[p.tier] ?? ""}`}
                  >
                    {TIER_LABEL[p.tier] ?? p.tier}
                  </span>
                </div>
                <p className="text-2xl font-bold text-primary">{fmt(p.ytdSales)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">YTD Sales</p>
                <p
                  className={`text-sm font-semibold mt-2 ${
                    p.achievementPct >= 90
                      ? "text-green-600"
                      : p.achievementPct >= 75
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}
                >
                  {Math.round(p.achievementPct)}% achievement
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full leaderboard table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Full Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Rank", "Partner", "Tier", "YTD Sales", "Target", "Achievement", "Trend"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankings.map((r) => (
                  <tr
                    key={r.rank}
                    className={`hover:bg-accent/40 transition-colors ${r.rank <= 3 ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-5 py-3 font-bold text-lg">
                      {RANK_MEDALS[r.rank] ?? r.rank}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{r.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_COLOR[r.tier] ?? ""}`}
                      >
                        {TIER_LABEL[r.tier] ?? r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-primary">{fmt(r.ytdSales)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmt(r.targetAmount)}</td>
                    <td className="px-5 py-3">
                      <AchievementBar pct={r.achievementPct} />
                    </td>
                    <td className="px-5 py-3">
                      <TrendIndicator achievementPct={r.achievementPct} />
                    </td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-muted-foreground text-sm"
                    >
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
