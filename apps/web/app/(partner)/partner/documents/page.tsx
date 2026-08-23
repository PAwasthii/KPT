'use client';
import { useState } from 'react';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';
import { DocUploadZone } from '@/components/kpt/DocUploadZone';

const DOCS = [
  { docType: 'gstin', label: 'GST Registration Certificate', verifyApi: 'Perfios / WhiteBooks API', acceptedFormats: 'PDF, JPG, PNG', maxSizeMb: 5 },
  { docType: 'pan', label: 'PAN Card (Proprietor / Firm)', verifyApi: 'Eko Platform / Sandbox.co.in', acceptedFormats: 'PDF, JPG, PNG', maxSizeMb: 5 },
  { docType: 'shop_establishment', label: 'Shop & Establishment Certificate', verifyApi: 'Manual KPT Review', acceptedFormats: 'PDF, JPG, PNG', maxSizeMb: 5 },
  { docType: 'cancelled_cheque', label: 'Cancelled Cheque', verifyApi: 'Penny Drop (Sandbox.co.in)', acceptedFormats: 'PDF, JPG, PNG', maxSizeMb: 5 },
  { docType: 'address_proof', label: 'Business Address Proof', verifyApi: 'Manual KPT Review', acceptedFormats: 'PDF, JPG, PNG', maxSizeMb: 5 },
  { docType: 'passport_photo', label: 'Passport Photo of Owner', verifyApi: 'Upload Only', acceptedFormats: 'JPG, PNG', maxSizeMb: 2 },
];

export default function DocumentsPage() {
  const { partner, refresh } = usePartnerAuth();
  const [verifiedDocs, setVerifiedDocs] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!partner) return null;

  const handleVerified = (docType: string) => {
    setVerifiedDocs(prev => new Set([...prev, docType]));
  };

  const allVerified = verifiedDocs.size >= 6;

  const handleSubmit = async () => {
    if (!allVerified) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/partner/stage/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crn: partner.crn, targetStage: 4 }),
        credentials: 'include',
      });
      if (res.ok) { setSubmitted(true); await refresh(); }
    } finally { setSubmitting(false); }
  };

  if (partner.currentStage < 3) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Documents</h1>
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-8 text-center">
          <div className="w-12 h-12 bg-[#FFFBEB] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#92400E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </div>
          <h2 className="text-[16px] font-semibold text-slate-800 mb-2">Document Upload Locked</h2>
          <p className="text-[14px] text-[#6B6B6B]">Document upload opens after your field verification (Stage 2) is complete. You are currently at Stage {partner.currentStage}.</p>
        </div>
      </div>
    );
  }

  if (submitted || partner.currentStage >= 4) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Documents</h1>
        <div className="bg-white border border-[#A7F3D0] rounded-[8px] p-8 text-center bg-[#ECFDF5]/50">
          <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <h2 className="text-[16px] font-semibold text-slate-800 mb-2">Documents Submitted</h2>
          <p className="text-[14px] text-[#6B6B6B]">Your documents are under review by the KPT operations team. You&apos;ll be notified once they&apos;re verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Stage 3 of 5</p>
          <h1 className="text-[22px] font-bold text-slate-800">Upload Documents</h1>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-[#2D2D2D]">{verifiedDocs.size} of 6 documents verified</p>
          <p className="text-[13px] text-[#6B6B6B]">{Math.round((verifiedDocs.size / 6) * 100)}%</p>
        </div>
        <div className="w-full h-2 bg-[#E8E8E6] rounded-full overflow-hidden">
          <div className="h-full bg-[#2563EB] rounded-full transition-all duration-500" style={{ width: `${(verifiedDocs.size / 6) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {DOCS.map(doc => (
          <DocUploadZone key={doc.docType} crn={partner.crn} onVerified={handleVerified} {...doc} />
        ))}
      </div>

      <div className={`bg-white border rounded-[8px] p-5 ${allVerified ? 'border-[#2563EB]' : 'border-[#E8E8E6]'}`}>
        <p className="text-[14px] font-semibold text-slate-800 mb-1">Submit for KPT Review</p>
        <p className="text-[13px] text-[#6B6B6B] mb-4">{allVerified ? 'All documents verified! Submit your application for KPT Sales Head review.' : `Verify all 6 documents to unlock submission. ${6 - verifiedDocs.size} remaining.`}</p>
        <button
          onClick={handleSubmit}
          disabled={!allVerified || submitting}
          className="w-full bg-[#2563EB] text-white text-[13px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Documents for KPT Review'}
        </button>
      </div>
    </div>
  );
}
