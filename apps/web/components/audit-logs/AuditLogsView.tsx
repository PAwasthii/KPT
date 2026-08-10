"use client";

import { useState, useCallback, useEffect } from "react";
import { Shield, Clock, Activity, X, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { DataTable, TableColumn } from "@/components/data-table";
import apiClient from "@/lib/api/client";
import type { AuditLog, AuditLogStats, PaginatedApiResponse } from "@/lib/api/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function getUserLabel(log: AuditLog) {
  if (!log.changedByUser) return `User #${log.changedBy}`;
  const name = [log.changedByUser.firstName, log.changedByUser.lastName].filter(Boolean).join(" ");
  return name || log.changedByUser.email;
}

function getActionColor(action: string): string {
  if (action.includes("create") || action.includes("add") || action.includes("CREATE"))
    return "bg-green-100 text-green-800 border-green-200";
  if (action.includes("delete") || action.includes("remove") || action.includes("DELETE"))
    return "bg-red-100 text-red-800 border-red-200";
  if (action.includes("update") || action.includes("edit") || action.includes("UPDATE"))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (action.includes("login") || action.includes("logout"))
    return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getCategoryColor(category?: string | null) {
  if (category === "SALES_MANAGEMENT") return "bg-orange-100 text-orange-800 border-orange-200";
  if (category === "CAMPAIGN_MANAGEMENT") return "bg-indigo-100 text-indigo-800 border-indigo-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function categoryLabel(category?: string | null) {
  if (category === "SALES_MANAGEMENT") return "Sales";
  if (category === "CAMPAIGN_MANAGEMENT") return "Campaign";
  return category ?? "—";
}

// ─── Diff viewer ────────────────────────────────────────────────────────────

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: unknown; newVal: unknown }) {
  const old = oldVal !== undefined && oldVal !== null ? String(oldVal) : "—";
  const next = newVal !== undefined && newVal !== null ? String(newVal) : "—";
  const changed = old !== next;
  return (
    <tr className={changed ? "bg-yellow-50/60" : ""}>
      <td className="py-1.5 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</td>
      <td className="py-1.5 px-3 text-xs text-red-700 max-w-[180px] truncate">{old}</td>
      <td className="py-1.5 px-3 text-xs text-green-700 max-w-[180px] truncate">{next}</td>
    </tr>
  );
}

