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
import { CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useIncentiveSlabs,
  useCreateIncentiveSlab,
  useUpdateIncentiveSlab,
  useDeleteIncentiveSlab,
} from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

interface IncentiveSlab {
  id: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  minSaleAmount: number;
  maxSaleAmount: number | null;
  incentivePercent: number;
  description: string;
  isActive: boolean;
}

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_CONFIG: Record<
  string,
  { color: string; badge: string; borderColor: string }
> = {
  BRONZE: {
    color: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    borderColor: "border-orange-200",
  },
  SILVER: {
    color: "border-gray-300 bg-gray-50",
    badge: "bg-gray-200 text-gray-700",
    borderColor: "border-gray-300",
  },
  GOLD: {
    color: "border-amber-300 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    borderColor: "border-amber-300",
  },
  PLATINUM: {
    color: "border-violet-300 bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
    borderColor: "border-violet-300",
  },
};

interface SlabFormState {
  tier: string;
  minSaleAmount: string;
  maxSaleAmount: string;
  incentivePercent: string;
  description: string;
}

const EMPTY_FORM: SlabFormState = {
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
  const [form, setForm] = useState<SlabFormState>(initial ?? EMPTY_FORM);
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <Label>Min Sale Amount ({symbol})</Label>
              <Input
                type="number"
                value={form.minSaleAmount}
                onChange={(e) => set("minSaleAmount", e.target.value)}
                required
                placeholder="e.g. 500000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Sale Amount ({symbol})</Label>
              <Input
                type="number"
                value={form.maxSaleAmount}
                onChange={(e) => set("maxSaleAmount", e.target.value)}
                placeholder="Leave blank for no cap"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Incentive Percent (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.incentivePercent}
              onChange={(e) => set("incentivePercent", e.target.value)}
              required
              placeholder="e.g. 3.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes"
            />
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

export function IncentiveProgramsPage() {
  const { data, isLoading } = useIncentiveSlabs();
  const createSlab = useCreateIncentiveSlab();
  const updateSlab = useUpdateIncentiveSlab();
  const deleteSlab = useDeleteIncentiveSlab();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) => currency === 'INR'
    ? `${symbol}${(n / 100000).toFixed(1)} L`
    : `${symbol}${convert(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  const slabs: IncentiveSlab[] = data?.data ?? [];

  // Group by tier
  const tierOrder = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
  const slabsByTier = tierOrder.reduce<Record<string, IncentiveSlab[]>>(
    (acc, tier) => {
      acc[tier] = slabs.filter((s) => s.tier === tier);
      return acc;
    },
    {}
  );

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
    if (confirm("Delete this incentive slab?")) {
      deleteSlab.mutate(id);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incentive Programs</h1>
          <p className="text-sm text-muted-foreground">
            KPT channel partner incentive slabs and performance tiers
          </p>
        </div>
        <SlabFormDialog
          title="Add Incentive Slab"
          trigger={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Slab
            </Button>
          }
          onSubmit={handleCreate}
          isPending={createSlab.isPending}
        />
      </div>

      {/* Tier slab cards */}
      <div>
        <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-4">
          Performance Tiers &amp; Incentive Slabs
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tierOrder.map((tier) => {
            const tierSlabs = slabsByTier[tier] ?? [];
            const cfg = TIER_CONFIG[tier]!;
            return (
              <Card
                key={tier}
                className={`border-2 ${cfg.color} ${tier === "GOLD" ? "ring-2 ring-primary/30" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${cfg.badge}`}>
                      {TIER_LABEL[tier]}
                    </span>
                    {tier === "GOLD" && (
                      <span className="text-xs font-bold bg-primary text-white rounded-full px-2 py-0.5">
                        Top Tier
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold">{TIER_LABEL[tier]} Tier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tierSlabs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No slabs configured</p>
                  )}
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
                      <div
                        key={slab.id}
                        className="rounded-lg border border-border bg-background p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-bold text-primary">
                            {slab.incentivePercent}%
                          </p>
                          <div className="flex items-center gap-1">
                            <SlabFormDialog
                              title="Edit Slab"
                              trigger={
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              }
                              initial={editInitial}
                              onSubmit={(form) => handleUpdate(slab.id, form)}
                              isPending={updateSlab.isPending}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(slab.id)}
                            >
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
      </div>

      {/* All slabs table */}
      {slabs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
              All Incentive Slabs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Tier", "Min Sale", "Max Sale", "Incentive %", "Description", "Status", ""].map(
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
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${cfg.badge}`}>
                            {TIER_LABEL[slab.tier]}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-foreground">{fmt(slab.minSaleAmount)}</td>
                        <td className="px-6 py-3 text-foreground">
                          {slab.maxSaleAmount ? fmt(slab.maxSaleAmount) : "No cap"}
                        </td>
                        <td className="px-6 py-3 font-bold text-primary">
                          {slab.incentivePercent}%
                        </td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {slab.description || "—"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs font-medium rounded-full px-2 py-0.5 ${slab.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            {slab.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <SlabFormDialog
                              title="Edit Slab"
                              trigger={
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              }
                              initial={editInitial}
                              onSubmit={(form) => handleUpdate(slab.id, form)}
                              isPending={updateSlab.isPending}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(slab.id)}
                            >
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
