'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useIsSystemAdmin } from '@/components/guards/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/kpt/StatusBadge';
import { StageStepper } from '@/components/kpt/StageStepper';
import { CrnBadge } from '@/components/kpt/CrnBadge';

interface DocItem {
  id: string;
  docType: string;
  fileName: string | null;
  storagePath: string | null;
  verifyStatus: string;
  uploadedAt: string;
  verifiedAt: string | null;
  failReason: string | null;
}
interface FieldReport {
  assignedExecId: string | null; assignedExecName: string | null;
  shopDimensions: string | null; locationScore: string | null;
  roadVisibility: string | null; existingLines: string | null;
  marketPotential: string | null; nearestDealer: string | null;
  geoLat: number | null; geoLng: number | null;
  execNotes: string | null; visitedAt: string | null;
  verifiedAt: string | null; scheduledDate: string | null; scheduleNote: string | null;
}
interface ApprovalLog { id: string; action: string; doneByName: string | null; notes: string | null; createdAt: string; }
interface StatusHistory { id: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string; }
interface PartnerDetail {
  crn: string; ownerName: string; firmName: string; mobile: string; email: string;
  city: string; district: string; state: string; pincode: string;
  shopSizeSqft: number | null; existingBrands: string | null;
  yearsInBusiness: number | null; turnoverRange: string | null;
  productInterest: string[]; currentStage: number; status: string; createdAt: string;
  fieldReport: FieldReport | null;
  documents: DocItem[];
  approvalLogs: ApprovalLog[];
  statusHistory: StatusHistory[];
  agreement: { signStatus: string; signedAt: string | null; activatedAt: string | null } | null;
}

