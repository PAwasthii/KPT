'use client';
import { useState, useEffect } from 'react';

interface Stats {
  total: number; stage1: number; stage2: number; stage3: number;
  stage4: number; stage5: number; active: number; rejected: number; recent: number;
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">{label}</p>
      <p className={`text-[32px] font-bold ${accent ?? 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-[12px] text-[#6B6B6B] mt-0.5">{sub}</p>}
    </div>
  );
}

const PIPELINE_STAGES = [
  { key: 'stage1' as const, label: 'Enquiry Received', color: 'bg-[#FCD34D]', textColor: 'text-[#92400E]' },
  { key: 'stage2' as const, label: 'Field Visit', color: 'bg-[#93C5FD]', textColor: 'text-[#1E40AF]' },
  { key: 'stage3' as const, label: 'Documents', color: 'bg-[#C4B5FD]', textColor: 'text-[#6B21A8]' },
  { key: 'stage4' as const, label: 'Pending Approval', color: 'bg-[#FDBA74]', textColor: 'text-[#2563EB]' },
  { key: 'stage5' as const, label: 'Agreement', color: 'bg-[#6EE7B7]', textColor: 'text-[#065F46]' },
];

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() as Promise<Stats> : Promise.reject())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!stats) return (
    <div className="p-6"><p className="text-[14px] text-[#6B6B6B]">Failed to load stats.</p></div>
  );

  const inProgress = stats.total - stats.active - stats.rejected;
  const conversionRate = stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '0.0';
  const rejectionRate = stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">KPT Admin</p>
        <h1 className="text-[24px] font-bold text-slate-800">Partner Pipeline Stats</h1>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Applications" value={stats.total} sub={`+${stats.recent} this week`} />
        <StatCard label="Active Partners" value={stats.active} sub={`${conversionRate}% conversion`} accent="text-[#065F46]" />
        <StatCard label="In Progress" value={inProgress} sub="Across all stages" accent="text-[#1E40AF]" />
        <StatCard label="Rejected" value={stats.rejected} sub={`${rejectionRate}% rejection rate`} accent="text-[#2563EB]" />
      </div>

      {/* Pipeline funnel */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-6">
        <p className="text-[13px] font-semibold text-slate-800 mb-5">Pipeline Breakdown</p>
        <div className="space-y-3">
          {PIPELINE_STAGES.map(stage => {
            const count = stats[stage.key];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[13px] font-medium ${stage.textColor}`}>{stage.label}</p>
                  <p className="text-[13px] font-semibold text-slate-800">{count} <span className="text-[#6B6B6B] font-normal text-[11px]">({pct.toFixed(0)}%)</span></p>
                </div>
                <div className="h-2 bg-[#F7F7F5] rounded-full overflow-hidden">
                  <div className={`h-full ${stage.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Needs Field Visit</p>
          <p className="text-[28px] font-bold text-[#92400E]">{stats.stage1}</p>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Enquiries awaiting scheduling</p>
        </div>
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Awaiting Approval</p>
          <p className="text-[28px] font-bold text-[#2563EB]">{stats.stage4}</p>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Docs submitted, pending decision</p>
        </div>
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Agreement Pending</p>
          <p className="text-[28px] font-bold text-[#065F46]">{stats.stage5}</p>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Approved, awaiting e-sign</p>
        </div>
      </div>
    </div>
  );
}
