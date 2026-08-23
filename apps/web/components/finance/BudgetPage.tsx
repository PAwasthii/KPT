"use client";

import { useState } from "react";
import { Card, CardContent } from "@repo/ui";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@repo/ui/components/ui/dialog";
import { Label } from "@repo/ui/components/ui/label";
import { AlertCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from "../../hooks/useFinance";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useAuth } from "../../contexts/AuthContext";

const BUDGET_TYPE_OPTIONS = ['REVENUE', 'SALES', 'INCENTIVE'];
const DIMENSION_OPTIONS = ['TOTAL', 'REGION', 'PARTNER', 'PRODUCT_CATEGORY', 'SKU'];

const MANAGE_ROLES = ['SYSTEM_ADMIN', 'FINANCE_ADMIN'];

function BudgetFormDialog({
  open, onClose, editingBudget,
}: {
  open: boolean; onClose: () => void; editingBudget?: any;
}) {
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();

  const [form, setForm] = useState({
    year: editingBudget?.year ?? new Date().getFullYear(),
    month: editingBudget?.month ?? '',
    budgetType: editingBudget?.budgetType ?? 'REVENUE',
    dimensionType: editingBudget?.dimensionType ?? 'TOTAL',
    dimensionValue: editingBudget?.dimensionValue ?? '',
    budgetAmount: editingBudget?.budgetAmount ? String(editingBudget.budgetAmount) : '',
    notes: editingBudget?.notes ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const isEdit = !!editingBudget;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.budgetAmount || isNaN(Number(form.budgetAmount))) { setErr('Enter a valid budget amount.'); return; }
    setErr('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: editingBudget.id, data: { budgetAmount: Number(form.budgetAmount), notes: form.notes, dimensionValue: form.dimensionValue } });
      } else {
        await createMutation.mutateAsync({
          year: Number(form.year),
          month: form.month ? Number(form.month) : undefined,
          budgetType: form.budgetType,
          dimensionType: form.dimensionType,
          dimensionValue: form.dimensionValue || undefined,
          budgetAmount: Number(form.budgetAmount),
          notes: form.notes || undefined,
        });
      }
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to save budget.');
    } finally {
      setSubmitting(false);
    }
  }

  const months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const monthNames = ['Annual', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm(f => ({...f, year: Number(e.target.value)}))} disabled={isEdit} required />
            </div>
            <div>
              <Label>Month</Label>
              <Select value={String(form.month)} onValueChange={(v) => setForm(f => ({...f, month: v === '0' ? '' : v}))} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Annual" /></SelectTrigger>
                <SelectContent>{months.map((m, i) => <SelectItem key={m} value={m || '0'}>{monthNames[i]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Budget Type</Label>
            <Select value={form.budgetType} onValueChange={(v) => setForm(f => ({...f, budgetType: v}))} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BUDGET_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dimension</Label>
            <Select value={form.dimensionType} onValueChange={(v) => setForm(f => ({...f, dimensionType: v}))} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIMENSION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.dimensionType !== 'TOTAL' && (
            <div>
              <Label>Dimension Value</Label>
              <Input placeholder="e.g. West, KPT-AG5-001..." value={form.dimensionValue} onChange={(e) => setForm(f => ({...f, dimensionValue: e.target.value}))} />
            </div>
          )}
          <div>
            <Label>Budget Amount (₹)</Label>
            <Input type="number" min={0} step={1000} value={form.budgetAmount} onChange={(e) => setForm(f => ({...f, budgetAmount: e.target.value}))} required />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Budget'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteDialog({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Delete Budget</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Are you sure you want to delete this budget? This cannot be undone.</p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function BudgetPage() {
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [typeFilter, setTypeFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { user } = useAuth();
  const canManage = MANAGE_ROLES.includes(user?.role || '');
  const deleteMutation = useDeleteBudget();

  const { data: resp, isLoading, error } = useBudgets({
    year: yearFilter ? Number(yearFilter) : undefined,
    budgetType: typeFilter || undefined,
  });

  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => currency === "INR" ? `${symbol}${Number(n).toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;

  const budgets: any[] = resp?.data ?? [];
  const totalBudget = budgets.reduce((s, b) => s + Number(b.budgetAmount), 0);
  const totalActual = budgets.reduce((s, b) => s + (b.actual || 0), 0);
  const totalVariance = totalActual - totalBudget;
  const totalAchievement = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : null;

  async function handleDelete() {
    if (!deletingId) return;
    await deleteMutation.mutateAsync(deletingId);
    setDeletingId(null);
  }

  return (
    <div className="p-6 space-y-6 animate-kpt-fade-up">
      {/* Summary cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Total Budget</p><p className="text-xl font-bold">{f(totalBudget)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Actual Revenue</p><p className="text-xl font-bold">{f(totalActual)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Variance</p><p className={`text-xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalVariance >= 0 ? '+' : ''}{f(totalVariance)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Achievement</p><p className={`text-xl font-bold ${(totalAchievement ?? 0) >= 100 ? 'text-green-600' : (totalAchievement ?? 0) >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{totalAchievement != null ? `${totalAchievement}%` : '—'}</p></CardContent></Card>
        </div>
      )}

      {/* Filters + Add */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input className="h-9 w-28" placeholder="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {BUDGET_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button size="sm" className="ml-auto" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Budget
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 p-6"><AlertCircle className="h-5 w-5" /><span>Failed to load budgets.</span></div>
          ) : budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No budgets found. {canManage && 'Click "Add Budget" to create one.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Period</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Dimension</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Budget</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Actual</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Variance</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Achievement</th>
                    {canManage && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {budgets.map((b: any) => {
                    const period = b.month ? `${MONTH_NAMES[b.month]} ${b.year}` : `FY ${b.year}`;
                    const variance = (b.actual || 0) - Number(b.budgetAmount);
                    const ach = b.achievement;
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{period}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.budgetType}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.dimensionType}{b.dimensionValue ? `: ${b.dimensionValue}` : ''}</td>
                        <td className="px-4 py-3 text-right">{f(b.budgetAmount)}</td>
                        <td className="px-4 py-3 text-right">{f(b.actual || 0)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{variance >= 0 ? '+' : ''}{f(variance)}</td>
                        <td className="px-4 py-3 text-right">
                          {ach != null ? (
                            <span className={`font-semibold ${ach >= 100 ? 'text-green-600' : ach >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{ach}%</span>
                          ) : '—'}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setEditingBudget(b)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => setDeletingId(b.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {addOpen && <BudgetFormDialog open={addOpen} onClose={() => setAddOpen(false)} />}
      {editingBudget && <BudgetFormDialog open={!!editingBudget} onClose={() => setEditingBudget(null)} editingBudget={editingBudget} />}
      <ConfirmDeleteDialog open={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete} loading={deleteMutation.isPending} />
    </div>
  );
}
