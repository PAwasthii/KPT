'use client';
import Link from 'next/link';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';
import { StageStepper } from '@/components/kpt/StageStepper';
import { StatusBadge } from '@/components/kpt/StatusBadge';
import { CrnBadge } from '@/components/kpt/CrnBadge';

const STAGE_INFO = [
  { n: 1, name: 'Online Enquiry', next: 'Our field executive will be assigned to visit your location.', dept: 'Network Development Team', days: '2-3 working days' },
  { n: 2, name: 'Field Verification', next: 'The field executive has visited. Prepare your documents for upload.', dept: 'Field Executive', days: 'Ongoing' },
  { n: 3, name: 'Document Upload', next: 'Upload all 6 documents. Once verified, submit for KPT review.', dept: 'Self-service + KPT Ops', days: 'At your pace' },
  { n: 4, name: 'KPT Approval', next: 'Our Sales Head is reviewing your application. No action needed.', dept: 'KPT Sales Head', days: '5 working days' },
  { n: 5, name: 'Agreement & Signing', next: 'Review and sign your dealer agreement to go live.', dept: 'Legal / ClarityERP', days: 'Same day' },
];

export default function DashboardPage() {
  const { partner } = usePartnerAuth();
  if (!partner) return null;

  const stage = STAGE_INFO.find(s => s.n === partner.currentStage) ?? STAGE_INFO[0];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Partner Portal</p>
          <h1 className="text-[24px] font-bold text-slate-800">Welcome, {partner.firmName}</h1>
          <p className="text-[13px] text-[#6B6B6B] mt-0.5">{partner.ownerName} · {partner.city}, {partner.state}</p>
        </div>
        <CrnBadge crn={partner.crn} size="sm" />
      </div>

      {/* Progress stepper */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-5">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-4">Your Progress</p>
        <StageStepper currentStage={partner.currentStage} />
      </div>

      {/* Current stage banner */}
      <div className="bg-white border-l-4 border-[#2563EB] border border-[#E8E8E6] rounded-r-[8px] p-5 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-7 h-7 bg-[#2563EB] text-white rounded-full flex items-center justify-center text-[12px] font-bold">{partner.currentStage}</span>
          <p className="text-[16px] font-semibold text-slate-800">Stage {partner.currentStage}: {stage.name}</p>
          <StatusBadge status={partner.status} />
        </div>
        <p className="text-[14px] text-[#2D2D2D] mb-3">{stage.next}</p>
        <div className="flex gap-6">
          <div><p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">Handled by</p><p className="text-[13px] text-[#2D2D2D]">{stage.dept}</p></div>
          <div><p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">Timeline</p><p className="text-[13px] text-[#2D2D2D]">{stage.days}</p></div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {partner.currentStage === 1 && (
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5 sm:col-span-2">
            <p className="text-[14px] font-semibold text-slate-800 mb-1">Application Received</p>
            <p className="text-[13px] text-[#6B6B6B]">Your enquiry has been received. Our Network Development Team will assign a field executive to visit your location. You will be contacted at <strong>+91-{partner.mobile}</strong> to schedule the visit.</p>
          </div>
        )}
        {partner.currentStage === 2 && (
          <div className="sm:col-span-2">
            {partner.fieldVisit?.scheduledDate ? (
              <div className="bg-white border border-[#BFDBFE] rounded-[8px] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                  <p className="text-[14px] font-semibold text-[#1E40AF]">Field Visit Scheduled</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Date</p>
                    <p className="text-[13px] font-medium text-slate-800">{new Date(partner.fieldVisit.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Time</p>
                    <p className="text-[13px] font-medium text-slate-800">{new Date(partner.fieldVisit.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                  {partner.fieldVisit.execName && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Field Executive</p>
                      <p className="text-[13px] font-medium text-slate-800">{partner.fieldVisit.execName}</p>
                    </div>
                  )}
                </div>
                {partner.fieldVisit.note && (
                  <p className="text-[13px] text-[#6B6B6B] bg-[#EFF6FF] rounded px-3 py-2">{partner.fieldVisit.note}</p>
                )}
                <p className="text-[12px] text-[#6B6B6B] mt-3">Please ensure your shop is open and accessible at the scheduled time. The executive will call you at <strong>+91-{partner.mobile}</strong> before arriving.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
                <p className="text-[14px] font-semibold text-slate-800 mb-1">Field Visit Being Arranged</p>
                <p className="text-[13px] text-[#6B6B6B]">A KPT field executive has been assigned to your application. You will receive a call at <strong>+91-{partner.mobile}</strong> to confirm the visit timing. Please keep your shop accessible during business hours.</p>
              </div>
            )}
          </div>
        )}
        {partner.currentStage === 3 && (
          <div className="bg-white border border-[#2563EB]/20 rounded-[8px] p-5 sm:col-span-2 bg-[rgba(37,99,235,0.06)]">
            <p className="text-[14px] font-semibold text-slate-800 mb-2">Action Required: Upload Documents</p>
            <p className="text-[13px] text-[#6B6B6B] mb-4">Upload your 6 required documents. All documents will be verified within 24-48 hours.</p>
            <Link href="/partner/documents" className="inline-block bg-[#2563EB] text-white text-[13px] font-medium uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">Upload Documents →</Link>
          </div>
        )}
        {partner.currentStage === 4 && (
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5 sm:col-span-2">
            <p className="text-[14px] font-semibold text-slate-800 mb-1">Under Review</p>
            <p className="text-[13px] text-[#6B6B6B]">Your application is being reviewed by the KPT Sales Head. Estimated time: 5 working days. We&apos;ll notify you at {partner.mobile} once a decision is made.</p>
          </div>
        )}
        {partner.currentStage === 5 && (
          <div className="bg-white border border-[#A7F3D0] bg-[#ECFDF5]/50 rounded-[8px] p-5 sm:col-span-2">
            <p className="text-[14px] font-semibold text-[#065F46] mb-2">Application Approved!</p>
            <p className="text-[13px] text-[#6B6B6B] mb-4">Congratulations! Your KPT dealer agreement is ready. Review and sign it digitally to complete your onboarding.</p>
            <Link href="/partner/agreement" className="inline-block bg-[#2563EB] text-white text-[13px] font-medium uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">Sign Agreement →</Link>
          </div>
        )}
      </div>

      {/* Product interest */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Authorised Product Lines</p>
        <div className="flex flex-wrap gap-2">
          {partner.productInterest.map(p => (
            <span key={p} className="text-[12px] bg-[#F7F7F5] border border-[#E8E8E6] text-[#2D2D2D] px-3 py-1 rounded-full">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