const DOC_LABELS: Record<string, string> = {
  gstin: 'GST Certificate',
  pan: 'PAN Card',
  shop_establishment: 'Shop & Establishment',
  cancelled_cheque: 'Cancelled Cheque',
  address_proof: 'Address Proof',
  passport_photo: 'Passport Photo',
};

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#2D2D2D]">{value ?? '—'}</p>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    manual_review: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const label: Record<string, string> = {
    verified: 'Verified',
    manual_review: 'Manual Review',
    failed: 'Rejected',
    pending: 'Pending',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cfg[status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {label[status] ?? status}
    </span>
  );
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

  // Per-document review state
  const [docActions, setDocActions] = useState<Record<string, 'loading' | 'done'>>({});
  const [rejectInputs, setRejectInputs] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [approveAllResult, setApproveAllResult] = useState<string | null>(null);

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

  const handleStageAction = async (action: 'approve' | 'reject' | 'more_info') => {
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

  const handleDocAction = async (docId: string, action: 'approve_doc' | 'reject_doc') => {
    setDocActions(prev => ({ ...prev, [docId]: 'loading' }));
    try {
      const reason = rejectInputs[docId];
      await fetch(`/api/admin/partners/${crn}/review-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, docId, reason, adminId: 'admin', adminName: 'KPT Admin' }),
      });
      setDocActions(prev => ({ ...prev, [docId]: 'done' }));
      setRejectOpen(prev => ({ ...prev, [docId]: false }));
      await fetchPartner();
    } catch {
      setDocActions(prev => { const n = { ...prev }; delete n[docId]; return n; });
    }
  };

  const handleApproveAll = async () => {
    setApproveAllLoading(true);
    setApproveAllResult(null);
    try {
      const res = await fetch(`/api/admin/partners/${crn}/review-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all', adminId: 'admin', adminName: 'KPT Admin' }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setApproveAllResult('All documents approved. Partner advanced to Stage 5 — Agreement & Signing.');
        await fetchPartner();
      } else {
        setApproveAllResult(data.error ?? 'Failed to approve');
      }
    } finally { setApproveAllLoading(false); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString('en-IN') : '—';

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isSystemAdmin) return null;
  if (!partner) return (
    <div className="p-6">
      <p className="text-[14px] text-[#6B6B6B]">Partner not found. <Link href="/partner-applications" className="text-[#2563EB] hover:underline">Back to list</Link></p>
    </div>
  );

  const docs = partner.documents;
  const hasRejectedDocs = docs.some(d => d.verifyStatus === 'failed');
  const allDocsApproved = docs.length > 0 && docs.every(d => d.verifyStatus === 'verified');

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
                {partner.productInterest.map(pi => (
                  <span key={pi} className="text-[11px] bg-[rgba(37,99,235,0.08)] text-[#2563EB] px-2 py-0.5 rounded">{pi}</span>
                ))}
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
              {partner.fieldReport.scheduledDate && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] px-3 py-2.5 mb-3">
                  <p className="text-[12px] font-medium text-[#1E40AF]">
                    Scheduled: {new Date(partner.fieldReport.scheduledDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                  {partner.fieldReport.assignedExecName && <p className="text-[12px] text-[#3B82F6]">Executive: {partner.fieldReport.assignedExecName}</p>}
                  {partner.fieldReport.scheduleNote && <p className="text-[12px] text-[#6B6B6B] mt-1 italic">"{partner.fieldReport.scheduleNote}"</p>}
                </div>
              )}
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
              {partner.fieldReport.execNotes && (
                <p className="text-[12px] bg-[#F7F7F5] rounded p-2 text-[#2D2D2D]">{partner.fieldReport.execNotes}</p>
              )}
              {partner.fieldReport.geoLat && partner.fieldReport.geoLng && (
                <a href={`https://www.google.com/maps?q=${partner.fieldReport.geoLat},${partner.fieldReport.geoLng}`} target="_blank" rel="noreferrer"
                  className="mt-2 block text-[12px] text-[#2563EB] hover:underline">View on Google Maps</a>
              )}
              <Link href={`/partner-applications/field/${partner.crn}`}
                className="mt-3 block text-center border border-[#E8E8E6] text-[#2563EB] text-xs py-2 rounded-md hover:bg-[#F7F7F5] transition-colors">
                {partner.fieldReport.visitedAt ? 'Reassign Field Exec' : 'Submit Field Report'}
              </Link>
            </div>
          )}

          {/* DOCUMENT REVIEW PANEL — Stage 3, 4, or 5 */}
          {(partner.currentStage >= 3 || partner.documents.length > 0) && (
            <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Document Review</p>
                {partner.documents.length > 0 && (
                  <span className="text-[11px] text-[#6B6B6B]">
                    {partner.documents.filter(d => d.verifyStatus === 'verified').length} / {partner.documents.length} verified
                  </span>
                )}
              </div>

              {partner.documents.length === 0 ? (
                <p className="text-[13px] text-[#6B6B6B]">No documents uploaded yet. Partner is at Stage {partner.currentStage}.</p>
              ) : (
                <div className="space-y-3">
                  {partner.documents.map(doc => (
                    <div key={doc.id} className="border border-[#E8E8E6] rounded-[6px] p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#2D2D2D]">{DOC_LABELS[doc.docType] ?? doc.docType}</p>
                          <p className="text-[11px] text-[#6B6B6B] truncate">{doc.fileName ?? 'No filename'}</p>
                          {doc.failReason && (
                            <p className="text-[11px] text-red-600 mt-0.5">Reason: {doc.failReason}</p>
                          )}
                          <p className="text-[10px] text-[#9CA3AF]">
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                            {doc.verifiedAt && ` · Verified ${new Date(doc.verifiedAt).toLocaleDateString('en-IN')}`}
                          </p>
                        </div>
                        <DocStatusBadge status={doc.verifyStatus} />
                      </div>

                      {/* Action buttons — only show if not already verified/failed at stage 4 */}
                      {partner.currentStage <= 4 && doc.verifyStatus !== 'verified' && (
                        <div className="space-y-2">
                          {rejectOpen[doc.id] ? (
                            <div className="space-y-1.5">
                              <input
                                value={rejectInputs[doc.id] ?? ''}
                                onChange={e => setRejectInputs(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                placeholder="Reason for rejection (required)"
                                className="w-full border border-[#E8E8E6] rounded-[4px] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#2563EB]"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleDocAction(doc.id, 'reject_doc')}
                                  disabled={!rejectInputs[doc.id]?.trim() || docActions[doc.id] === 'loading'}
                                  className="flex-1 bg-red-600 text-white text-[11px] py-1.5 rounded-[3px] disabled:opacity-50"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  onClick={() => setRejectOpen(prev => ({ ...prev, [doc.id]: false }))}
                                  className="flex-1 border border-[#E8E8E6] text-[#6B6B6B] text-[11px] py-1.5 rounded-[3px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleDocAction(doc.id, 'approve_doc')}
                                disabled={docActions[doc.id] === 'loading'}
                                className="flex-1 bg-emerald-600 text-white text-[11px] py-1.5 rounded-[3px] hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                {docActions[doc.id] === 'loading' ? '…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => setRejectOpen(prev => ({ ...prev, [doc.id]: true }))}
                                disabled={docActions[doc.id] === 'loading'}
                                className="flex-1 border border-red-200 text-red-600 text-[11px] py-1.5 rounded-[3px] hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {doc.verifyStatus === 'verified' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-[11px] text-emerald-600 font-medium">Approved</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Approve All & Advance — show at Stage 3 or 4, only if not already at 5 */}
                  {partner.currentStage <= 4 && partner.documents.length > 0 && (
                    <div className={`border rounded-[6px] p-4 ${allDocsApproved ? 'border-emerald-200 bg-emerald-50' : 'border-[#E8E8E6] bg-[#F7F7F5]'}`}>
                      {hasRejectedDocs && (
                        <p className="text-[12px] text-red-600 mb-3 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                          </svg>
                          {partner.documents.filter(d => d.verifyStatus === 'failed').length} document(s) rejected — partner must re-upload.
                        </p>
                      )}
                      {approveAllResult && (
                        <p className={`text-[12px] mb-3 px-3 py-2 rounded ${approveAllResult.includes('Advanced') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                          {approveAllResult}
                        </p>
                      )}
                      <p className="text-[12px] text-[#6B6B6B] mb-3">
                        {allDocsApproved
                          ? 'All documents verified. You can now advance this partner to Stage 5 (Agreement Signing).'
                          : `Review all documents above. Approving all will mark remaining docs as verified and advance partner to Agreement stage.`
                        }
                      </p>
                      <button
                        onClick={handleApproveAll}
                        disabled={approveAllLoading || partner.currentStage === 5}
                        className="w-full bg-emerald-700 text-white text-[13px] font-semibold py-2.5 rounded-[4px] hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                      >
                        {approveAllLoading
                          ? 'Processing…'
                          : partner.currentStage === 5
                          ? 'Documents Approved — Agreement Sent'
                          : 'Approve All Documents & Advance to Agreement'}
                      </button>
                    </div>
                  )}

                  {/* Stage 5: show agreement status */}
                  {partner.currentStage === 5 && partner.agreement && (
                    <div className={`border rounded-[6px] p-4 ${partner.agreement.signStatus === 'signed' ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
                      <p className="text-[13px] font-semibold text-[#2D2D2D] mb-1">
                        Agreement Status: <span className={partner.agreement.signStatus === 'signed' ? 'text-emerald-700' : 'text-blue-700'}>
                          {partner.agreement.signStatus === 'signed' ? 'Signed' : 'Sent — Awaiting Partner Signature'}
                        </span>
                      </p>
                      {partner.agreement.signedAt && (
                        <p className="text-[12px] text-[#6B6B6B]">Signed on: {fmt(partner.agreement.signedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Approval panel — Stage 4 only (for reject / more_info decisions after reviewing docs) */}
          {partner.currentStage === 4 && (
            <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#2563EB] mb-3">Override Decision</p>
              <p className="text-[12px] text-[#6B6B6B] mb-3">Use the Document Review panel (centre) to approve all documents and advance to agreement. Use this panel only for rejection or requesting more information.</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes for applicant (required for reject / more info)…"
                className="w-full border border-[#E8E8E6] rounded-[4px] px-3 py-2 text-[13px] text-[#2D2D2D] focus:outline-none focus:border-[#2563EB] mb-3 min-h-[80px] resize-none" />
              {actionResult && <p className="text-[12px] text-[#065F46] bg-[#ECFDF5] rounded px-3 py-2 mb-3">{actionResult}</p>}
              <div className="flex flex-col gap-2">
                <button onClick={() => handleStageAction('more_info')} disabled={actionLoading || !notes} className="w-full bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D] text-[13px] py-2.5 rounded-[4px] disabled:opacity-50 transition-colors">Request More Info</button>
                <button onClick={() => handleStageAction('reject')} disabled={actionLoading || !notes} className="w-full bg-red-50 text-red-700 border border-red-200 text-[13px] py-2.5 rounded-[4px] disabled:opacity-50 transition-colors">Reject Application</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-2">Current Stage</p>
            <p className="text-[16px] font-bold text-slate-800">Stage {partner.currentStage} of 5</p>
            <StatusBadge status={partner.status} className="mt-2" />
            <div className="mt-3 pt-3 border-t border-[#E8E8E6] space-y-1">
              {[
                { s: 1, label: 'Online Enquiry' },
                { s: 2, label: 'Field Verification' },
                { s: 3, label: 'Document Upload' },
                { s: 4, label: 'KPT Approval' },
                { s: 5, label: 'Agreement & Signing' },
              ].map(({ s, label }) => (
                <div key={s} className={`flex items-center gap-2 text-[12px] ${s === partner.currentStage ? 'font-semibold text-[#2563EB]' : s < partner.currentStage ? 'text-emerald-600' : 'text-[#9CA3AF]'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${s === partner.currentStage ? 'bg-[#2563EB] text-white' : s < partner.currentStage ? 'bg-emerald-600 text-white' : 'bg-[#E8E8E6] text-[#9CA3AF]'}`}>
                    {s < partner.currentStage ? '✓' : s}
                  </span>
                  {label}
                </div>
              ))}
            </div>
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
