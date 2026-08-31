'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function EsignTestInner() {
  const params = useSearchParams();
  const ref = params.get('ref') ?? '';
  const crn = params.get('crn') ?? '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSign = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/webhooks/esign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ref, status: 'signing_complete' }),
      });
      if (res.ok) {
        setStatus('done');
        setMessage('Agreement signed successfully. You can close this tab and return to the partner portal.');
      } else {
        const d = await res.json() as { error?: string };
        setStatus('error');
        setMessage(d.error ?? 'Signing failed');
      }
    } catch {
      setStatus('error');
      setMessage('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E8E8E6] rounded-[10px] p-8 max-w-md w-full shadow-sm">

        {/* Dev mode banner */}
        <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] px-3 py-2 mb-6 flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#92400E] uppercase tracking-wide">Dev Mode</span>
          <span className="text-[11px] text-[#92400E]">— This page simulates the Digio signing portal</span>
        </div>

        <div className="w-14 h-14 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>

        {status === 'done' ? (
          <>
            <div className="w-12 h-12 bg-[#ECFDF5] border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-slate-800 text-center mb-2">Agreement Signed</h1>
            <p className="text-[13px] text-[#6B6B6B] text-center">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-[18px] font-bold text-slate-800 text-center mb-1">Sign Agreement</h1>
            <p className="text-[13px] text-[#6B6B6B] text-center mb-6">KPT Authorised Channel Partner Agreement</p>

            <div className="bg-[#F7F7F5] border border-[#E8E8E6] rounded-[6px] p-4 mb-6 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">CRN</span>
                <span className="font-mono font-semibold text-[#2563EB]">{crn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Reference</span>
                <span className="font-mono text-[#2D2D2D] truncate max-w-[180px]">{ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B6B]">Provider</span>
                <span className="text-[#2D2D2D]">Digio eSign (Dev Simulation)</span>
              </div>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-[6px] px-3 py-2 mb-4">
                <p className="text-[12px] text-red-700">{message}</p>
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={status === 'loading' || !ref}
              className="w-full bg-[#2563EB] text-white text-[14px] font-semibold py-3 rounded-[6px] hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {status === 'loading' ? 'Signing…' : 'Confirm & Sign Agreement'}
            </button>

            <p className="text-[11px] text-[#9CA3AF] text-center mt-4">
              In production this portal is hosted by Digio and requires identity verification.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function EsignTestPage() {
  return (
    <Suspense>
      <EsignTestInner />
    </Suspense>
  );
}
