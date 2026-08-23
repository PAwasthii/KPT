"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Label,
  Input,
} from "@repo/ui";
import { Package, AlertTriangle, CheckCircle2, XCircle, Plus, Pencil, Store } from "lucide-react";
import {
  useStockEntries,
  usePartners,
  useCreateStock,
  useUpdateStock,
  useInventoryItems,
} from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

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
  inventoryItem?: { id: number; totalQty: number } | null;
}

interface ChannelPartner {
  id: number;
  name: string;
  type: string;
}

interface InventoryItem {
  id: number;
  productName: string;
  sku: string;
  category: string;
  totalQty: number;
  minStockQty: number;
  unitPrice: number;
  stockStatus: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  HEALTHY: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Healthy" },
  LOW: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Low Stock" },
  CRITICAL: { color: "bg-red-100 text-red-600", icon: AlertTriangle, label: "Critical" },
  OUT_OF_STOCK: { color: "bg-gray-200 text-gray-600", icon: XCircle, label: "Out of Stock" },
};

function AddStockDialog({
  partners,
  inventoryItems,
  onCreate,
  isPending,
}: {
  partners: ChannelPartner[];
  inventoryItems: InventoryItem[];
  onCreate: (data: { partnerId: number; inventoryItemId: number; stockQty: number; minStockQty: number }) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minStockQty, setMinStockQty] = useState("5");
  const { symbol, convert } = useCurrency();

  const selectedItem = inventoryItems.find((i) => String(i.id) === inventoryItemId);
  const available = selectedItem?.totalQty ?? 0;
  const qtyNum = Number(stockQty);
  const qtyValid = stockQty !== "" && qtyNum >= 0 && qtyNum <= available;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerId || !inventoryItemId || !qtyValid) return;
    onCreate({
      partnerId: Number(partnerId),
      inventoryItemId: Number(inventoryItemId),
      stockQty: qtyNum,
      minStockQty: Number(minStockQty),
    });
    setOpen(false);
    setPartnerId(""); setInventoryItemId(""); setStockQty(""); setMinStockQty("5");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispatch Stock to Dealer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Dealer Partner</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select dealer" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Product (from Inventory)</Label>
            <Select value={inventoryItemId} onValueChange={(v) => { setInventoryItemId(v); setStockQty(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)} disabled={i.totalQty === 0}>
                    {i.productName} [{i.sku}] — {i.totalQty === 0 ? "Out of stock" : `${i.totalQty} available`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                Category: <span className="font-medium">{selectedItem.category}</span> · Unit price: <span className="font-medium">{symbol}{convert(selectedItem.unitPrice).toLocaleString()}</span> · Available in inventory: <span className={`font-semibold ${available === 0 ? "text-red-600" : available < 10 ? "text-amber-600" : "text-green-600"}`}>{available}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dispatch Qty {selectedItem && <span className="text-muted-foreground text-xs">(max {available})</span>}</Label>
              <Input
                type="number"
                min={0}
                max={available}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                disabled={!selectedItem}
                required
              />
              {stockQty !== "" && !qtyValid && (
                <p className="text-xs text-red-600">Exceeds available inventory ({available})</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Min Qty Alert</Label>
              <Input
                type="number"
                min={0}
                value={minStockQty}
                onChange={(e) => setMinStockQty(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !partnerId || !inventoryItemId || !qtyValid}>
              {isPending ? "Dispatching…" : "Dispatch Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStockDialog({
  stock,
  onUpdate,
  isPending,
}: {
  stock: StockEntry;
  onUpdate: (qty: number) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(stock.stockQty));
  const available = stock.inventoryItem?.totalQty ?? null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onUpdate(Number(qty));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stock Qty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stock.productName}</span> ({stock.sku})
          </p>
          <div className="space-y-1.5">
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
            {available !== null && Number(qty) > stock.stockQty && (
              <p className="text-xs text-muted-foreground">
                Increasing by {Number(qty) - stock.stockQty} · Available in inventory: {available}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DealerStockPage() {
  const { data: stockData, isLoading: loadingStock } = useStockEntries({ limit: 100 });
  const { data: partnersData, isLoading: loadingPartners } = usePartners({ type: "DEALER", limit: 50 });
  const { data: inventoryData, isLoading: loadingInventory } = useInventoryItems({ limit: 500 });
  const createStock = useCreateStock();
  const updateStock = useUpdateStock();
  const { symbol, currency: globalCurrency, currencies, updateCurrency, convert } = useCurrency();

  const fmt = (n: number) => `${symbol}${convert(n).toLocaleString()}`;

  if (loadingStock || loadingPartners || loadingInventory) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  const allStock: StockEntry[] = stockData?.data ?? [];
  const partners: ChannelPartner[] = partnersData?.data ?? [];
  const inventoryItems: InventoryItem[] = inventoryData?.data ?? [];

  const partnerMap = new Map<number, ChannelPartner>(partners.map((p) => [p.id, p]));
  const dealerIds = new Set(partners.map((p) => p.id));
  const stock = allStock.filter((s) => dealerIds.has(s.partnerId));

  const healthy = stock.filter((s) => s.stockStatus === "HEALTHY").length;
  const low = stock.filter((s) => s.stockStatus === "LOW").length;
  const critical = stock.filter((s) => s.stockStatus === "CRITICAL").length;
  const outOfStock = stock.filter((s) => s.stockStatus === "OUT_OF_STOCK").length;

  function handleCreate(data: { partnerId: number; inventoryItemId: number; stockQty: number; minStockQty: number }) {
    createStock.mutate({
      partnerId: data.partnerId,
      inventoryItemId: data.inventoryItemId,
      stockQty: data.stockQty,
      minStockQty: data.minStockQty,
    } as any);
  }

  function handleUpdate(id: number, qty: number) {
    updateStock.mutate({ id, data: { stockQty: qty } });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-2xl font-bold text-foreground">Dealer Stock Management</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              <Store className="h-3.5 w-3.5" /> DEALER
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Stock dispatched to KPT dealers</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={globalCurrency} onValueChange={updateCurrency}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddStockDialog
            partners={partners}
            inventoryItems={inventoryItems}
            onCreate={handleCreate}
            isPending={createStock.isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Healthy", value: healthy, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Low Stock", value: low, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Critical", value: critical, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Out of Stock", value: outOfStock, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Store className={`h-7 w-7 ${s.color}`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value} SKUs</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <Store className="h-4 w-4" /> Stock by Dealer &amp; SKU
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Dealer", "SKU", "Product", "Category", "Qty at Partner", "Inventory Left", "Min Qty", "Unit Price", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stock.map((row) => {
                  const cfg = STATUS_CONFIG[row.stockStatus] ?? STATUS_CONFIG['HEALTHY']!;
                  const StatusIcon = cfg.icon;
                  const partner = partnerMap.get(row.partnerId);
                  return (
                    <tr key={row.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3 text-foreground text-xs">{partner?.name ?? `Partner #${row.partnerId}`}</td>
                      <td className="px-5 py-3 font-mono font-bold text-primary text-xs">{row.sku}</td>
                      <td className="px-5 py-3 text-foreground">{row.productName}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{row.category}</td>
                      <td className="px-5 py-3 font-bold text-foreground">{row.stockQty}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.inventoryItem != null ? (
                          <span className={row.inventoryItem.totalQty === 0 ? "text-red-500 font-medium" : row.inventoryItem.totalQty < 10 ? "text-amber-600 font-medium" : "text-green-600"}>
                            {row.inventoryItem.totalQty}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{row.minStockQty}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{row.unitPrice ? fmt(row.unitPrice) : "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <EditStockDialog stock={row} onUpdate={(qty) => handleUpdate(row.id, qty)} isPending={updateStock.isPending} />
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No stock dispatched to dealers yet.
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
