'use client';
import { useState } from 'react';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';

export default function AgreementPage() {
  const { partner, refresh } = usePartnerAuth();
  const [signing, setSigning] = useState(false);
  const [otp, setOtp] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [signed, setSigned] = useState(false);

  if (!partner) return null;

  const handleMockSign = async () => {
    if (otp !== '123456') { alert('Invalid OTP. Dev mode OTP is 123456'); return; }
    setSigning(true);
    try {
      // In dev: directly call webhook-like endpoint to mark signed
      await fetch('/api/webhooks/esign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: `MOCK-ESIGN-${partner.crn}-0`, status: 'signed' }),
      });
      setSigned(true);
      setShowModal(false);
      await refresh();
    } finally { setSigning(false); }
  };

  // Stage < 5
  if (partner.currentStage < 5) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Dealer Agreement</h1>
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-8 text-center">
          <div className="w-12 h-12 bg-[#FFFBEB] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#92400E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </div>
          <h2 className="text-[16px] font-semibold text-slate-800 mb-2">Agreement Not Yet Available</h2>
          <p className="text-[14px] text-[#6B6B6B]">Your dealer agreement will be prepared once your application is approved by KPT (Stage 4). You are currently at Stage {partner.currentStage}.</p>
        </div>
      </div>
    );
  }

  // Stage 5 — signed
  if (signed || partner.status === 'active') {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Dealer Agreement</h1>
        <div className="bg-white border border-[#A7F3D0] rounded-[8px] p-8 text-center bg-[#ECFDF5]/30">
          <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <h2 className="text-[24px] font-bold text-slate-800 mb-2">You are now an authorised KPT dealer!</h2>
          <p className="text-[14px] text-[#6B6B6B] mb-4">Your dealer agreement has been signed and your account is now active.</p>
          <div className="bg-[#F7F7F5] rounded-[6px] p-4 mb-6 text-left">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Your Permanent Dealer Code (CRN)</p>
            <p className="text-[18px] font-mono font-bold text-[#2563EB]">{partner.crn}</p>
          </div>
          <p className="text-[13px] text-[#6B6B6B] mb-6">Your ClarityERP credentials will be shared within 24 hours. For queries, call <strong>+91-231-3528151</strong>.</p>
        </div>
      </div>
    );
  }

  // Stage 5 — pending signing
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-[22px] font-bold text-slate-800 mb-6">Dealer Agreement</h1>

      {/* Agreement preview */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-5">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-4">Agreement Summary</p>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-[#E8E8E6]">
            <span className="text-[13px] text-[#6B6B6B]">Dealer Territory</span>
            <span className="text-[13px] font-medium text-[#2D2D2D]">{partner.city}, {partner.state}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#E8E8E6]">
            <span className="text-[13px] text-[#6B6B6B]">Product Lines</span>
            <span className="text-[13px] font-medium text-[#2D2D2D] text-right max-w-[200px]">{partner.productInterest.join(', ')}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#E8E8E6]">
            <span className="text-[13px] text-[#6B6B6B]">Agreement Date</span>
            <span className="text-[13px] font-medium text-[#2D2D2D]">{new Date().toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[13px] text-[#6B6B6B]">CRN (Dealer Code)</span>
            <span className="text-[13px] font-mono font-bold text-[#2563EB]">{partner.crn}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] p-4 mb-5">
        <p className="text-[13px] text-[#92400E]">By signing, you agree to the KPT Authorised Channel Partner terms including territory restrictions, minimum stock obligations, and pricing guidelines.</p>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] transition-colors"
      >
        Sign with Aadhaar OTP
      </button>

      {/* Mock signing modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[8px] p-6 max-w-sm w-full">
            <h3 className="text-[16px] font-bold text-slate-800 mb-2">Sign Agreement</h3>
            <p className="text-[13px] text-[#6B6B6B] mb-4">Enter OTP sent to your Aadhaar-linked mobile.</p>
            <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded px-3 py-2 mb-4">
              <p className="text-[12px] text-[#92400E]">Dev mode — use OTP: <strong>123456</strong></p>
            </div>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="w-full border border-[#E8E8E6] rounded-[4px] px-4 py-3 text-[20px] text-center tracking-[0.3em] focus:outline-none focus:border-[#2563EB] mb-4"
              placeholder="••••••"
              maxLength={6}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E8E8E6] text-[#6B6B6B] text-[13px] py-2.5 rounded-[4px] hover:border-[#2D2D2D]">Cancel</button>
              <button onClick={handleMockSign} disabled={signing || otp.length !== 6} className="flex-1 bg-[#2563EB] text-white text-[13px] py-2.5 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60">
                {signing ? 'Signing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
