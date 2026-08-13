"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
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
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Search,
} from "lucide-react";
import {
  useInventoryItems,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useBulkImportInventory,
} from "../../hooks/useKpt";

interface InventoryItem {
  id: number;
  productName: string;
  sku: string;
  category: string;
  description: string | null;
  totalQty: number;
  minStockQty: number;
  reorderQty: number;
  unitPrice: number;
  stockStatus: "HEALTHY" | "LOW" | "CRITICAL" | "OUT_OF_STOCK";
  lastUpdated: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  HEALTHY: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Healthy" },
  LOW: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Low Stock" },
  CRITICAL: { color: "bg-red-100 text-red-600", icon: AlertTriangle, label: "Critical" },
  OUT_OF_STOCK: { color: "bg-gray-200 text-gray-600", icon: XCircle, label: "Out of Stock" },
};

const CATEGORIES = ["Grinders", "Drills", "Hammers", "Saws", "Sanders", "Others"];

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

interface ItemFormState {
  productName: string;
  sku: string;
  category: string;
  description: string;
  totalQty: string;
  minStockQty: string;
  reorderQty: string;
  unitPrice: string;
}

const EMPTY_FORM: ItemFormState = {
  productName: "",
  sku: "",
  category: "",
  description: "",
  totalQty: "",
  minStockQty: "10",
  reorderQty: "20",
  unitPrice: "",
};

