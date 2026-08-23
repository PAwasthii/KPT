'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useIsSystemAdmin } from '@/components/guards/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/kpt/StatusBadge';
import { useActivatePartner } from '@/hooks/useKpt';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';

interface Partner {
  id: string; crn: string; ownerName: string; firmName: string; mobile: string; email: string;
  city: string; state: string; currentStage: number; status: string;
  productInterest: string[]; createdAt: string;
  documents: { verifyStatus: string }[];
  fieldReport: { verifiedAt: string | null; scheduledDate: string | null; assignedExecName: string | null } | null;
}
interface Stats { total: number; stage1: number; stage2: number; stage3: number; stage4: number; stage5: number; active: number; rejected: number; recent: number; }
interface ScheduleModal { crn: string; firmName: string; city: string; currentExecName?: string | null; currentDate?: string | null; }
interface ActivateModal { crn: string; firmName: string; ownerName: string; mobile: string; email: string; city: string; state: string; }

const STAGE_LABELS = ['', 'Enquiry', 'Field Visit', 'Documents', 'Approval', 'Agreement/Active'];

const INPUT_CLS = 'w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors';
const LABEL_CLS = 'block text-xs font-medium text-foreground mb-1.5';

function StageBadge({ stage }: { stage: number }) {
  const colors: Record<number, string> = {
    1: 'bg-amber-50 text-amber-700 border-amber-200',
    2: 'bg-blue-50 text-blue-700 border-blue-200',
    3: 'bg-purple-50 text-purple-700 border-purple-200',
    4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    5: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[stage] ?? 'bg-muted text-muted-foreground border-border'}`}>
      S{stage} — {STAGE_LABELS[stage]}
    </span>
  );
}

export default function PartnerApplicationsPage() {
  const { isLoading: authLoading } = useAuth();
  const isSystemAdmin = useIsSystemAdmin();
  const router = useRouter();
  const activateMutation = useActivatePartner();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedExec, setSchedExec] = useState('');
  const [schedNote, setSchedNote] = useState('');
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');

  // Activate modal state
  const [activateModal, setActivateModal] = useState<ActivateModal | null>(null);
  const [actType, setActType] = useState('DISTRIBUTOR');
  const [actTier, setActTier] = useState('BRONZE');
  const [actRegion, setActRegion] = useState('');
  const [actTarget, setActTarget] = useState('');
  const [actCode, setActCode] = useState('');
  const [actError, setActError] = useState('');
  const [actSuccess, setActSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isSystemAdmin) router.replace('/unauthorized');
  }, [authLoading, isSystemAdmin, router]);

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

  const handleApprove = async (crn: string) => {
    setActionLoading(crn);
    try {
      await fetch(`/api/admin/partners/${crn}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', notes: 'Approved', adminId: 'admin', adminName: 'KPT Admin' }),
      });
      await fetchData();
    } finally { setActionLoading(null); }
  };

  const openSchedule = (p: Partner) => {
    setScheduleModal({ crn: p.crn, firmName: p.firmName, city: p.city, currentExecName: p.fieldReport?.assignedExecName, currentDate: p.fieldReport?.scheduledDate });
    if (p.fieldReport?.scheduledDate) {
      const d = new Date(p.fieldReport.scheduledDate);
      setSchedDate(d.toISOString().split('T')[0] ?? '');
      setSchedTime(d.toTimeString().slice(0, 5));
    } else { setSchedDate(''); setSchedTime('10:00'); }
    setSchedExec(p.fieldReport?.assignedExecName ?? '');
    setSchedNote(''); setSchedError('');
  };

  const submitSchedule = async () => {
    if (!scheduleModal || !schedDate || !schedExec.trim()) { setSchedError('Date and executive name are required.'); return; }
    setSchedLoading(true); setSchedError('');
    try {
      const res = await fetch(`/api/admin/partners/${scheduleModal.crn}/schedule-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: new Date(`${schedDate}T${schedTime}:00`).toISOString(), execName: schedExec.trim(), note: schedNote.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) { setScheduleModal(null); await fetchData(); }
      else setSchedError(data.error ?? 'Failed to schedule');
    } catch { setSchedError('Network error. Try again.'); }
    finally { setSchedLoading(false); }
  };

  const openActivate = (p: Partner) => {
    setActivateModal({ crn: p.crn, firmName: p.firmName, ownerName: p.ownerName, mobile: p.mobile, email: p.email, city: p.city, state: p.state });
    setActType('DISTRIBUTOR'); setActTier('BRONZE'); setActRegion(''); setActTarget(''); setActCode(''); setActError(''); setActSuccess('');
  };

  const submitActivate = async () => {
    if (!activateModal) return;
    setActError(''); setActSuccess('');
    activateMutation.mutate(
      { crn: activateModal.crn, data: { type: actType, tier: actTier, region: actRegion.trim() || undefined, targetAmount: actTarget ? Number(actTarget) : undefined, code: actCode.trim() || undefined } },
      {
        onSuccess: (result: any) => {
          if (result?.success) {
            setActSuccess(`Channel Partner created: ${result.data?.code ?? activateModal.crn}`);
            fetchData();
            setTimeout(() => setActivateModal(null), 2000);
          } else {
            setActError(result?.error ?? 'Activation failed');
          }
        },
        onError: (err: any) => {
          setActError(err?.response?.data?.error ?? err?.message ?? 'Activation failed');
        },
      }
    );
  };

  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isSystemAdmin) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Schedule Visit Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Schedule Field Visit</p>
              <p className="text-base font-bold text-foreground">{scheduleModal.firmName}</p>
              <p className="text-sm text-muted-foreground font-mono">{scheduleModal.crn} · {scheduleModal.city}</p>
            </div>
            <div className="p-5 space-y-4">
              {schedError && <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-sm text-destructive">{schedError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Visit Date *</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Time *</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Field Executive Name *</label>
                <input type="text" value={schedExec} onChange={e => setSchedExec(e.target.value)} placeholder="e.g. Rajesh Kumar" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Note to Partner <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea value={schedNote} onChange={e => setSchedNote(e.target.value)} placeholder="e.g. Please keep shop open. Executive will call before arriving." rows={2} className={INPUT_CLS + ' resize-none'} />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <Button onClick={submitSchedule} disabled={schedLoading} className="flex-1">
                {schedLoading ? 'Scheduling…' : 'Schedule Visit'}
              </Button>
              <Button variant="outline" onClick={() => setScheduleModal(null)} disabled={schedLoading}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Activate as Channel Partner Modal */}
      {activateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Activate as Channel Partner</p>
              <p className="text-base font-bold text-foreground">{activateModal.firmName}</p>
              <p className="text-sm text-muted-foreground font-mono">{activateModal.crn}</p>
            </div>
            <div className="p-5 space-y-4">
              {actError && <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-sm text-destructive">{actError}</div>}
              {actSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm text-emerald-700">{actSuccess}</div>}

              {/* Pre-filled info from application */}
              <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">From Application</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{activateModal.ownerName}</span>
                  <span className="text-muted-foreground">Mobile</span><span className="text-foreground font-mono">{activateModal.mobile}</span>
                  <span className="text-muted-foreground">Email</span><span className="text-foreground truncate">{activateModal.email}</span>
                  <span className="text-muted-foreground">Location</span><span className="text-foreground">{activateModal.city}, {activateModal.state}</span>
                </div>
              </div>

              {/* Operational fields — admin fills */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Partner Type *</label>
                  <select value={actType} onChange={e => setActType(e.target.value)} className={INPUT_CLS}>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="DEALER">Dealer</option>
                    <option value="RETAILER">Retailer</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Tier</label>
                  <select value={actTier} onChange={e => setActTier(e.target.value)} className={INPUT_CLS}>
                    <option value="BRONZE">Bronze</option>
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Region</label>
                  <input type="text" value={actRegion} onChange={e => setActRegion(e.target.value)} placeholder="e.g. West, South" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Annual Target (₹)</label>
                  <input type="number" value={actTarget} onChange={e => setActTarget(e.target.value)} placeholder="e.g. 1200000" min={0} className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Partner Code <span className="text-muted-foreground font-normal">(auto-generated if blank)</span></label>
                <input type="text" value={actCode} onChange={e => setActCode(e.target.value)} placeholder="e.g. CP-WZ-MH-001" className={INPUT_CLS} />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <Button onClick={submitActivate} disabled={activateMutation.isPending || !!actSuccess} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                {activateMutation.isPending ? 'Activating…' : 'Activate Channel Partner'}
              </Button>
              <Button variant="outline" onClick={() => setActivateModal(null)} disabled={activateMutation.isPending}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Channel Partners › Onboarding</p>
        <h1 className="text-2xl font-bold text-foreground">Partner Applications</h1>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'New Enquiries', value: stats.stage1, cls: 'text-amber-600' },
            { label: 'Field Visit', value: stats.stage2, cls: 'text-blue-600' },
            { label: 'Docs Pending', value: stats.stage3, cls: 'text-purple-600' },
            { label: 'Pending Approval', value: stats.stage4, cls: 'text-primary' },
            { label: 'Active Partners', value: stats.active, cls: 'text-emerald-600' },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Stage pills */}
        {stats && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStageFilter('')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!stageFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
            >All · {stats.total}</button>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStageFilter(stageFilter === String(n) ? '' : String(n))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${stageFilter === String(n) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                S{n} · {[stats.stage1, stats.stage2, stats.stage3, stats.stage4, stats.stage5][n-1]}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search CRN, firm, owner…"
          className="ml-auto w-64 border border-border rounded-md px-3 py-1.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['CRN', 'Firm / Owner', 'City', 'Stage', 'Status', 'Applied', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs uppercase tracking-widest text-muted-foreground px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.crn} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap">{p.crn}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{p.firmName}</p>
                      <p className="text-xs text-muted-foreground">{p.ownerName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{p.city}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={p.currentStage} />
                      {p.currentStage === 2 && p.fieldReport?.scheduledDate && (
                        <p className="text-xs text-blue-600 mt-1">
                          {new Date(p.fieldReport.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {p.fieldReport.assignedExecName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{daysSince(p.createdAt)}d ago</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Link href={`/partner-applications/${p.crn}`} className="text-xs text-primary hover:underline font-medium">View</Link>
                        {p.currentStage === 1 && (
                          <button onClick={() => openSchedule(p)} className="text-xs text-blue-600 hover:underline font-medium">Schedule Visit</button>
                        )}
                        {p.currentStage === 2 && (
                          <Link href={`/kpt-admin/field/${p.crn}`} className="text-xs text-emerald-700 hover:underline font-medium">Submit Report</Link>
                        )}
                        {p.currentStage === 4 && (
                          <button disabled={actionLoading === p.crn} onClick={() => handleApprove(p.crn)} className="text-xs text-emerald-700 hover:underline font-medium disabled:opacity-50">Approve</button>
                        )}
                        {p.currentStage >= 4 && p.status !== 'activated' && (
                          <button
                            onClick={() => openActivate(p)}
                            className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-medium hover:bg-emerald-700 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No partner applications found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
