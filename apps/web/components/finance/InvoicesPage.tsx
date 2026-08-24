"use client";

import { useState } from "react";
import { Card, CardContent } from "@repo/ui";
import { Input } from "@repo/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { AlertCircle, Search, X } from "lucide-react";
import { useInvoices, useInvoice } from "../../hooks/useFinance";
import { usePartners } from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  ISSUED: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-gray-50 text-gray-400",
};

function InvoiceDetailDrawer({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const { data: resp, isLoading } = useInvoice(id);
  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => currency === "INR" ? `${symbol}${Number(n).toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;
  const inv = resp?.data;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-background shadow-2xl overflow-y-auto p-6 animate-kpt-scale-in">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        ) : !inv ? (
          <div className="flex items-center gap-2 text-red-600 mt-6"><AlertCircle className="h-5 w-5" /><span>Invoice not found.</span></div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold">{inv.invoiceNumber}</h2>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                {inv.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Due Date</p><p className="font-medium">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Partner</p><p className="font-medium">{inv.partner?.name || inv.billingName || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Region</p><p className="font-medium">{inv.region || '—'}</p></div>
              {inv.gstin && <div><p className="text-xs text-muted-foreground">GSTIN</p><p className="font-mono font-medium">{inv.gstin}</p></div>}
              {inv.salesOrder && <div><p className="text-xs text-muted-foreground">Sales Order</p><p className="font-medium">{inv.salesOrder.orderNumber}</p></div>}
              {inv.paymentMethod && <div><p className="text-xs text-muted-foreground">Payment</p><p className="font-medium">{inv.paymentMethod}</p></div>}
            </div>

            {/* Line items */}
            <div className="rounded-md border overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
                    <th className="text-right px-3 py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(inv.items || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">{item.description}{item.sku && <span className="text-muted-foreground ml-1">({item.sku})</span>}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{f(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{f(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{f(inv.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({Number(inv.taxPercent)}%)</span><span>{f(inv.taxAmount)}</span></div>
              {Number(inv.discountAmount) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{f(inv.discountAmount)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total</span><span>{f(inv.totalAmount)}</span></div>
              {Number(inv.paidAmount) > 0 && <div className="flex justify-between text-green-700"><span>Paid</span><span>{f(inv.paidAmount)}</span></div>}
              {Number(inv.totalAmount) - Number(inv.paidAmount) > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold"><span>Balance</span><span>{f(Number(inv.totalAmount) - Number(inv.paidAmount))}</span></div>
              )}
            </div>

            {inv.notes && (
              <div className="mt-3 p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Notes</p>
                <p>{inv.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

export function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => currency === "INR" ? `${symbol}${Number(n).toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;

  const { data: partnersResp } = usePartners({ limit: 100, status: 'ACTIVE' });
  const partnerList: Array<{ id: number; name: string }> = partnersResp?.data ?? [];

  const { data: resp, isLoading, error } = useInvoices({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    partnerId: partnerId ? Number(partnerId) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const invoices = resp?.data ?? [];
  const pagination = resp?.pagination;

  function clearFilters() { setSearch(''); setStatus(''); setPartnerId(''); setDateFrom(''); setDateTo(''); setPage(1); }
  const hasFilters = search || status || partnerId || dateFrom || dateTo;

  return (
    <div className="p-6 space-y-4 animate-kpt-fade-up">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search invoice, partner..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select value={partnerId} onValueChange={(v) => { setPartnerId(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partnerList.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="h-9 w-36"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          title="From date"
        />
        <Input
          type="date"
          className="h-9 w-36"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          title="To date"
        />

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border hover:border-foreground/30 transition-colors">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        {pagination && <span className="text-xs text-muted-foreground ml-auto">{pagination.total} invoice{pagination.total !== 1 ? 's' : ''}</span>}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/30 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 p-6"><AlertCircle className="h-5 w-5" /><span>Failed to load invoices.</span></div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Invoice #</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Partner</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Order #</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Paid</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Outstanding</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Due Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv: any) => {
                    const balance = Number(inv.totalAmount) - Number(inv.paidAmount);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => setSelectedId(inv.id)}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-primary">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-foreground">{inv.partner?.name || inv.billingName || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{inv.salesOrder?.orderNumber || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{f(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{f(inv.paidAmount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">{f(balance)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors">Prev</button>
          <span className="text-muted-foreground">Page {page} of {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
        </div>
      )}

      {selectedId !== null && (
        <InvoiceDetailDrawer id={selectedId} open={selectedId !== null} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
