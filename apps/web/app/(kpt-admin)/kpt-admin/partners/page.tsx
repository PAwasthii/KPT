'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/kpt/StatusBadge';

interface Partner {
  id: string; crn: string; ownerName: string; firmName: string; city: string; state: string;
  currentStage: number; status: string; productInterest: string[]; createdAt: string;
  documents: { verifyStatus: string }[];
  fieldReport: { verifiedAt: string | null; scheduledDate: string | null; assignedExecName: string | null } | null;
}

interface Stats { total: number; stage1: number; stage2: number; stage3: number; stage4: number; stage5: number; active: number; rejected: number; recent: number; }

interface ScheduleModal { crn: string; firmName: string; city: string; }

const STAGE_LABELS = ['', 'Enquiry', 'Field Visit', 'Documents', 'Approval', 'Agreement/Active'];
const KANBAN_COLS = [
  { stage: 1, label: 'Enquiry', color: 'border-[#FCD34D]' },
  { stage: 2, label: 'Field Visit', color: 'border-[#BFDBFE]' },
  { stage: 3, label: 'Documents', color: 'border-[#BFDBFE]' },
  { stage: 4, label: 'Approval', color: 'border-[#2563EB]' },
  { stage: 5, label: 'Agreement', color: 'border-[#A7F3D0]' },
];

