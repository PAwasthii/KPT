"use client";

import { useState, useRef } from "react";
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
import { Users, MapPin, TrendingUp, Phone, Mail, Plus, Pencil, Upload, Download } from "lucide-react";
import {
  usePartners,
  useCreatePartner,
  useUpdatePartner,
  useBulkImportPartners,
} from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";
import { GstinInput } from "../gstin-input";
import type { GstDetails } from "../../lib/api/types";

interface ChannelPartner {
  id: number;
  code: string;
  name: string;
  type: "DISTRIBUTOR" | "DEALER" | "RETAILER";
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  region: string;
  currentMonthSales: number;
  ytdSales: number;
  targetAmount: number;
  creditLimit: number;
  outstandingPayment: number;
}

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

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  SUSPENDED: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

const TYPE_LABEL: Record<string, string> = {
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
  RETAILER: "Retailer",
};

interface PartnerFormState {
  name: string;
  code: string;
  type: string;
  tier: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  state: string;
  targetAmount: string;
  gstin: string;
}

const EMPTY_FORM: PartnerFormState = {
  name: "",
  code: "",
  type: "DEALER",
  tier: "BRONZE",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  city: "",
  state: "",
  targetAmount: "",
  gstin: "",
};

function PartnerFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode;
  title: string;
  initial?: PartnerFormState;
  onSubmit: (data: PartnerFormState) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PartnerFormState>(initial ?? EMPTY_FORM);
  const { symbol } = useCurrency();

  function set(field: keyof PartnerFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                  <SelectItem value="DEALER">Dealer</SelectItem>
                  <SelectItem value="RETAILER">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contact Name</Label>
            <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <GstinInput
              value={form.gstin}
              onChange={(v) => set("gstin", v)}
              onVerified={(d: GstDetails) => {
                setForm((f) => ({
                  ...f,
                  name: f.name || d.legalName,
                  city: f.city || d.city || "",
                  state: f.state || d.state || "",
                }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target Amount ({symbol})</Label>
            <Input
              type="number"
              value={form.targetAmount}
              onChange={(e) => set("targetAmount", e.target.value)}
              placeholder="e.g. 3000000"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PARTNER_HEADER_MAP: Record<string, string> = {
  "name": "name",
  "partner name": "name",
  "code": "code",
  "partner code": "code",
  "type": "type",
  "partner type": "type",
  "tier": "tier",
  "contact name": "contactName",
  "contactname": "contactName",
  "contact": "contactName",
  "phone": "contactPhone",
  "contact phone": "contactPhone",
  "mobile": "contactPhone",
  "email": "contactEmail",
  "contact email": "contactEmail",
  "city": "city",
  "state": "state",
  "region": "region",
  "gstin": "gstin",
  "gst": "gstin",
  "gst number": "gstin",
  "target": "targetAmount",
  "target amount": "targetAmount",
  "targetamount": "targetAmount",
};

function ImportPartnersDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportPartners();

  const parseFile = (file: File) => {
    setParseError("");
    setPreview(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
        if (!ws) { setParseError("Could not read sheet from file."); return; }
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) { setParseError("File must have a header row and at least one data row."); return; }

        const headers = (rows[0] as string[]).map((h) => String(h ?? "").toLowerCase().trim());
        const mapped = rows.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            const field = PARTNER_HEADER_MAP[h];
            if (field) obj[field] = row[i] ?? "";
          });
          return obj;
        }).filter((r) => r.name);

        if (mapped.length === 0) {
          setParseError("No valid rows found. Check that a 'Name' column exists.");
          return;
        }
        setPreview(mapped);
      } catch {
        setParseError("Could not parse file. Please use a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
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
      ["Name", "Code", "Type", "Tier", "Contact Name", "Phone", "Email", "City", "State", "GSTIN", "Target Amount"],
      ["Shree Ganesh Tools", "DIST-MH-001", "DISTRIBUTOR", "GOLD", "Suresh Patil", "9823456789", "suresh@sgtools.in", "Pune", "Maharashtra", "27AABCS1429B1Z5", 3600000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partners");
    XLSX.writeFile(wb, "kpt_partners_template.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> Import Partners
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Partners from Excel / CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an <span className="font-medium">.xlsx</span> or <span className="font-medium">.csv</span> file.
            Existing partners (matched by Code or Name) will be updated; new ones will be created.
          </p>
          <Button size="sm" variant="ghost" className="text-xs underline p-0 h-auto" onClick={downloadTemplate}>
            <Download className="h-3 w-3 mr-1" /> Download template
          </Button>
          <div>
            <Label>Select File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
              className="cursor-pointer"
            />
          </div>
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          {preview && (
            <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
              <p className="font-medium">Ready to import from <span className="text-primary">{fileName}</span></p>
              <p className="text-muted-foreground">{preview.length} partner{preview.length !== 1 ? "s" : ""} detected</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview || bulkImport.isPending}>
            {bulkImport.isPending ? "Importing…" : `Import ${preview ? preview.length + " partners" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChannelPartnersPage() {
  const { data, isLoading } = usePartners({ limit: 100 });
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) => currency === 'INR'
    ? `${symbol}${(n / 100000).toFixed(1)} L`
    : `${symbol}${convert(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="rounded-lg border divide-y">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const partners: ChannelPartner[] = data?.data ?? [];
  const distributors = partners.filter((p) => p.type === "DISTRIBUTOR").length;
  const dealers = partners.filter((p) => p.type === "DEALER").length;

  const avgAchievement =
    partners.length > 0
      ? Math.round(
          partners.reduce((sum, p) => {
            const pct = p.targetAmount > 0 ? (p.ytdSales / p.targetAmount) * 100 : 0;
            return sum + pct;
          }, 0) / partners.length
        )
      : 0;

  function handleCreate(form: PartnerFormState) {
    createPartner.mutate({
      ...form,
      targetAmount: Number(form.targetAmount) || 0,
      gstin: form.gstin || undefined,
    });
  }

  function handleUpdate(id: number, form: PartnerFormState) {
    updatePartner.mutate({
      id,
      data: {
        ...form,
        targetAmount: Number(form.targetAmount) || 0,
        gstin: form.gstin || undefined,
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channel Partners</h1>
          <p className="text-sm text-muted-foreground">Manage your KPT distribution network</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPartnersDialog />
          <PartnerFormDialog
          title="Add Channel Partner"
          trigger={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Partner
            </Button>
          }
          onSubmit={handleCreate}
          isPending={createPartner.isPending}
        />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Partners", value: partners.length, icon: Users, color: "text-primary" },
          { label: "Distributors", value: distributors, icon: MapPin, color: "text-blue-600" },
          { label: "Dealers", value: dealers, icon: Users, color: "text-purple-600" },
          { label: "Avg Achievement", value: `${avgAchievement}%`, icon: TrendingUp, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partners table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
            All Channel Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Partner", "Type", "City / State", "MTD Sales", "YTD Sales", "Target", "Achievement", "Tier", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map((p) => {
                  const pct =
                    p.targetAmount > 0
                      ? Math.min(100, Math.round((p.ytdSales / p.targetAmount) * 100))
                      : 0;
                  const pctColor =
                    pct >= 90 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-400";
                  const pctText =
                    pct >= 90
                      ? "text-green-600"
                      : pct >= 75
                      ? "text-amber-600"
                      : "text-red-500";

                  const editInitial: PartnerFormState = {
                    name: p.name,
                    code: p.code,
                    type: p.type,
                    tier: p.tier,
                    contactName: p.contactName,
                    contactPhone: p.contactPhone,
                    contactEmail: p.contactEmail,
                    city: p.city,
                    state: p.state,
                    targetAmount: String(p.targetAmount),
                    gstin: (p as any).gstin ?? "",
                  };

                  return (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 min-w-[180px]">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-muted-foreground">
                          {p.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {p.contactPhone}
                            </span>
                          )}
                          {p.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {p.contactEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {[p.city, p.state].filter(Boolean).join(", ")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {fmt(p.currentMonthSales)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {fmt(p.ytdSales)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmt(p.targetAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${pctText}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_STYLE[p.tier] ?? ""}`}
                        >
                          {TIER_LABEL[p.tier] ?? p.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[p.status] ?? ""}`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PartnerFormDialog
                          title="Edit Partner"
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                          initial={editInitial}
                          onSubmit={(form) => handleUpdate(p.id, form)}
                          isPending={updatePartner.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No partners found.
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