function ItemForm({
  form,
  onChange,
}: {
  form: ItemFormState;
  onChange: (field: keyof ItemFormState, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Product Name *</Label>
        <Input
          placeholder="KPT 100mm Angle Grinder"
          value={form.productName}
          onChange={(e) => onChange("productName", e.target.value)}
        />
      </div>
      <div>
        <Label>SKU *</Label>
        <Input
          placeholder="KPT-AG4-001"
          value={form.sku}
          onChange={(e) => onChange("sku", e.target.value)}
        />
      </div>
      <div>
        <Label>Category *</Label>
        <Select value={form.category} onValueChange={(v) => onChange("category", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <Input
          placeholder="Optional product description"
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
        />
      </div>
      <div>
        <Label>Total Qty *</Label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={form.totalQty}
          onChange={(e) => onChange("totalQty", e.target.value)}
        />
      </div>
      <div>
        <Label>Unit Price (₹) *</Label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={form.unitPrice}
          onChange={(e) => onChange("unitPrice", e.target.value)}
        />
      </div>
      <div>
        <Label>Min Stock Qty</Label>
        <Input
          type="number"
          min={0}
          value={form.minStockQty}
          onChange={(e) => onChange("minStockQty", e.target.value)}
        />
      </div>
      <div>
        <Label>Reorder Qty</Label>
        <Input
          type="number"
          min={0}
          value={form.reorderQty}
          onChange={(e) => onChange("reorderQty", e.target.value)}
        />
      </div>
    </div>
  );
}

function AddStockDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const createItem = useCreateInventoryItem();

  const handleChange = useCallback((field: keyof ItemFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!form.productName || !form.sku || !form.category || !form.totalQty || !form.unitPrice) return;
    await createItem.mutateAsync({
      productName: form.productName,
      sku: form.sku,
      category: form.category,
      description: form.description || undefined,
      totalQty: Number(form.totalQty),
      minStockQty: Number(form.minStockQty),
      reorderQty: Number(form.reorderQty),
      unitPrice: Number(form.unitPrice),
    });
    setForm(EMPTY_FORM);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Stock Item</DialogTitle>
        </DialogHeader>
        <ItemForm form={form} onChange={handleChange} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createItem.isPending || !form.productName || !form.sku || !form.category || !form.totalQty || !form.unitPrice}
          >
            {createItem.isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItemFormState>({
    productName: item.productName,
    sku: item.sku,
    category: item.category,
    description: item.description ?? "",
    totalQty: String(item.totalQty),
    minStockQty: String(item.minStockQty),
    reorderQty: String(item.reorderQty),
    unitPrice: String(item.unitPrice),
  });
  const updateItem = useUpdateInventoryItem();

  const handleChange = useCallback((field: keyof ItemFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    await updateItem.mutateAsync({
      id: item.id,
      data: {
        productName: form.productName,
        sku: form.sku,
        category: form.category,
        description: form.description || null,
        totalQty: Number(form.totalQty),
        minStockQty: Number(form.minStockQty),
        reorderQty: Number(form.reorderQty),
        unitPrice: Number(form.unitPrice),
      },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Stock Item</DialogTitle>
        </DialogHeader>
        <ItemForm form={form} onChange={handleChange} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateItem.isPending}>
            {updateItem.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const deleteItem = useDeleteInventoryItem();

  const handleDelete = async () => {
    await deleteItem.mutateAsync(item.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Item</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-foreground">{item.productName}</span> ({item.sku}) from inventory?
          This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteItem.isPending}>
            {deleteItem.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportInventory();

  const HEADER_MAP: Record<string, string> = {
    "sku": "sku",
    "product name": "productName",
    "productname": "productName",
    "category": "category",
    "description": "description",
    "qty": "totalQty",
    "total qty": "totalQty",
    "totalqty": "totalQty",
    "quantity": "totalQty",
    "min qty": "minStockQty",
    "min stock qty": "minStockQty",
    "minstockqty": "minStockQty",
    "reorder qty": "reorderQty",
    "reorderqty": "reorderQty",
    "unit price": "unitPrice",
    "unitprice": "unitPrice",
    "price": "unitPrice",
  };

  const parseFile = (file: File) => {
    setParseError("");
    setPreview(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0] ?? "";
        const ws = wb.Sheets[sheetName];
        if (!ws) { setParseError("Could not read sheet from file."); return; }
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          setParseError("File must have a header row and at least one data row.");
          return;
        }

        const headers = (rows[0] as string[]).map((h) => String(h ?? "").toLowerCase().trim());
        const mapped = rows.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            const field = HEADER_MAP[h];
            if (field) obj[field] = row[i] ?? "";
          });
          return obj;
        }).filter((r) => r.sku || r.productName);

        if (mapped.length === 0) {
          setParseError("No valid rows found. Check that SKU and Product Name columns exist.");
          return;
        }

        setPreview(mapped);
      } catch {
        setParseError("Could not parse file. Please use a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    await bulkImport.mutateAsync(preview);
    setPreview(null);
    setFileName("");
    setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setFileName("");
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["SKU", "Product Name", "Category", "Description", "Qty", "Min Qty", "Reorder Qty", "Unit Price"],
      ["KPT-AG4-001", "KPT 100mm Angle Grinder", "Grinders", "670W angle grinder", 50, 20, 30, 2850],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "kpt_inventory_template.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-1" /> Import Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Stock from Excel / CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an <span className="font-medium">.xlsx</span> or <span className="font-medium">.csv</span> file.
            Existing SKUs will be updated; new SKUs will be created.
          </p>

          <Button size="sm" variant="ghost" className="text-xs underline p-0 h-auto" onClick={downloadTemplate}>
            Download template
          </Button>

          <div>
            <Label>Select File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {parseError && (
            <p className="text-sm text-red-600">{parseError}</p>
          )}

          {preview && (
            <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
              <p className="font-medium">Ready to import from <span className="text-primary">{fileName}</span></p>
              <p className="text-muted-foreground">{preview.length} row{preview.length !== 1 ? "s" : ""} detected</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview || bulkImport.isPending}>
            {bulkImport.isPending ? "Importing…" : `Import ${preview ? preview.length + " items" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportToExcel(items: InventoryItem[]) {
  const rows = items.map((item) => ({
    SKU: item.sku,
    "Product Name": item.productName,
    Category: item.category,
    Description: item.description ?? "",
    "Total Qty": item.totalQty,
    "Min Qty": item.minStockQty,
    "Reorder Qty": item.reorderQty,
    "Unit Price (₹)": item.unitPrice,
    Status: STATUS_CONFIG[item.stockStatus]?.label ?? item.stockStatus,
    "Last Updated": new Date(item.lastUpdated).toLocaleDateString("en-IN"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 30 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KPT Inventory");
  XLSX.writeFile(wb, `kpt_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function InventoryManagementPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useInventoryItems({
    limit: 500,
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    stockStatus: statusFilter !== "all" ? statusFilter : undefined,
  });

  const items: InventoryItem[] = data?.data ?? [];

  const totalValue = items.reduce((sum, i) => sum + i.totalQty * i.unitPrice, 0);
  const lowCount = items.filter((i) => i.stockStatus === "LOW").length;
  const criticalCount = items.filter((i) => i.stockStatus === "CRITICAL").length;
  const outCount = items.filter((i) => i.stockStatus === "OUT_OF_STOCK").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Master catalog of all KPT products</p>
        </div>
        <div className="flex gap-2">
          <ImportDialog />
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToExcel(items)}
            disabled={items.length === 0}
          >
            <Download className="h-4 w-4 mr-1" /> Export Excel
          </Button>
          <AddStockDialog />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low / Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{lowCount + criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{outCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search SKU, product, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="HEALTHY">Healthy</SelectItem>
            <SelectItem value="LOW">Low Stock</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Product Name</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Min Qty</th>
              <th className="px-4 py-3 text-right font-medium">Reorder Qty</th>
              <th className="px-4 py-3 text-right font-medium">Unit Price</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No inventory items found. Add your first item or import from Excel.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const status = STATUS_CONFIG[item.stockStatus];
                const StatusIcon = status?.icon ?? Package;
                return (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{item.sku}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={item.productName}>
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate" title={item.description ?? ""}>
                      {item.description || <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{item.totalQty}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{item.minStockQty}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{item.reorderQty}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status?.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <EditItemDialog item={item} />
                        <DeleteButton item={item} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && items.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
