"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Input } from "@repo/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { AlertCircle, Search, Info, X, TrendingUp, AlertTriangle } from "lucide-react";
import { useSkuAnalysis } from "../../hooks/useFinance";
import { useCurrency } from "../../contexts/CurrencyContext";

const STOCK_STATUS_STYLES: Record<string, string> = {
  HEALTHY: "bg-green-100 text-green-700",
  LOW: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
  OUT_OF_STOCK: "bg-red-200 text-red-800",
};

export function SkuAnalysisPage() {
  const [skuSearch, setSkuSearch] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState('');

  const { data: resp, isLoading, error } = useSkuAnalysis({
    sku: skuSearch || undefined,
    category: category || undefined,
    period: period || undefined,
  });

  const { symbol, currency, convert } = useCurrency();
  const f = (n: number) => currency === "INR" ? `${symbol}${Number(n).toLocaleString("en-IN")}` : `${symbol}${convert(n).toLocaleString()}`;

  const skus: any[] = resp?.data?.skus ?? [];
  const summary = resp?.data?.summaryCards ?? {};

  const categories = Array.from(new Set(skus.map((s) => s.category))).filter(Boolean);

  function clearFilters() { setSkuSearch(''); setCategory(''); setPeriod(''); }
  const hasFilters = skuSearch || category || period;

  const topBySales = [...skus].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const lowStock = skus.filter((s) => s.stockStatus === 'LOW' || s.stockStatus === 'CRITICAL' || s.stockStatus === 'OUT_OF_STOCK');

  return (
    <div className="p-6 space-y-6 animate-kpt-fade-up">
      {/* Margin disclaimer */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Gross profit and margin are not shown — product cost data is not recorded in the system. Only revenue and unit quantities are available.</span>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Total SKUs</p><p className="text-2xl font-bold">{summary.totalSkus ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Top Revenue SKU</p><p className="text-base font-bold font-mono truncate">{summary.topRevenueSku || '—'}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Top Selling SKU</p><p className="text-base font-bold font-mono truncate">{summary.topSellingSku || '—'}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Low / Critical Stock</p><p className="text-2xl font-bold text-amber-600">{summary.lowStockSkus ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase tracking-wide">Total SKU Revenue</p><p className="text-xl font-bold">{f(summary.totalSkuRevenue ?? 0)}</p></CardContent></Card>
        </div>
      )}

      {/* Top Performers + Low Stock panels */}
      {!isLoading && !error && (topBySales.length > 0 || lowStock.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topBySales.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Top Revenue SKUs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2 text-muted-foreground font-semibold">SKU</th>
                      <th className="text-right px-4 py-2 text-muted-foreground font-semibold">Revenue</th>
                      <th className="text-right px-4 py-2 text-muted-foreground font-semibold">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topBySales.map((s, idx) => (
                      <tr key={s.sku} className="hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <span className="text-muted-foreground mr-1">#{idx + 1}</span>
                          <span className="font-mono font-medium">{s.sku}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">{f(s.revenue)}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{s.unitsSold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {lowStock.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Low / Critical Stock SKUs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2 text-muted-foreground font-semibold">SKU</th>
                      <th className="text-right px-4 py-2 text-muted-foreground font-semibold">Stock</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lowStock.map((s) => (
                      <tr key={s.sku} className="hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono font-medium">{s.sku}</td>
                        <td className="px-4 py-2 text-right">{s.currentStock}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STOCK_STATUS_STYLES[s.stockStatus] || 'bg-gray-100 text-gray-600'}`}>
                            {s.stockStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search SKU..." value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          className="h-9 w-36"
          placeholder="Period (YYYY-MM)"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border hover:border-foreground/30 transition-colors">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Full SKU Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-muted/30 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 p-6"><AlertCircle className="h-5 w-5" /><span>Failed to load SKU data.</span></div>
          ) : skus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No SKUs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">SKU</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Category</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Units Sold</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Orders</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Stock</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {skus.map((sku: any) => (
                    <tr key={sku.sku} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{sku.sku}</td>
                      <td className="px-4 py-3 text-foreground max-w-[180px] truncate">{sku.productName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{sku.category || '—'}</td>
                      <td className="px-4 py-3 text-right">{sku.unitsSold.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{sku.orderCount ?? 0}</td>
                      <td className="px-4 py-3 text-right font-medium">{f(sku.revenue)}</td>
                      <td className="px-4 py-3 text-right">{sku.currentStock.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STOCK_STATUS_STYLES[sku.stockStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {sku.stockStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
