import Link from 'next/link';
import { KptNav } from '@/components/kpt/KptNav';
import { KptFooter } from '@/components/kpt/KptFooter';
import { CrnBadge } from '@/components/kpt/CrnBadge';
import { StatusBadge } from '@/components/kpt/StatusBadge';

interface DocStatus { docType: string; verifyStatus: string; uploadedAt: string; verifiedAt: string | null; }
interface TrackData {
  crn: string; firmName: string; ownerName: string; city: string; state: string;
  currentStage: number; status: string; createdAt: string;
  fieldReport: { visitedAt: string | null; verifiedAt: string | null; assignedExecName: string | null } | null;
  documents: DocStatus[];
  docCounts: { total: number; verified: number };
  agreement: { signStatus: string; signedAt: string | null; activatedAt: string | null } | null;
  statusHistory: { fromStatus: string; toStatus: string; createdAt: string; note: string | null }[];
}

const DOC_LABELS: Record<string, string> = { gstin: 'GST Certificate', pan: 'PAN Card', shop_establishment: 'Shop & Estab. Cert.', cancelled_cheque: 'Cancelled Cheque', address_proof: 'Address Proof', passport_photo: 'Passport Photo' };
const STAGE_INFO = [
  { n: 1, title: 'Online Enquiry', dept: 'Self-service' },
  { n: 2, title: 'Field Verification', dept: 'Network Development' },
  { n: 3, title: 'Document Upload', dept: 'Self-service' },
  { n: 4, title: 'KPT Approval', dept: 'Sales Head' },
  { n: 5, title: 'Agreement & Activation', dept: 'Legal / ClarityERP' },
];

async function fetchTracker(crn: string): Promise<TrackData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/partner/track/${crn}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json() as TrackData;
  } catch { return null; }
}

export default async function TrackPage({ params }: { params: Promise<{ crn: string }> }) {
  const { crn } = await params;
  const data = await fetchTracker(crn);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]"><KptNav />
        <div className="flex items-center justify-center py-20 px-6">
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-10 max-w-md text-center">
            <div className="w-12 h-12 bg-[rgba(37,99,235,0.08)] rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-[#2563EB] text-xl">?</span></div>
            <h2 className="text-[20px] font-bold text-slate-800 mb-2">CRN Not Found</h2>
            <p className="text-[14px] text-[#6B6B6B] mb-6">We couldn't find an application with CRN <strong>{crn}</strong>. Please check the number and try again.</p>
            <Link href="/partner/apply" className="bg-[#2563EB] text-white text-[13px] uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">Apply Now</Link>
          </div>
        </div>
        <KptFooter />
      </div>
    );
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="min-h-screen bg-[#F7F7F5]"><KptNav />
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header card */}
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Application Status</p>
              <h1 className="text-[20px] font-bold text-slate-800">{data.firmName}</h1>
              <p className="text-[13px] text-[#6B6B6B]">{data.city}, {data.state}</p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <CrnBadge crn={data.crn} size="md" />
        </div>

        {/* 5-step vertical tracker */}
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-6">
          <h2 className="text-[14px] font-semibold text-slate-800 mb-6">Application Progress</h2>
          <div className="space-y-0">
            {STAGE_INFO.map((stage, idx) => {
              const completed = data.currentStage > stage.n;
              const current = data.currentStage === stage.n;
              return (
                <div key={stage.n} className="flex gap-4">
                  {/* Left: circle + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${completed ? 'bg-[#2563EB]' : current ? 'bg-[#2563EB] ring-4 ring-[#FEF3E8]' : 'border-2 border-[#E8E8E6] bg-white'}`}>
                      {completed ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      ) : (
                        <span className={`text-[12px] font-bold ${current ? 'text-white' : 'text-[#6B6B6B]'}`}>{stage.n}</span>
                      )}
                    </div>
                    {idx < STAGE_INFO.length - 1 && <div className={`w-0.5 h-10 mt-1 ${completed ? 'bg-[#2563EB]' : 'bg-[#E8E8E6]'}`} />}
                  </div>
                  {/* Right: content */}
                  <div className="pb-8">
                    <p className={`text-[14px] font-semibold ${current ? 'text-[#2563EB]' : completed ? 'text-[#2D2D2D]' : 'text-[#6B6B6B]'}`}>{stage.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-1">{stage.dept}</p>
                    {/* Stage-specific detail */}
                    {stage.n === 1 && completed && <p className="text-[13px] text-[#6B6B6B]">Received on {fmt(data.createdAt)}</p>}
                    {stage.n === 2 && completed && <p className="text-[13px] text-[#6B6B6B]">Site visit completed{data.fieldReport?.verifiedAt ? ` on ${fmt(data.fieldReport.verifiedAt)}` : ''}</p>}
                    {stage.n === 2 && current && <p className="text-[13px] text-[#6B6B6B]">{data.fieldReport?.assignedExecName ? `Field executive ${data.fieldReport.assignedExecName} assigned. Visit scheduled.` : 'Awaiting field executive assignment.'}</p>}
                    {stage.n === 3 && (current || completed) && (
                      <div className="mt-1">
                        <p className="text-[13px] text-[#6B6B6B] mb-2">{data.docCounts.verified} of 6 documents verified</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(DOC_LABELS).map(([type, label]) => {
                            const doc = data.documents.find(d => d.docType === type);
                            const ok = doc?.verifyStatus === 'verified' || doc?.verifyStatus === 'manual_review';
                            return (
                              <span key={type} className={`text-[11px] px-2 py-0.5 rounded-full border ${ok ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#F7F7F5] text-[#6B6B6B] border-[#E8E8E6]'}`}>
                                {label} {ok ? '✓' : '○'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {stage.n === 4 && current && <p className="text-[13px] text-[#6B6B6B]">Under review by KPT Sales Head. Estimated 5 working days.</p>}
                    {stage.n === 5 && current && <p className="text-[13px] text-[#6B6B6B]">{data.agreement?.signStatus === 'signed' ? `Active since ${fmt(data.agreement.activatedAt)}` : 'Agreement sent for digital signing.'}</p>}
                    {stage.n === 5 && completed && data.status === 'active' && (
                      <span className="inline-flex items-center gap-1 text-[12px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 rounded-full">✓ ACTIVE</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white border border-slate-100 rounded-[8px] p-5 text-center text-slate-800">
          <p className="text-[13px]">Questions? Call us: <strong>+91-231-3528151</strong> (9AM–5PM, Mon–Sat)</p>
        </div>
      </div>
      <KptFooter />
    </div>
  );
}
