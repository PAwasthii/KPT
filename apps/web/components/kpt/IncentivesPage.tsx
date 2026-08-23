"use client";

import { useState, useMemo } from "react";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@repo/ui";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Calculator,
  TrendingUp,
  Wallet,
  Users,
  ArrowUpCircle,
  Eye,
} from "lucide-react";
import {
  useIncentiveSlabs,
  useCreateIncentiveSlab,
  useUpdateIncentiveSlab,
  useDeleteIncentiveSlab,
  usePartners,
  useAllIncentives,
  useCreateIncentive,
  useUpdateIncentive,
} from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncentiveSlab {
  id: number;
  tier: string;
  minSaleAmount: number;
  maxSaleAmount: number | null;
  incentivePercent: number;
  description: string | null;
  isActive: boolean;
}

interface PartnerIncentiveRow {
  id: number;
  partnerId: number;
  period: string;
  salesAmount: number;
  incentivePercent: number;
  incentiveAmount: number;
  adjustment: number;
  netReward: number | null;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "PAID" | "REJECTED";
  remarks: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  partner?: { id: number; name: string; city: string | null; tier: string };
}

// ─── Shared configs ──────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_CONFIG: Record<string, { color: string; badge: string }> = {
  BRONZE: { color: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  SILVER: { color: "border-gray-300 bg-gray-50", badge: "bg-gray-200 text-gray-700" },
  GOLD: { color: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  PLATINUM: { color: "border-violet-300 bg-violet-50", badge: "bg-violet-100 text-violet-700" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PAID: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Paid" },
  APPROVED: { color: "bg-blue-100 text-blue-700", icon: CheckCircle2, label: "Approved" },
  UNDER_REVIEW: { color: "bg-amber-100 text-amber-700", icon: AlertCircle, label: "Under Review" },
  PENDING: { color: "bg-gray-100 text-gray-600", icon: Clock, label: "Pending" },
  REJECTED: { color: "bg-red-100 text-red-600", icon: XCircle, label: "Rejected" },
};

function matchSlab(salesAmount: number, slabs: IncentiveSlab[]): IncentiveSlab | undefined {
  return slabs.find(
    (s) => salesAmount >= s.minSaleAmount && (s.maxSaleAmount == null || salesAmount <= s.maxSaleAmount)
  );
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────

interface SlabFormState {
  tier: string;
  minSaleAmount: string;
  maxSaleAmount: string;
  incentivePercent: string;
  description: string;
}

const EMPTY_SLAB: SlabFormState = {
  tier: "BRONZE",
  minSaleAmount: "",
  maxSaleAmount: "",
  incentivePercent: "",
  description: "",
};

function SlabFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode;
  title: string;
  initial?: SlabFormState;
  onSubmit: (data: SlabFormState) => void;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SlabFormState>(initial ?? EMPTY_SLAB);
  const { symbol } = useCurrency();

  function set(field: keyof SlabFormState, value: string) {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min Sale ({symbol})</Label>
              <Input type="number" value={form.minSaleAmount} onChange={(e) => set("minSaleAmount", e.target.value)} required placeholder="e.g. 500000" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Sale ({symbol})</Label>
              <Input type="number" value={form.maxSaleAmount} onChange={(e) => set("maxSaleAmount", e.target.value)} placeholder="Blank = no cap" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Incentive %</Label>
            <Input type="number" step="0.1" value={form.incentivePercent} onChange={(e) => set("incentivePercent", e.target.value)} required placeholder="e.g. 3.5" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramsTab() {
  const { data, isLoading } = useIncentiveSlabs();
  const createSlab = useCreateIncentiveSlab();
  const updateSlab = useUpdateIncentiveSlab();
  const deleteSlab = useDeleteIncentiveSlab();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) =>
    currency === "INR" ? `${symbol}${(n / 100000).toFixed(1)} L` : `${symbol}${convert(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  const slabs: IncentiveSlab[] = data?.data ?? [];
  const tierOrder = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
  const slabsByTier = tierOrder.reduce<Record<string, IncentiveSlab[]>>((acc, tier) => {
    acc[tier] = slabs.filter((s) => s.tier === tier);
    return acc;
  }, {});

  function handleCreate(form: SlabFormState) {
    createSlab.mutate({
      tier: form.tier,
      minSaleAmount: Number(form.minSaleAmount),
      maxSaleAmount: form.maxSaleAmount ? Number(form.maxSaleAmount) : undefined,
      incentivePercent: Number(form.incentivePercent),
      description: form.description,
    });
  }

  function handleUpdate(id: number, form: SlabFormState) {
    updateSlab.mutate({
      id,
      data: {
        tier: form.tier,
        minSaleAmount: Number(form.minSaleAmount),
        maxSaleAmount: form.maxSaleAmount ? Number(form.maxSaleAmount) : undefined,
        incentivePercent: Number(form.incentivePercent),
        description: form.description,
      },
    });
  }

  function handleDelete(id: number) {
    if (confirm("Delete this incentive slab?")) deleteSlab.mutate(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure tier slabs that determine incentive rates based on monthly sales volume.</p>
        <SlabFormDialog
          title="Add Incentive Slab"
          trigger={<Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Slab</Button>}
          onSubmit={handleCreate}
          isPending={createSlab.isPending}
        />
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tierOrder.map((tier) => {
          const tierSlabs = slabsByTier[tier] ?? [];
          const cfg = TIER_CONFIG[tier]!;
          return (
            <Card key={tier} className={`border-2 ${cfg.color} ${tier === "GOLD" ? "ring-2 ring-primary/30" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${cfg.badge}`}>{TIER_LABEL[tier]}</span>
                  {tier === "GOLD" && (
                    <span className="text-xs font-bold bg-primary text-white rounded-full px-2 py-0.5">Top Tier</span>
                  )}
                </div>
                <CardTitle className="text-base font-bold">{TIER_LABEL[tier]} Tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tierSlabs.length === 0 && <p className="text-xs text-muted-foreground italic">No slabs configured</p>}
                {tierSlabs.map((slab) => {
                  const rangeLabel = slab.maxSaleAmount
                    ? `${fmt(slab.minSaleAmount)} – ${fmt(slab.maxSaleAmount)}`
                    : `${fmt(slab.minSaleAmount)}+`;
                  const editInitial: SlabFormState = {
                    tier: slab.tier,
                    minSaleAmount: String(slab.minSaleAmount),
                    maxSaleAmount: slab.maxSaleAmount ? String(slab.maxSaleAmount) : "",
                    incentivePercent: String(slab.incentivePercent),
                    description: slab.description ?? "",
                  };
                  return (
                    <div key={slab.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-primary">{slab.incentivePercent}%</p>
                        <div className="flex items-center gap-1">
                          <SlabFormDialog
                            title="Edit Slab"
                            trigger={<Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>}
                            initial={editInitial}
                            onSubmit={(form) => handleUpdate(slab.id, form)}
                            isPending={updateSlab.isPending}
                          />
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(slab.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{rangeLabel} / month</p>
                      {slab.description && (
                        <div className="flex items-start gap-1.5 text-xs text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          {slab.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All slabs table */}
      {slabs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">All Incentive Slabs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Tier", "Min Sale", "Max Sale", "Incentive %", "Description", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slabs.map((slab) => {
                    const cfg = TIER_CONFIG[slab.tier]!;
                    const editInitial: SlabFormState = {
                      tier: slab.tier,
                      minSaleAmount: String(slab.minSaleAmount),
                      maxSaleAmount: slab.maxSaleAmount ? String(slab.maxSaleAmount) : "",
                      incentivePercent: String(slab.incentivePercent),
                      description: slab.description ?? "",
                    };
                    return (
                      <tr key={slab.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-6 py-3">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${cfg.badge}`}>{TIER_LABEL[slab.tier]}</span>
                        </td>
                        <td className="px-6 py-3 text-foreground">{fmt(slab.minSaleAmount)}</td>
                        <td className="px-6 py-3 text-foreground">{slab.maxSaleAmount ? fmt(slab.maxSaleAmount) : "No cap"}</td>
                        <td className="px-6 py-3 font-bold text-primary">{slab.incentivePercent}%</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">{slab.description || "—"}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${slab.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {slab.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <SlabFormDialog
                              title="Edit Slab"
                              trigger={<Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>}
                              initial={editInitial}
                              onSubmit={(form) => handleUpdate(slab.id, form)}
                              isPending={updateSlab.isPending}
                            />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(slab.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

// ─── Calculation Dialog ───────────────────────────────────────────────────────

function CalcDialog({ row, onClose }: { row: PartnerIncentiveRow; onClose: () => void }) {
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) =>
    currency === "INR" ? `${symbol}${n.toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;
  const net = row.netReward ?? row.incentiveAmount + (row.adjustment ?? 0);
  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG["PENDING"]!;
  const StatusIcon = cfg.icon;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Calculation Breakdown
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span><span className="font-medium text-foreground">{row.partner?.name ?? `Partner #${row.partnerId}`}</span></span>
          <span>Period: <span className="font-medium text-foreground">{row.period}</span></span>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Eligible Sales</span>
            <span className="font-medium">{fmt(row.salesAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>× Incentive Rate</span>
            <span>{row.incentivePercent}%</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">= Gross Incentive</span>
            <span className="font-semibold">{fmt(row.incentiveAmount)}</span>
          </div>
          {(row.adjustment ?? 0) !== 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>± Adjustment</span>
              <span className={(row.adjustment ?? 0) >= 0 ? "text-green-600" : "text-red-500"}>
                {(row.adjustment ?? 0) >= 0 ? "+" : ""}{fmt(row.adjustment ?? 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">= Net Reward</span>
            <span className="font-bold text-primary">{fmt(net)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${cfg.color}`}>
            <StatusIcon className="h-3 w-3" />{cfg.label}
          </span>
          {row.approvedAt && <span>Approved: {new Date(row.approvedAt).toLocaleDateString()}</span>}
          {row.paidAt && <span>Paid: {new Date(row.paidAt).toLocaleDateString()}</span>}
        </div>
        {row.remarks && (
          <p className="text-xs text-muted-foreground border-t pt-2">{row.remarks}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Record Incentive Dialog ──────────────────────────────────────────────────

interface RecordFormState {
  partnerId: string;
  period: string;
  salesAmount: string;
  incentivePercent: string;
  adjustment: string;
  remarks: string;
}

function RecordIncentiveDialog({ partners, slabs }: { partners: { id: number; name: string }[]; slabs: IncentiveSlab[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RecordFormState>({
    partnerId: "",
    period: currentMonthStr(),
    salesAmount: "",
    incentivePercent: "",
    adjustment: "0",
    remarks: "",
  });
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) =>
    currency === "INR" ? `${symbol}${n.toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;

  const createIncentive = useCreateIncentive(Number(form.partnerId) || 0);

  const salesNum = Number(form.salesAmount) || 0;
  const pctNum = Number(form.incentivePercent) || 0;
  const adjNum = Number(form.adjustment) || 0;
  const gross = salesNum * pctNum / 100;
  const net = gross + adjNum;

  function set(field: keyof RecordFormState, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "salesAmount") {
        const slab = matchSlab(Number(value) || 0, slabs);
        if (slab) next.incentivePercent = String(slab.incentivePercent);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partnerId) return;
    createIncentive.mutate({
      period: form.period,
      salesAmount: salesNum,
      incentivePercent: pctNum,
      adjustment: adjNum,
      remarks: form.remarks || undefined,
    });
    setOpen(false);
    setForm({ partnerId: "", period: currentMonthStr(), salesAmount: "", incentivePercent: "", adjustment: "0", remarks: "" });
  }

  const matchedSlab = matchSlab(salesNum, slabs);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Record Incentive</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Incentive</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Partner</Label>
            <Select value={form.partnerId} onValueChange={(v) => set("partnerId", v)}>
              <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Period (YYYY-MM)</Label>
            <Input value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="e.g. 2026-08" required />
          </div>
          <div className="space-y-1.5">
            <Label>Sales Amount ({symbol})</Label>
            <Input type="number" value={form.salesAmount} onChange={(e) => set("salesAmount", e.target.value)} placeholder="e.g. 2840000" required />
            {matchedSlab && (
              <p className="text-xs text-muted-foreground">
                Matched slab:{" "}
                <span className={`font-medium rounded px-1 ${TIER_CONFIG[matchedSlab.tier]?.badge}`}>
                  {TIER_LABEL[matchedSlab.tier]} ({matchedSlab.incentivePercent}%)
                </span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Incentive %</Label>
              <Input type="number" step="0.1" value={form.incentivePercent} onChange={(e) => set("incentivePercent", e.target.value)} placeholder="Auto from slab" required />
            </div>
            <div className="space-y-1.5">
              <Label>Adjustment ({symbol})</Label>
              <Input type="number" value={form.adjustment} onChange={(e) => set("adjustment", e.target.value)} placeholder="0" />
            </div>
          </div>
          {salesNum > 0 && pctNum > 0 && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs font-mono space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Gross ({salesNum.toLocaleString()} × {pctNum}%)</span>
                <span>{fmt(gross)}</span>
              </div>
              {adjNum !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>± Adjustment</span>
                  <span>{adjNum >= 0 ? "+" : ""}{fmt(adjNum)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Net Reward</span>
                <span className="text-primary">{fmt(net)}</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createIncentive.isPending}>{createIncentive.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tracker Tab ──────────────────────────────────────────────────────────────

type PeriodMode = "all" | "current" | "prev" | "custom";

function TrackerTab() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [customPeriod, setCustomPeriod] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [calcRow, setCalcRow] = useState<PartnerIncentiveRow | null>(null);

  const activePeriod =
    periodMode === "all" ? undefined :
    periodMode === "current" ? currentMonthStr() :
    periodMode === "prev" ? prevMonthStr() :
    customPeriod || undefined;

  const { data: allData, isLoading } = useAllIncentives(
    activePeriod ? { period: activePeriod } : undefined
  );
  const { data: partnersData } = usePartners({ limit: 200 });
  const { data: slabsData } = useIncentiveSlabs();
  const updateIncentive = useUpdateIncentive();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) =>
    currency === "INR" ? `${symbol}${n.toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;
  const fmtShort = (n: number) =>
    currency === "INR" ? `${symbol}${(n / 100000).toFixed(1)} L` : `${symbol}${convert(n).toLocaleString()}`;

  const allRows: PartnerIncentiveRow[] = allData?.data ?? [];
  const partners = partnersData?.data ?? [];
  const slabs: IncentiveSlab[] = slabsData?.data ?? [];

  const cities = useMemo(() => {
    const set = new Set(allRows.map((r) => r.partner?.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (partnerSearch && !r.partner?.name.toLowerCase().includes(partnerSearch.toLowerCase())) return false;
      if (cityFilter !== "all" && r.partner?.city !== cityFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [allRows, partnerSearch, cityFilter, statusFilter]);

  // KPI computations
  const kpis = useMemo(() => {
    const eligible = filtered.filter((r) => r.status !== "REJECTED");
    const totalSales = eligible.reduce((s, r) => s + r.salesAmount, 0);
    const totalGross = eligible.reduce((s, r) => s + r.incentiveAmount, 0);
    const totalAdj = eligible.reduce((s, r) => s + (r.adjustment ?? 0), 0);
    const totalNet = eligible.reduce((s, r) => s + (r.netReward ?? r.incentiveAmount + (r.adjustment ?? 0)), 0);
    const pendingCount = filtered.filter((r) => r.status === "UNDER_REVIEW").length;
    const paidNet = filtered.filter((r) => r.status === "PAID").reduce((s, r) => s + (r.netReward ?? r.incentiveAmount + (r.adjustment ?? 0)), 0);
    return { totalSales, totalGross, totalAdj, totalNet, pendingCount, paidNet };
  }, [filtered]);

  function mutate(id: number, data: Record<string, any>) {
    updateIncentive.mutate({ id, data });
  }

  const kpiCards = [
    { label: "Total Eligible Sales", value: fmtShort(kpis.totalSales), icon: TrendingUp, color: "text-blue-600" },
    { label: "Total Gross Incentive", value: fmtShort(kpis.totalGross), icon: Calculator, color: "text-amber-600" },
    { label: "Total Adjustments", value: fmtShort(kpis.totalAdj), icon: ArrowUpCircle, color: "text-purple-600" },
    { label: "Total Net Rewards", value: fmtShort(kpis.totalNet), icon: Wallet, color: "text-green-600" },
    { label: "Pending Approval", value: String(kpis.pendingCount), icon: AlertCircle, color: "text-amber-500" },
    { label: "Paid Rewards", value: fmtShort(kpis.paidNet), icon: CheckCircle2, color: "text-green-700" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border">
            <CardContent className="pt-4 pb-3 px-4">
              <k.icon className={`h-4 w-4 mb-1.5 ${k.color}`} />
              <p className="text-lg font-bold text-foreground leading-tight">{k.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Record button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period selector */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(["all", "current", "prev", "custom"] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={`px-3 py-1.5 transition-colors ${periodMode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              {m === "all" ? "All" : m === "current" ? "This Month" : m === "prev" ? "Last Month" : "Custom"}
            </button>
          ))}
        </div>
        {periodMode === "custom" && (
          <Input
            value={customPeriod}
            onChange={(e) => setCustomPeriod(e.target.value)}
            placeholder="YYYY-MM"
            className="h-8 w-32 text-sm"
          />
        )}
        <Input
          value={partnerSearch}
          onChange={(e) => setPartnerSearch(e.target.value)}
          placeholder="Search partner…"
          className="h-8 w-44 text-sm"
        />
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <RecordIncentiveDialog partners={partners} slabs={slabs} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Partner", "City", "Period", "Achieved Slab", "Eligible Sales", "Rate", "Gross", "Adj.", "Net Reward", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">No records found for the selected period / filters.</td>
                  </tr>
                )}
                {filtered.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG["PENDING"]!;
                  const StatusIcon = cfg.icon;
                  const slab = matchSlab(row.salesAmount, slabs);
                  const slabCfg = slab ? TIER_CONFIG[slab.tier] : undefined;
                  const net = row.netReward ?? row.incentiveAmount + (row.adjustment ?? 0);
                  return (
                    <tr key={row.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.partner?.name ?? `#${row.partnerId}`}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.partner?.city ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.period}</td>
                      <td className="px-4 py-3">
                        {slab && slabCfg ? (
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${slabCfg.badge}`}>
                            {TIER_LABEL[slab.tier]} ({slab.incentivePercent}%)
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">{fmt(row.salesAmount)}</td>
                      <td className="px-4 py-3 text-foreground">{row.incentivePercent}%</td>
                      <td className="px-4 py-3 text-foreground">{fmt(row.incentiveAmount)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {(row.adjustment ?? 0) !== 0 ? (
                          <span className={(row.adjustment ?? 0) >= 0 ? "text-green-600" : "text-red-500"}>
                            {(row.adjustment ?? 0) >= 0 ? "+" : ""}{fmt(row.adjustment ?? 0)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">{fmt(net)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => setCalcRow(row)}
                            title="View calculation"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {row.status === "PENDING" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled={updateIncentive.isPending}
                              onClick={() => mutate(row.id, { status: "UNDER_REVIEW" })}>
                              Submit
                            </Button>
                          )}
                          {row.status === "UNDER_REVIEW" && (
                            <>
                              <Button size="sm" className="h-7 text-xs px-2" disabled={updateIncentive.isPending}
                                onClick={() => mutate(row.id, { status: "APPROVED" })}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50" disabled={updateIncentive.isPending}
                                onClick={() => mutate(row.id, { status: "REJECTED" })}>
                                Reject
                              </Button>
                            </>
                          )}
                          {row.status === "APPROVED" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled={updateIncentive.isPending}
                              onClick={() => mutate(row.id, { status: "PAID" })}>
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Calculation dialog */}
      {calcRow && (
        <Dialog open={!!calcRow} onOpenChange={(open) => { if (!open) setCalcRow(null); }}>
          <CalcDialog row={calcRow} onClose={() => setCalcRow(null)} />
        </Dialog>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IncentivesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incentives &amp; Rewards</h1>
        <p className="text-sm text-muted-foreground">Manage KPT channel partner incentive programs and track reward status.</p>
      </div>
      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">
            <Users className="h-4 w-4 mr-1.5" />
            Incentive Programs
          </TabsTrigger>
          <TabsTrigger value="tracker">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Incentive Tracker
          </TabsTrigger>
        </TabsList>
        <TabsContents>
          <TabsContent value="programs">
            <div className="pt-4">
              <ProgramsTab />
            </div>
          </TabsContent>
          <TabsContent value="tracker">
            <div className="pt-4">
              <TrackerTab />
            </div>
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
