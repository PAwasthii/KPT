'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useIsSystemAdmin } from '@/components/guards/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/kpt/StatusBadge';
import { StageStepper } from '@/components/kpt/StageStepper';
import { CrnBadge } from '@/components/kpt/CrnBadge';

interface DocItem { id: string; docType: string; fileName: string | null; verifyStatus: string; uploadedAt: string; verifiedAt: string | null; failReason: string | null; }
interface FieldReport { assignedExecId: string | null; assignedExecName: string | null; shopDimensions: string | null; locationScore: string | null; roadVisibility: string | null; existingLines: string | null; marketPotential: string | null; nearestDealer: string | null; geoLat: number | null; geoLng: number | null; execNotes: string | null; visitedAt: string | null; verifiedAt: string | null; scheduledDate: string | null; scheduleNote: string | null; }
interface ApprovalLog { id: string; action: string; doneByName: string | null; notes: string | null; createdAt: string; }
interface StatusHistory { id: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string; }
interface PartnerDetail {
  crn: string; ownerName: string; firmName: string; mobile: string; email: string; city: string; district: string; state: string; pincode: string;
  shopSizeSqft: number | null; existingBrands: string | null; yearsInBusiness: number | null; turnoverRange: string | null; productInterest: string[];
  currentStage: number; status: string; createdAt: string;
  fieldReport: FieldReport | null;
  documents: DocItem[];
  approvalLogs: ApprovalLog[];
  statusHistory: StatusHistory[];
  agreement: { signStatus: string; signedAt: string | null; activatedAt: string | null } | null;
}

const DOC_LABELS: Record<string, string> = { gstin: 'GST Certificate', pan: 'PAN Card', shop_establishment: 'Shop & Estab.', cancelled_cheque: 'Cancelled Cheque', address_proof: 'Address Proof', passport_photo: 'Passport Photo' };

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">{label}</p><p className="text-[13px] text-[#2D2D2D]">{value ?? '—'}</p></div>;
}

