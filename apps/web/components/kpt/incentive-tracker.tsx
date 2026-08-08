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
import { Trophy, Clock, CheckCircle2, AlertCircle, XCircle, Plus } from "lucide-react";
import {
  usePartners,
  usePartnerIncentives,
  useCreateIncentive,
  useUpdateIncentive,
} from "../../hooks/useKpt";

interface ChannelPartner {
  id: number;
  name: string;
  tier: string;
  type: string;
}

interface PartnerIncentive {
  id: number;
  partnerId: number;
  period: string;
  salesAmount: number;
  incentivePercent: number;
  incentiveAmount: number;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "PAID" | "REJECTED";
  remarks: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

const fmt = (n: number) => `₹${(n / 100000).toFixed(1)} L`;

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ElementType; label: string }
> = {
  PAID: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Paid" },
  APPROVED: { color: "bg-blue-100 text-blue-700", icon: CheckCircle2, label: "Approved" },
  UNDER_REVIEW: { color: "bg-amber-100 text-amber-700", icon: AlertCircle, label: "Under Review" },
  PENDING: { color: "bg-gray-100 text-gray-600", icon: Clock, label: "Pending" },
  REJECTED: { color: "bg-red-100 text-red-600", icon: XCircle, label: "Rejected" },
};

function PartnerIncentiveRows({
  partner,
  updateIncentive,
  isUpdating,
}: {
  partner: ChannelPartner;
  updateIncentive: ReturnType<typeof useUpdateIncentive>;
  isUpdating: boolean;
}) {
  const { data, isLoading } = usePartnerIncentives(partner.id);
  const incentives: PartnerIncentive[] = data?.data ?? [];

  if (isLoading) {
    return (
      <tr>
        <td colSpan={7} className="px-6 py-2 text-xs text-muted-foreground italic">
          Loading incentives for {partner.name}...
        </td>
      </tr>
    );
  }

  if (incentives.length === 0) return null;

  return (
    <>
      {incentives.map((inc) => {
        const cfg = (STATUS_CONFIG[inc.status] ?? STATUS_CONFIG['PENDING'])!;
        const StatusIcon = cfg.icon;
        const canApprove = inc.status === "UNDER_REVIEW";

        return (
          <tr key={inc.id} className="hover:bg-accent/40 transition-colors">
            <td className="px-6 py-3 font-medium text-foreground">{partner.name}</td>
            <td className="px-6 py-3 text-muted-foreground text-xs">{inc.period}</td>
            <td className="px-6 py-3 font-semibold text-foreground">{fmt(inc.salesAmount)}</td>
            <td className="px-6 py-3 text-foreground">{inc.incentivePercent}%</td>
            <td className="px-6 py-3 font-bold text-primary">{fmt(inc.incentiveAmount)}</td>
            <td className="px-6 py-3">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 ${cfg.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            </td>
            <td className="px-6 py-3">
              {canApprove && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isUpdating}
                  onClick={() =>
                    updateIncentive.mutate({ id: inc.id, data: { status: "APPROVED" } })
                  }
                >
                  Approve
                </Button>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

interface RecordFormState {
  partnerId: string;
  period: string;
  salesAmount: string;
  incentivePercent: string;
}

const EMPTY_FORM: RecordFormState = {
  partnerId: "",
  period: "",
  salesAmount: "",
  incentivePercent: "",
};

export function IncentiveTrackerPage() {
  const { data: partnersData, isLoading: loadingPartners } = usePartners({ limit: 50 });
  const updateIncentive = useUpdateIncentive();

  const [recordOpen, setRecordOpen] = useState(false);
  const [form, setForm] = useState<RecordFormState>(EMPTY_FORM);

  const createIncentive = useCreateIncentive(Number(form.partnerId) || 0);

  if (loadingPartners) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const partners: ChannelPartner[] = partnersData?.data ?? [];

  function set(field: keyof RecordFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partnerId) return;
    createIncentive.mutate({
      period: form.period,
      salesAmount: Number(form.salesAmount),
      incentivePercent: Number(form.incentivePercent),
    });
    setRecordOpen(false);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incentive Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Partner-wise incentive status across all periods
          </p>
        </div>
        <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Record Incentive
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Incentive</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecord} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Partner</Label>
                <Select value={form.partnerId} onValueChange={(v) => set("partnerId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
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
              <div className="space-y-1.5">
                <Label>Period (YYYY-MM)</Label>
                <Input
                  value={form.period}
                  onChange={(e) => set("period", e.target.value)}
                  placeholder="e.g. 2026-08"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sales Amount (₹)</Label>
                  <Input
                    type="number"
                    value={form.salesAmount}
                    onChange={(e) => set("salesAmount", e.target.value)}
                    required
                    placeholder="e.g. 2840000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Incentive %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.incentivePercent}
                    onChange={(e) => set("incentivePercent", e.target.value)}
                    required
                    placeholder="e.g. 3.5"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createIncentive.isPending}>
                  {createIncentive.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incentive status table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Incentive Status by Partner
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    "Partner Name",
                    "Period",
                    "Sales Amount",
                    "Incentive %",
                    "Incentive Amount",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map((partner) => (
                  <PartnerIncentiveRows
                    key={partner.id}
                    partner={partner}
                    updateIncentive={updateIncentive}
                    isUpdating={updateIncentive.isPending}
                  />
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
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