function ValuesTable({ values }: { values: Record<string, unknown> }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {Object.entries(values).map(([k, v]) => (
          <tr key={k}>
            <td className="py-1 px-3 font-medium text-muted-foreground whitespace-nowrap">{k}</td>
            <td className="py-1 px-3 text-foreground">{v !== null && v !== undefined ? String(v) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DiffViewer({ log }: { log: AuditLog }) {
  const old = log.oldValues as Record<string, unknown> | null | undefined;
  const next = log.newValues as Record<string, unknown> | null | undefined;

  if (!old && !next) {
    return <p className="text-xs text-muted-foreground p-3">No value snapshot recorded.</p>;
  }

  if (old && next) {
    const keys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)]));
    return (
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Field</th>
            <th className="py-1.5 px-3 text-left text-red-600 font-medium">Before</th>
            <th className="py-1.5 px-3 text-left text-green-600 font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {keys.map((k) => (
            <DiffRow key={k} label={k} oldVal={old[k]} newVal={next[k]} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div>
      {old && (
        <div>
          <p className="text-xs font-semibold text-red-600 px-3 pt-2 pb-1">Before</p>
          <ValuesTable values={old} />
        </div>
      )}
      {next && (
        <div>
          <p className="text-xs font-semibold text-green-600 px-3 pt-2 pb-1">After</p>
          <ValuesTable values={next} />
        </div>
      )}
    </div>
  );
}

// ─── Detail drawer ──────────────────────────────────────────────────────────

function DetailDrawer({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-background shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-sm">Audit Log #{log.id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(log.changedAt)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-4 border-b space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Action</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                {log.action}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Category</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(log.category)}`}>
                {categoryLabel(log.category)}
                {log.subCategory && ` · ${log.subCategory}`}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Entity</p>
              <p className="text-sm font-medium">{log.entityType} <span className="text-muted-foreground">#{log.entityId}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Changed By</p>
              <p className="text-sm font-medium">{getUserLabel(log)}</p>
              {log.changedByUser?.email && (
                <p className="text-xs text-muted-foreground">{log.changedByUser.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Diff */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-5 pt-4 pb-2">
            Value Changes
          </p>
          <div className="border rounded-lg mx-5 overflow-hidden">
            <DiffViewer log={log} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ──────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: AuditLogStats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        { label: "Total Logs", value: stats.total.toLocaleString(), icon: Shield, color: "text-primary" },
        { label: "Last 24 Hours", value: stats.last24h.toLocaleString(), icon: Clock, color: "text-blue-600" },
        { label: "Sales Events", value: (stats.byCategory["SALES_MANAGEMENT"] ?? 0).toLocaleString(), icon: Activity, color: "text-orange-600" },
        { label: "Campaign Events", value: (stats.byCategory["CAMPAIGN_MANAGEMENT"] ?? 0).toLocaleString(), icon: Activity, color: "text-indigo-600" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [action, setAction] = useState("");
  const [category, setCategory] = useState("");
  const [entityType, setEntityType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 25;

  const fetchLogs = useCallback(async (pg: number = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pg), limit: String(LIMIT) };
      if (action) params.action = action;
      if (category) params.category = category;
      if (entityType) params.entityType = entityType;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await apiClient.get<PaginatedApiResponse<AuditLog>>("/api/audit-logs", { params });
      setLogs(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [action, category, entityType, fromDate, toDate]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [action, category, entityType, fromDate, toDate]);

  useEffect(() => {
    Promise.all([
      apiClient.get<AuditLogStats>("/api/audit-logs/stats").then(r => setStats(r.data)),
      apiClient.get<string[]>("/api/audit-logs/entity-types").then(r => setEntityTypes(r.data)),
    ]).catch(() => {});
  }, []);

  function clearFilters() {
    setAction("");
    setCategory("");
    setEntityType("");
    setFromDate("");
    setToDate("");
  }

  const hasFilters = action || category || entityType || fromDate || toDate;

  const columns: TableColumn<AuditLog>[] = [
    {
      key: "changedAt",
      label: "When",
      render: (_, log) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.changedAt)}</span>
      ),
    },
    {
      key: "changedByUser",
      label: "Who",
      render: (_, log) => (
        <div>
          <p className="text-sm font-medium leading-none">{getUserLabel(log)}</p>
          {log.changedByUser?.email && (
            <p className="text-xs text-muted-foreground mt-0.5">{log.changedByUser.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (_, log) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
          {log.action}
        </span>
      ),
    },
    {
      key: "entityType",
      label: "Entity",
      render: (_, log) => (
        <span className="text-sm">
          {log.entityType} <span className="text-muted-foreground text-xs">#{log.entityId}</span>
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (_, log) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(log.category)}`}>
          {categoryLabel(log.category)}
          {log.subCategory && <span className="ml-1 opacity-70">· {log.subCategory}</span>}
        </span>
      ),
    },
    {
      key: "id",
      label: "",
      render: () => <ChevronRight className="w-4 h-4 text-muted-foreground" />,
      className: "w-8",
    },
  ];

  const filterUI = (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        placeholder="Search action…"
        value={action}
        onChange={e => setAction(e.target.value)}
        className="h-8 text-sm w-44"
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="h-8 text-sm border rounded-md px-2 bg-background"
      >
        <option value="">All Categories</option>
        <option value="SALES_MANAGEMENT">Sales</option>
        <option value="CAMPAIGN_MANAGEMENT">Campaign</option>
      </select>
      <select
        value={entityType}
        onChange={e => setEntityType(e.target.value)}
        className="h-8 text-sm border rounded-md px-2 bg-background"
      >
        <option value="">All Entities</option>
        {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input
        type="date"
        value={fromDate}
        onChange={e => setFromDate(e.target.value)}
        className="h-8 text-sm border rounded-md px-2 bg-background"
      />
      <input
        type="date"
        value={toDate}
        onChange={e => setToDate(e.target.value)}
        className="h-8 text-sm border rounded-md px-2 bg-background"
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-muted-foreground">
          <X className="w-3.5 h-3.5" /> Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-1">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Complete trail of all system actions</p>
        </div>
      </div>

      <StatsBar stats={stats} />

      <DataTable<AuditLog>
        data={logs}
        columns={columns}
        title="Activity Log"
        count={totalItems}
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={LIMIT}
        onPageChange={setPage}
        showFilter
        customFilter={filterUI}
        onRowClick={setSelectedLog}
      />

      {selectedLog && (
        <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

