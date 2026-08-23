'use client';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';
import { StatusBadge } from '@/components/kpt/StatusBadge';
import { CrnBadge } from '@/components/kpt/CrnBadge';

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-0.5">{label}</p>
      <p className="text-[14px] text-[#2D2D2D]">{value ?? '—'}</p>
    </div>
  );
}

export default function ApplicationPage() {
  const { partner } = usePartnerAuth();
  if (!partner) return null;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Partner Portal</p>
          <h1 className="text-[22px] font-bold text-slate-800">My Application</h1>
        </div>
        <StatusBadge status={partner.status} />
      </div>

      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-4">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E8E8E6]">
          <p className="text-[14px] font-semibold text-slate-800">Application Reference</p>
          <CrnBadge crn={partner.crn} size="sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner Name" value={partner.ownerName} />
          <Field label="Firm Name" value={partner.firmName} />
          <Field label="Mobile" value={partner.mobile} />
          <Field label="Email" value={partner.email} />
          <Field label="City" value={partner.city} />
          <Field label="State" value={partner.state} />
          <Field label="Submitted On" value={new Date(partner.createdAt).toLocaleDateString('en-IN')} />
          <Field label="Current Stage" value={`Stage ${partner.currentStage} of 5`} />
        </div>
      </div>

      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Product Interest</p>
        <div className="flex flex-wrap gap-2">
          {partner.productInterest.map(p => (
            <span key={p} className="text-[13px] bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#FED7AA] px-3 py-1 rounded-full">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
