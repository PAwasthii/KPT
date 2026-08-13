"use client";

import { useState } from "react";
import { Card, CardContent } from "@repo/ui";
import { AlertTriangle, XCircle, Clock, Package, Warehouse, Truck, Store } from "lucide-react";
import { useStockAlerts, usePartners, useInventoryItems } from "../../hooks/useKpt";

interface StockEntry {
  id: number;
  partnerId: number;
  productName: string;
  sku: string;
  category: string;
  stockQty: number;
  minStockQty: number;
  stockStatus: "HEALTHY" | "LOW" | "CRITICAL" | "OUT_OF_STOCK";
  lastUpdated: string;
  inventoryItem?: { id: number; totalQty: number } | null;
}

interface InventoryItem {
  id: number;
  productName: string;
  sku: string;
  category: string;
  totalQty: number;
  minStockQty: number;
  reorderQty: number;
  stockStatus: string;
  lastUpdated: string;
}

interface ChannelPartner {
  id: number;
  name: string;
  type: "DISTRIBUTOR" | "DEALER" | "RETAILER";
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; badgeColor: string }> = {
  OUT_OF_STOCK: { label: "Out of Stock", color: "text-gray-700", bg: "bg-gray-50 border-gray-300", icon: XCircle, badgeColor: "bg-gray-200 text-gray-700" },
  CRITICAL:     { label: "Critical",     color: "text-red-600",  bg: "bg-red-50 border-red-200",   icon: AlertTriangle, badgeColor: "bg-red-100 text-red-700" },
  LOW:          { label: "Low Stock",    color: "text-amber-700",bg: "bg-amber-50 border-amber-200",icon: Clock, badgeColor: "bg-amber-100 text-amber-700" },
};

const PARTNER_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DISTRIBUTOR: { label: "Distributor", color: "bg-blue-100 text-blue-700", icon: Truck },
  DEALER:      { label: "Dealer",      color: "bg-orange-100 text-orange-700", icon: Store },
  RETAILER:    { label: "Retailer",    color: "bg-purple-100 text-purple-700", icon: Store },
};

const SECTION_ORDER = ["OUT_OF_STOCK", "CRITICAL", "LOW"] as const;

type PartnerFilter = "ALL" | "DISTRIBUTOR" | "DEALER";

