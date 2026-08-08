"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
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
} from "@repo/ui";
import { Package, AlertTriangle, CheckCircle2, XCircle, Plus, Pencil } from "lucide-react";
import {
  useStockEntries,
  usePartners,
  useCreateStock,
  useUpdateStock,
} from "../../hooks/useKpt";

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
  type: "DISTRIBUTOR" | "DEALER" | "RETAILER";
}

const fmt = (n: number) => `₹${(n / 100000).toFixed(1)} L`;

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ElementType; label: string }
> = {
  HEALTHY: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Healthy" },
  LOW: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Low Stock" },
  CRITICAL: { color: "bg-red-100 text-red-600", icon: AlertTriangle, label: "Critical" },
  OUT_OF_STOCK: { color: "bg-gray-200 text-gray-600", icon: XCircle, label: "Out of Stock" },
};

interface StockFormState {
  partnerId: string;
  sku: string;
  productName: string;
  category: string;
  stockQty: string;
  minStockQty: string;
  unitPrice: string;
}

const EMPTY_FORM: StockFormState = {
  partnerId: "",
  sku: "",
  productName: "",
  category: "",
  stockQty: "",
  minStockQty: "",
  unitPrice: "",
};

function AddStockDialog({
  partners,
  onCreate,
  isPending,
}: {
  partners: ChannelPartner[];
  onCreate: (form: StockFormState) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StockFormState>(EMPTY_FORM);

  function set(field: keyof StockFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate(form);
    setOpen(false);
    setForm(EMPTY_FORM);
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
          <DialogTitle>Add Stock Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Distributor Partner</Label>
            <Select value={form.partnerId} onValueChange={(v) => set("partnerId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select distributor" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                required
                placeholder="e.g. AG-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Power Tools"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Product Name</Label>
            <Input
              value={form.productName}
              onChange={(e) => set("productName", e.target.value)}
              required
              placeholder="e.g. Angle Grinder 100mm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Stock Qty</Label>
              <Input
                type="number"
                value={form.stockQty}
                onChange={(e) => set("stockQty", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min Qty</Label>
              <Input
                type="number"
                value={form.minStockQty}
                onChange={(e) => set("minStockQty", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price (₹)</Label>
              <Input
                type="number"
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
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
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DistributorStockPage() {
  const { data: stockData, isLoading: loadingStock } = useStockEntries({ limit: 100 });
  const { data: partnersData, isLoading: loadingPartners } = usePartners({
    type: "DISTRIBUTOR",
    limit: 50,
  });
  const createStock = useCreateStock();
  const updateStock = useUpdateStock();

  if (loadingStock || loadingPartners) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const allStock: StockEntry[] = stockData?.data ?? [];
  const partners: ChannelPartner[] = partnersData?.data ?? [];

  // Build partner lookup
  const partnerMap = new Map<number, ChannelPartner>(partners.map((p) => [p.id, p]));

  // Filter to distributor partner IDs only
  const distributorIds = new Set(partners.map((p) => p.id));
  const stock = allStock.filter((s) => distributorIds.has(s.partnerId));

  const healthy = stock.filter((s) => s.stockStatus === "HEALTHY").length;
  const low = stock.filter((s) => s.stockStatus === "LOW").length;
  const critical = stock.filter((s) => s.stockStatus === "CRITICAL").length;
  const outOfStock = stock.filter((s) => s.stockStatus === "OUT_OF_STOCK").length;

  function handleCreate(form: StockFormState) {
    createStock.mutate({
      partnerId: Number(form.partnerId),
      sku: form.sku,
      productName: form.productName,
      category: form.category,
      stockQty: Number(form.stockQty),
      minStockQty: Number(form.minStockQty),
      unitPrice: Number(form.unitPrice) || 0,
    });
  }

  function handleUpdate(id: number, qty: number) {
    updateStock.mutate({ id, data: { stockQty: qty } });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distributor Stock Visibility</h1>
          <p className="text-sm text-muted-foreground">
            Real-time stock levels across KPT distributors
          </p>
        </div>
        <AddStockDialog
          partners={partners}
          onCreate={handleCreate}
          isPending={createStock.isPending}
        />
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Healthy", value: healthy, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Low Stock", value: low, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Critical", value: critical, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Out of Stock", value: outOfStock, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className={`h-7 w-7 ${s.color}`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value} SKUs</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
            Stock by Distributor &amp; SKU
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Distributor",
                    "SKU",
                    "Product",
                    "Category",
                    "Qty in Stock",
                    "Min Qty",
                    "Unit Price",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stock.map((row) => {
                  const cfg = (STATUS_CONFIG[row.stockStatus] ?? STATUS_CONFIG['HEALTHY'])!;
                  const StatusIcon = cfg.icon;
                  const partner = partnerMap.get(row.partnerId);
                  return (
                    <tr key={row.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3 text-foreground text-xs">
                        {partner?.name ?? `Partner #${row.partnerId}`}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-primary text-xs">
                        {row.sku}
                      </td>
                      <td className="px-5 py-3 text-foreground">{row.productName}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{row.category}</td>
                      <td className="px-5 py-3 font-bold text-foreground">{row.stockQty}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.minStockQty}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {row.unitPrice ? fmt(row.unitPrice) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 ${cfg.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <EditStockDialog
                          stock={row}
                          onUpdate={(qty) => handleUpdate(row.id, qty)}
                          isPending={updateStock.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No stock entries found for distributors.
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
