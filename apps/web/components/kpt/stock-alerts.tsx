"use client";

import { Card, CardContent } from "@repo/ui";
import { AlertTriangle, XCircle, Clock } from "lucide-react";
import { useStockAlerts, usePartners } from "../../hooks/useKpt";

interface StockEntry {
  id: number;
  partnerId: number;
  productName: string;
  sku: string;
  category: string;
  stockQty: number;
  minStockQty: number;
  unitPrice: number;
  stockStatus: "HEALTHY" | "LOW" | "CRITICAL" | "OUT_OF_STOCK";
  lastUpdated: string;
}

interface ChannelPartner {
  id: number;
  name: string;
}

const SEVERITY_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ElementType;
    badgeColor: string;
  }
> = {
  OUT_OF_STOCK: {
    label: "Out of Stock",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-300",
    icon: XCircle,
    badgeColor: "text-gray-700",
  },
  CRITICAL: {
    label: "Critical",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: AlertTriangle,
    badgeColor: "text-red-600",
  },
  LOW: {
    label: "Low Stock",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
    badgeColor: "text-amber-700",
  },
};

const SECTION_ORDER = ["OUT_OF_STOCK", "CRITICAL", "LOW"] as const;

export function StockAlertsPage() {
  const { data: alertsData, isLoading: loadingAlerts } = useStockAlerts();
  const { data: partnersData, isLoading: loadingPartners } = usePartners({ limit: 100 });

  if (loadingAlerts || loadingPartners) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const alerts: StockEntry[] = alertsData?.data ?? [];
  const partners: ChannelPartner[] = partnersData?.data ?? [];
  const partnerMap = new Map<number, ChannelPartner>(partners.map((p) => [p.id, p]));

  const outOfStock = alerts.filter((a) => a.stockStatus === "OUT_OF_STOCK");
  const critical = alerts.filter((a) => a.stockStatus === "CRITICAL");
  const low = alerts.filter((a) => a.stockStatus === "LOW");

  const countsByStatus: Record<string, StockEntry[]> = {
    OUT_OF_STOCK: outOfStock,
    CRITICAL: critical,
    LOW: low,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Low Stock Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Products requiring immediate attention across the network
        </p>
      </div>

      {/* Summary counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Out of Stock", value: outOfStock.length, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
          { label: "Critical", value: critical.length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Low Stock", value: low.length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No stock alerts at this time. All products are well-stocked.
        </div>
      )}

      {/* Grouped alert sections */}
      {SECTION_ORDER.map((status) => {
        const items = countsByStatus[status] ?? [];
        if (items.length === 0) return null;
        const cfg = SEVERITY_CONFIG[status]!;
        const Icon = cfg.icon;

        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${cfg.color}`} />
              <h2 className={`text-sm font-bold uppercase tracking-wide ${cfg.color}`}>
                {cfg.label}
              </h2>
              <span
                className={`ml-1 text-xs font-bold rounded-full px-2 py-0.5 border ${cfg.bg} ${cfg.color}`}
              >
                {items.length}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((alert) => {
                const partner = partnerMap.get(alert.partnerId);
                return (
                  <Card key={alert.id} className={`border ${cfg.bg}`}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-foreground">{alert.productName}</p>
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {alert.sku}
                            </span>
                            <span className={`text-xs font-bold ${cfg.badgeColor}`}>
                              {cfg.label}
                            </span>
                          </div>
                          {alert.category && (
                            <p className="text-xs text-muted-foreground mb-0.5">{alert.category}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {partner?.name ?? `Partner #${alert.partnerId}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{alert.stockQty} units</p>
                        <p className="text-xs text-muted-foreground">
                          Reorder at {alert.minStockQty}
                        </p>
                        {alert.lastUpdated && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Updated:{" "}
                            {new Date(alert.lastUpdated).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