export function StockAlertsPage() {
  const [partnerFilter, setPartnerFilter] = useState<PartnerFilter>("ALL");

  const { data: alertsData, isLoading: loadingAlerts } = useStockAlerts();
  const { data: partnersData, isLoading: loadingPartners } = usePartners({ limit: 100 });
  const { data: inventoryData, isLoading: loadingInventory } = useInventoryItems({ limit: 500 });

  if (loadingAlerts || loadingPartners || loadingInventory) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  const allAlerts: StockEntry[] = alertsData?.data ?? [];
  const partners: ChannelPartner[] = partnersData?.data ?? [];
  const allInventory: InventoryItem[] = inventoryData?.data ?? [];

  const partnerMap = new Map<number, ChannelPartner>(partners.map((p) => [p.id, p]));

  // Inventory-level alerts (master warehouse)
  const inventoryAlerts = allInventory.filter((i) => i.stockStatus !== "HEALTHY");

  // Partner stock alerts filtered by type
  const filteredAlerts = allAlerts.filter((a) => {
    if (partnerFilter === "ALL") return true;
    return partnerMap.get(a.partnerId)?.type === partnerFilter;
  });

  const partnerAlertsByStatus: Record<string, StockEntry[]> = {
    OUT_OF_STOCK: filteredAlerts.filter((a) => a.stockStatus === "OUT_OF_STOCK"),
    CRITICAL:     filteredAlerts.filter((a) => a.stockStatus === "CRITICAL"),
    LOW:          filteredAlerts.filter((a) => a.stockStatus === "LOW"),
  };

  const invByStatus: Record<string, InventoryItem[]> = {
    OUT_OF_STOCK: inventoryAlerts.filter((i) => i.stockStatus === "OUT_OF_STOCK"),
    CRITICAL:     inventoryAlerts.filter((i) => i.stockStatus === "CRITICAL"),
    LOW:          inventoryAlerts.filter((i) => i.stockStatus === "LOW"),
  };

  const distCount = allAlerts.filter((a) => partnerMap.get(a.partnerId)?.type === "DISTRIBUTOR").length;
  const dealerCount = allAlerts.filter((a) => partnerMap.get(a.partnerId)?.type === "DEALER").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Warehouse inventory + partner stock requiring immediate attention
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-gray-700">
              {allAlerts.filter((a) => a.stockStatus === "OUT_OF_STOCK").length + (invByStatus.OUT_OF_STOCK?.length ?? 0)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
        <Card className="border bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-red-600">
              {allAlerts.filter((a) => a.stockStatus === "CRITICAL").length + (invByStatus.CRITICAL?.length ?? 0)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="border bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-amber-600">
              {allAlerts.filter((a) => a.stockStatus === "LOW").length + (invByStatus.LOW?.length ?? 0)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card className="border bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-slate-600">{inventoryAlerts.length}</p>
            <p className="text-sm font-medium text-muted-foreground">Inventory Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 1: Warehouse Inventory Alerts ── */}
      {inventoryAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <Warehouse className="h-5 w-5 text-slate-600" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Warehouse Inventory Alerts
            </h2>
            <span className="ml-1 text-xs font-bold rounded-full px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200">
              {inventoryAlerts.length}
            </span>
            <span className="text-xs text-muted-foreground ml-1">— master stock at KPT warehouse</span>
          </div>

          {SECTION_ORDER.map((status) => {
            const items = invByStatus[status] ?? [];
            if (items.length === 0) return null;
            const cfg = SEVERITY_CONFIG[status]!;
            const Icon = cfg.icon;

            return (
              <div key={`inv-${status}`} className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
                {items.map((item) => (
                  <Card key={item.id} className={`border ${cfg.bg}`}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-foreground">{item.productName}</p>
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.sku}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Warehouse className="h-3 w-3" /> KPT Warehouse Stock
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{item.totalQty} units</p>
                        <p className="text-xs text-muted-foreground">Min: {item.minStockQty}</p>
                        <p className="text-xs text-muted-foreground">Reorder at: {item.reorderQty}</p>
                        {item.lastUpdated && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(item.lastUpdated).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {/* ── SECTION 2: Partner Stock Alerts ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
          <Package className="h-5 w-5 text-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Partner Stock Alerts
          </h2>
          <span className="ml-1 text-xs font-bold rounded-full px-2 py-0.5 bg-muted text-muted-foreground border">
            {allAlerts.length}
          </span>

          {/* Filter tabs */}
          <div className="ml-auto flex gap-1.5">
            {(["ALL", "DISTRIBUTOR", "DEALER"] as const).map((f) => {
              const count = f === "ALL" ? allAlerts.length : f === "DISTRIBUTOR" ? distCount : dealerCount;
              const active = partnerFilter === f;
              const activeColor = f === "DISTRIBUTOR" ? "bg-blue-100 text-blue-700 border-blue-300"
                                : f === "DEALER"      ? "bg-orange-100 text-orange-700 border-orange-300"
                                :                       "bg-muted text-foreground border-border";
              return (
                <button
                  key={f}
                  onClick={() => setPartnerFilter(f)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    active ? activeColor : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f === "ALL" ? "All" : f === "DISTRIBUTOR" ? "Distributors" : "Dealers"} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filteredAlerts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No partner stock alerts{partnerFilter !== "ALL" ? ` for ${partnerFilter.toLowerCase()}s` : ""}.
          </p>
        )}

        {SECTION_ORDER.map((status) => {
          const items = partnerAlertsByStatus[status] ?? [];
          if (items.length === 0) return null;
          const cfg = SEVERITY_CONFIG[status]!;
          const Icon = cfg.icon;

          return (
            <div key={`partner-${status}`} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 border ${cfg.bg} ${cfg.color}`}>
                  {items.length}
                </span>
              </div>

              {items.map((alert) => {
                const partner = partnerMap.get(alert.partnerId);
                const pType = partner?.type ?? "DEALER";
                const ptCfg = PARTNER_TYPE_CONFIG[pType] ?? PARTNER_TYPE_CONFIG.DEALER!;
                const PtIcon = ptCfg.icon;
                const invLeft = (alert as any).inventoryItem?.totalQty ?? null;

                return (
                  <Card key={alert.id} className={`border ${cfg.bg}`}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-foreground">{alert.productName}</p>
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {alert.sku}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                              {cfg.label}
                            </span>
                          </div>
                          {alert.category && (
                            <p className="text-xs text-muted-foreground mb-0.5">{alert.category}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ptCfg.color}`}>
                              <PtIcon className="h-3 w-3" />
                              {ptCfg.label}
                            </span>
                            <p className="text-sm text-muted-foreground">
                              {partner?.name ?? `Partner #${alert.partnerId}`}
                            </p>
                          </div>
                          {invLeft !== null && (
                            <p className={`text-xs mt-1 font-medium ${invLeft === 0 ? "text-red-500" : invLeft < 10 ? "text-amber-600" : "text-green-600"}`}>
                              Inventory left: {invLeft} units
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{alert.stockQty} units</p>
                        <p className="text-xs text-muted-foreground">Min: {alert.minStockQty}</p>
                        {alert.lastUpdated && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(alert.lastUpdated).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </section>
    </div>
  );
}