export default function PartnerDetailPage() {
  const { crn } = useParams<{ crn: string }>();
  const { isLoading: authLoading } = useAuth();
  const isSystemAdmin = useIsSystemAdmin();
  const router = useRouter();

  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionResult, setActionResult] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSystemAdmin) router.replace('/unauthorized');
  }, [authLoading, isSystemAdmin, router]);

  const fetchPartner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${crn}`);
      if (res.ok) setPartner(await res.json() as PartnerDetail);
    } finally { setLoading(false); }
  }, [crn]);

  useEffect(() => { fetchPartner(); }, [fetchPartner]);

  const handleAction = async (action: 'approve' | 'reject' | 'more_info') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${crn}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, adminId: 'admin', adminName: 'KPT Admin' }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      setActionResult(data.success ? `${action} successful` : (data.error ?? 'Action failed'));
      if (data.success) { await fetchPartner(); setNotes(''); }
    } finally { setActionLoading(false); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString('en-IN') : '—';

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isSystemAdmin) return null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!partner) return (
    <div className="p-6">
      <p className="text-[14px] text-[#6B6B6B]">Partner not found. <Link href="/partner-applications" className="text-[#2563EB] hover:underline">Back to list</Link></p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#6B6B6B] mb-4">
        <Link href="/partner-applications" className="hover:text-[#2563EB]">Partner Applications</Link>
        <span>›</span>
        <span className="text-[#2D2D2D]">{partner.crn}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">{partner.firmName}</h1>
          <p className="text-[13px] text-[#6B6B6B]">{partner.ownerName} · {partner.city}, {partner.state}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={partner.status} />
          <CrnBadge crn={partner.crn} size="sm" />
        </div>
      </div>

      {/* Stage stepper */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5 mb-5">
        <StageStepper currentStage={partner.currentStage} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-4">Partner Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mobile" value={partner.mobile} />
              <Field label="Email" value={partner.email} />
              <Field label="Pincode" value={partner.pincode} />
              <Field label="District" value={partner.district} />
              <Field label="Shop Size" value={partner.shopSizeSqft ? `${partner.shopSizeSqft} sq ft` : null} />
              <Field label="Years in Biz" value={partner.yearsInBusiness ? `${partner.yearsInBusiness}+ yrs` : null} />
              <Field label="Turnover" value={partner.turnoverRange} />
              <Field label="Existing Brands" value={partner.existingBrands} />
            </div>
            <div className="mt-3 pt-3 border-t border-[#E8E8E6]">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-1.5">Product Interest</p>
              <div className="flex flex-wrap gap-1.5">
                {partner.productInterest.map(pi => <span key={pi} className="text-[11px] bg-[rgba(37,99,235,0.08)] text-[#2563EB] px-2 py-0.5 rounded">{pi}</span>)}
              </div>
            </div>
            <p className="text-[11px] text-[#6B6B6B] mt-3">Applied: {fmt(partner.createdAt)}</p>
          </div>

          {/* Status history */}
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Status History</p>
            <div className="space-y-2">
              {(partner.statusHistory ?? []).slice().reverse().map(h => (
                <div key={h.id} className="text-[12px] border-l-2 border-[#E8E8E6] pl-3">
                  <p className="font-medium text-[#2D2D2D]">{h.toStatus.replace(/_/g, ' ')}</p>
                  {h.note && <p className="text-[#6B6B6B]">{h.note}</p>}
                  <p className="text-[#9CA3AF]">{fmt(h.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTRE */}
        <div className="space-y-4">
          {/* Field visit info */}
          {partner.fieldReport && (
            <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Field Verification</p>

              {/* Scheduled info */}
              {partner.fieldReport.scheduledDate && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] px-3 py-2.5 mb-3">
                  <p className="text-[12px] font-medium text-[#1E40AF]">Scheduled: {new Date(partner.fieldReport.scheduledDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  {partner.fieldReport.assignedExecName && <p className="text-[12px] text-[#3B82F6]">Executive: {partner.fieldReport.assignedExecName}</p>}
                  {partner.fieldReport.scheduleNote && <p className="text-[12px] text-[#6B6B6B] mt-1 italic">"{partner.fieldReport.scheduleNote}"</p>}
                </div>
              )}

              {/* Completed report */}
              {partner.fieldReport.visitedAt && (
                <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
                  <div><p className="text-[#6B6B6B]">Visited</p><p className="text-[#2D2D2D]">{new Date(partner.fieldReport.visitedAt).toLocaleDateString('en-IN')}</p></div>
                  <div><p className="text-[#6B6B6B]">Dimensions</p><p className="text-[#2D2D2D]">{partner.fieldReport.shopDimensions ?? '—'}</p></div>
                  <div><p className="text-[#6B6B6B]">Road Visibility</p><p className="text-[#2D2D2D]">{partner.fieldReport.roadVisibility ?? '—'}</p></div>
                  <div><p className="text-[#6B6B6B]">Location Score</p><p className="text-[#2D2D2D]">{partner.fieldReport.locationScore ?? '—'}</p></div>
                  <div><p className="text-[#6B6B6B]">Market Potential</p><p className="text-[#2D2D2D]">{partner.fieldReport.marketPotential ?? '—'}</p></div>
                  <div><p className="text-[#6B6B6B]">Nearest Dealer</p><p className="text-[#2D2D2D]">{partner.fieldReport.nearestDealer ?? '—'}</p></div>
                </div>
              )}
              {partner.fieldReport.execNotes && <p className="text-[12px] bg-[#F7F7F5] rounded p-2 text-[#2D2D2D]">{partner.fieldReport.execNotes}</p>}
              {partner.fieldReport.geoLat && partner.fieldReport.geoLng && (
                <a href={`https://www.google.com/maps?q=${partner.fieldReport.geoLat},${partner.fieldReport.geoLng}`} target="_blank" rel="noreferrer"
                  className="mt-2 block text-[12px] text-[#2563EB] hover:underline">View on Google Maps</a>
              )}
              <Link href={`/partner-applications/field/${partner.crn}`} className="mt-3 block text-center border border-border text-primary text-xs py-2 rounded-md hover:bg-accent transition-colors">
                {partner.fieldReport.visitedAt ? 'Reassign Field Exec' : 'Submit Field Report'}
              </Link>
            </div>
          )}

          {/* Documents */}
          {partner.documents && partner.documents.length > 0 && (
            <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Documents</p>
              <div className="space-y-2">
                {partner.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-[#E8E8E6] last:border-0">
                    <div>
                      <p className="text-[13px] text-[#2D2D2D]">{DOC_LABELS[doc.docType] ?? doc.docType}</p>
                      <p className="text-[11px] text-[#6B6B6B]">{doc.fileName ?? 'No file'}</p>
                      {doc.failReason && <p className="text-[11px] text-[#2563EB]">{doc.failReason}</p>}
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      doc.verifyStatus === 'verified' ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' :
                      doc.verifyStatus === 'manual_review' ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' :
                      doc.verifyStatus === 'failed' ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#FED7AA]' :
                      'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]'
                    }`}>{doc.verifyStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Approval panel — Stage 4 only */}
          {partner.currentStage === 4 && (
            <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#2563EB] mb-3">Approval Decision</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes for applicant (required for reject / more info)…"
                className="w-full border border-[#E8E8E6] rounded-[4px] px-3 py-2 text-[13px] text-[#2D2D2D] focus:outline-none focus:border-[#2563EB] mb-3 min-h-[80px] resize-none" />
              {actionResult && <p className="text-[12px] text-[#065F46] bg-[#ECFDF5] rounded px-3 py-2 mb-3">{actionResult}</p>}
              <div className="flex flex-col gap-2">
                <button onClick={() => handleAction('approve')} disabled={actionLoading} className="w-full bg-[#065F46] text-white text-[13px] py-2.5 rounded-[4px] hover:bg-[#047857] disabled:opacity-50 transition-colors">Approve</button>
                <button onClick={() => handleAction('more_info')} disabled={actionLoading || !notes} className="w-full bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D] text-[13px] py-2.5 rounded-[4px] disabled:opacity-50 transition-colors">Request More Info</button>
                <button onClick={() => handleAction('reject')} disabled={actionLoading || !notes} className="w-full bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#FED7AA] text-[13px] py-2.5 rounded-[4px] disabled:opacity-50 transition-colors">Reject</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-2">Current Stage</p>
            <p className="text-[16px] font-bold text-slate-800">Stage {partner.currentStage} of 5</p>
            <StatusBadge status={partner.status} className="mt-2" />
          </div>

          {/* Activity log */}
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Activity Log</p>
            <div className="space-y-3">
              {(partner.approvalLogs ?? []).slice().reverse().map(log => (
                <div key={log.id} className="text-[12px] border-l-2 border-[#E8E8E6] pl-3">
                  <p className="font-medium text-[#2D2D2D]">{log.action.replace(/_/g, ' ')}</p>
                  {log.doneByName && <p className="text-[#6B6B6B]">by {log.doneByName}</p>}
                  {log.notes && <p className="text-[#6B6B6B] italic">"{log.notes}"</p>}
                  <p className="text-[#9CA3AF]">{fmt(log.createdAt)}</p>
                </div>
              ))}
              {(!partner.approvalLogs || partner.approvalLogs.length === 0) && (
                <p className="text-[12px] text-[#6B6B6B]">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