const INPUT = 'w-full border border-[#E8E8E6] rounded-[4px] px-3 py-2 text-[13px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB] transition-colors';

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Schedule visit modal
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedExec, setSchedExec] = useState('');
  const [schedNote, setSchedNote] = useState('');
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stageFilter) params.set('stage', stageFilter);
    try {
      const [partnersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/partners?${params}`),
        fetch('/api/admin/stats'),
      ]);
      if (partnersRes.ok) { const d = await partnersRes.json() as { partners: Partner[] }; setPartners(d.partners); }
      if (statsRes.ok) setStats(await statsRes.json() as Stats);
    } finally { setLoading(false); }
  }, [search, stageFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (crn: string, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(crn);
    try {
      await fetch(`/api/admin/partners/${crn}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes ?? (action === 'approve' ? 'Approved by admin' : 'Rejected by admin'), adminId: 'admin', adminName: 'KPT Admin' }),
      });
      await fetchData();
    } finally { setActionLoading(null); }
  };

  const openScheduleModal = (p: Partner) => {
    setScheduleModal({ crn: p.crn, firmName: p.firmName, city: p.city });
    // Pre-fill if already scheduled
    if (p.fieldReport?.scheduledDate) {
      const d = new Date(p.fieldReport.scheduledDate);
      setSchedDate(d.toISOString().split('T')[0]);
      setSchedTime(d.toTimeString().slice(0, 5));
    } else {
      setSchedDate('');
      setSchedTime('10:00');
    }
    setSchedExec(p.fieldReport?.assignedExecName ?? '');
    setSchedNote('');
    setSchedError('');
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModal || !schedDate || !schedExec.trim()) {
      setSchedError('Date and executive name are required.');
      return;
    }
    setSchedLoading(true);
    setSchedError('');
    try {
      const scheduledDate = new Date(`${schedDate}T${schedTime}:00`).toISOString();
      const res = await fetch(`/api/admin/partners/${scheduleModal.crn}/schedule-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate, execName: schedExec.trim(), note: schedNote.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setScheduleModal(null);
        await fetchData();
      } else {
        setSchedError(data.error ?? 'Failed to schedule visit');
      }
    } catch {
      setSchedError('Network error. Please try again.');
    } finally {
      setSchedLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [['CRN', 'Firm Name', 'Owner', 'City', 'Stage', 'Status', 'Applied'].join(','),
      ...partners.map(p => [p.crn, p.firmName, p.ownerName, p.city, p.currentStage, p.status, new Date(p.createdAt).toLocaleDateString('en-IN')].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kpt-partners.csv'; a.click();
  };

  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  return (
    <div className="p-6">
      {/* Schedule Visit Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-[#E8E8E6]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-0.5">Schedule Field Visit</p>
              <p className="text-[16px] font-bold text-slate-800">{scheduleModal.firmName}</p>
              <p className="text-[13px] text-[#6B6B6B] font-mono">{scheduleModal.crn} · {scheduleModal.city}</p>
            </div>
            <div className="p-5 space-y-4">
              {schedError && (
                <div className="bg-[rgba(37,99,235,0.08)] border border-[#FED7AA] rounded-[4px] px-3 py-2">
                  <p className="text-[13px] text-[#2563EB]">{schedError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#2D2D2D] mb-1.5">Visit Date *</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={INPUT} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#2D2D2D] mb-1.5">Time *</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#2D2D2D] mb-1.5">Field Executive Name *</label>
                <input type="text" value={schedExec} onChange={e => setSchedExec(e.target.value)}
                  placeholder="e.g. Rajesh Kumar" className={INPUT} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#2D2D2D] mb-1.5">Note to Partner <span className="text-[#6B6B6B] font-normal">(optional)</span></label>
                <textarea value={schedNote} onChange={e => setSchedNote(e.target.value)}
                  placeholder="e.g. Please keep shop open. Executive will call before arriving."
                  rows={2} className={INPUT + ' resize-none'} />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={handleScheduleSubmit} disabled={schedLoading}
                className="flex-1 bg-[#2563EB] text-white text-[13px] font-semibold py-2.5 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors">
                {schedLoading ? 'Scheduling…' : 'Schedule Visit'}
              </button>
              <button onClick={() => setScheduleModal(null)} disabled={schedLoading}
                className="px-5 border border-[#E8E8E6] text-[#6B6B6B] text-[13px] py-2.5 rounded-[4px] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">KPT Admin</p>
          <h1 className="text-[24px] font-bold text-slate-800">Channel Partner Applications</h1>
        </div>
        <button onClick={exportCSV} className="border border-[#E8E8E6] text-[#6B6B6B] text-[13px] px-4 py-2 rounded-[4px] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors">Export CSV</button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Applications', value: stats.total, sub: `+${stats.recent} this week` },
            { label: 'Active Partners', value: stats.active, sub: 'Signed & live' },
            { label: 'Pending Approval', value: stats.stage4, sub: 'Stage 4 — Sales Head' },
            { label: 'Rejected', value: stats.rejected, sub: 'Final decision' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#E8E8E6] rounded-[8px] p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">{s.label}</p>
              <p className="text-[28px] font-bold text-slate-800">{s.value}</p>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline stage pills */}
      {stats && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setStageFilter(stageFilter === String(n) ? '' : String(n))}
              className={`shrink-0 text-[12px] px-3 py-1.5 rounded-full border transition-colors ${stageFilter === String(n) ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-[#E8E8E6] text-[#6B6B6B] hover:border-[#2563EB] hover:text-[#2563EB]'}`}>
              Stage {n} · {[stats.stage1, stats.stage2, stats.stage3, stats.stage4, stats.stage5][n-1]}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search CRN, firm, mobile…"
          className="flex-1 border border-[#E8E8E6] rounded-[4px] px-3 py-2 text-[13px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB]" />
        <div className="flex border border-[#E8E8E6] rounded-[4px] overflow-hidden">
          {(['table', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-[12px] uppercase tracking-[0.05em] transition-colors ${view === v ? 'bg-[#2563EB] text-white' : 'text-[#6B6B6B] hover:text-[#2D2D2D]'}`}>{v}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'table' ? (
        /* TABLE */
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F7F7F5] border-b-2 border-[#E8E8E6]">
              <tr>{['CRN', 'Firm', 'City', 'Products', 'Stage', 'Status', 'Days', 'Actions'].map(h => (
                <th key={h} className="text-left text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] px-4 py-3 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.crn} className="border-b border-[#E8E8E6] hover:bg-[rgba(37,99,235,0.08)]/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] text-[#2563EB]">{p.crn}</td>
                  <td className="px-4 py-3"><p className="text-[13px] font-medium text-[#2D2D2D]">{p.firmName}</p><p className="text-[11px] text-[#6B6B6B]">{p.ownerName}</p></td>
                  <td className="px-4 py-3 text-[13px] text-[#2D2D2D]">{p.city}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{p.productInterest.slice(0,2).map(pi => <span key={pi} className="text-[10px] bg-[#F7F7F5] text-[#6B6B6B] px-1.5 py-0.5 rounded">{pi.split(' ')[0]}</span>)}</div></td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-[#2D2D2D]">S{p.currentStage} — {STAGE_LABELS[p.currentStage]}</span>
                    {p.currentStage === 2 && p.fieldReport?.scheduledDate && (
                      <p className="text-[11px] text-[#3B82F6] mt-0.5">{new Date(p.fieldReport.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {p.fieldReport.assignedExecName ?? '—'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[13px] text-[#6B6B6B]">{daysSince(p.createdAt)}d</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link href={`/kpt-admin/partners/${p.crn}`} className="text-[12px] text-[#2563EB] hover:underline">View</Link>
                      {p.currentStage === 1 && (
                        <button onClick={() => openScheduleModal(p)}
                          className="text-[12px] text-[#1E40AF] hover:underline">Schedule Visit</button>
                      )}
                      {p.currentStage === 2 && (
                        <Link href={`/kpt-admin/field/${p.crn}`}
                          className="text-[12px] text-[#065F46] hover:underline">Submit Report</Link>
                      )}
                      {p.currentStage === 4 && (
                        <>
                          <button disabled={actionLoading === p.crn} onClick={() => handleAction(p.crn, 'approve')} className="text-[12px] text-[#065F46] hover:underline disabled:opacity-50">Approve</button>
                          <button disabled={actionLoading === p.crn} onClick={() => handleAction(p.crn, 'reject', 'Application rejected')} className="text-[12px] text-[#2563EB] hover:underline disabled:opacity-50">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-[#6B6B6B]">No partners found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLS.map(col => {
            const colPartners = partners.filter(p => p.currentStage === col.stage);
            return (
              <div key={col.stage} className="shrink-0 w-64">
                <div className={`bg-white border-t-2 ${col.color} border border-[#E8E8E6] rounded-[8px] p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-semibold text-slate-800">{col.label}</p>
                    <span className="text-[11px] bg-[#F7F7F5] text-[#6B6B6B] px-2 py-0.5 rounded-full">{colPartners.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colPartners.map(p => (
                      <div key={p.crn} className="bg-[#F7F7F5] border border-[#E8E8E6] rounded-[6px] p-3 hover:border-[#2563EB] transition-colors">
                        <Link href={`/kpt-admin/partners/${p.crn}`}>
                          <p className="text-[12px] font-mono text-[#2563EB] mb-1">{p.crn}</p>
                          <p className="text-[13px] font-medium text-[#2D2D2D]">{p.firmName}</p>
                          <p className="text-[11px] text-[#6B6B6B]">{p.city} · {daysSince(p.createdAt)}d ago</p>
                        </Link>
                        {col.stage === 1 && (
                          <button onClick={() => openScheduleModal(p)}
                            className="mt-2 w-full text-[11px] border border-[#BFDBFE] text-[#1E40AF] bg-[#EFF6FF] py-1.5 rounded-[4px] hover:bg-[#DBEAFE] transition-colors">
                            Schedule Visit
                          </button>
                        )}
                        {col.stage === 2 && (
                          <>
                            {p.fieldReport?.scheduledDate && (
                              <p className="text-[11px] text-[#3B82F6] mt-1.5">
                                {new Date(p.fieldReport.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                            )}
                            <Link href={`/kpt-admin/field/${p.crn}`}
                              className="mt-2 block text-center text-[11px] border border-[#A7F3D0] text-[#065F46] bg-[#ECFDF5] py-1.5 rounded-[4px] hover:bg-[#D1FAE5] transition-colors">
                              Submit Report
                            </Link>
                          </>
                        )}
                      </div>
                    ))}
                    {colPartners.length === 0 && <p className="text-[12px] text-[#6B6B6B] text-center py-3">Empty</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
