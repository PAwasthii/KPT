'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const step1Schema = z.object({
  crn: z.string().regex(/^KPT-CP-\d{4}-\d{5}$/, 'Enter CRN in format KPT-CP-YYYY-NNNNN'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile'),
});
const step2Schema = z.object({ otp: z.string().length(6, 'Enter 6-digit OTP') });
type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

const INPUT = 'w-full border border-[#E8E8E6] rounded-[4px] px-4 py-3 text-[14px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB] transition-colors';
const ERR = 'text-[12px] text-[#2563EB] mt-1';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [crnMobile, setCrnMobile] = useState({ crn: '', mobile: '' });
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });

  const onStep1 = async (data: Step1) => {
    setServerError(null);
    try {
      const res = await fetch('/api/partner/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { sent?: boolean; devOtp?: string; error?: string };
      if (!res.ok) { setServerError(json.error ?? 'Login failed'); return; }
      setCrnMobile(data);
      if (json.devOtp) setDevOtp(json.devOtp);
      setStep(2);
    } catch { setServerError('Network error. Please try again.'); }
  };

  const onStep2 = async (data: Step2) => {
    setServerError(null);
    try {
      const res = await fetch('/api/partner/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...crnMobile, otp: data.otp }),
        credentials: 'include',
      });
      const json = await res.json() as { crn?: string; firmName?: string; error?: string };
      if (!res.ok) { setServerError(json.error ?? 'Invalid OTP'); return; }
      router.push('/partner/dashboard');
    } catch { setServerError('Network error. Please try again.'); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left */}
      <div className="bg-[#2563EB] flex flex-col items-center justify-center p-12 text-white">
        <Image src="https://kpt.co.in/logo_full_white.svg" alt="KPT" width={160} height={56} className="mb-10 object-contain" unoptimized />
        <h1 className="text-[28px] font-bold text-center mb-3">KPT Partner Portal</h1>
        <p className="text-[16px] text-white/80 text-center mb-8">Access your onboarding dashboard</p>
        <ul className="space-y-3 w-full max-w-xs">
          {['Track your application stage', 'Upload and manage documents', 'Sign your dealer agreement'].map(f => (
            <li key={f} className="flex items-center gap-3 text-[14px]">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>{f}
            </li>
          ))}
        </ul>
      </div>

      {/* Right */}
      <div className="bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-[24px] font-bold text-slate-800 mb-1">Partner Login</h2>
          <p className="text-[13px] text-[#6B6B6B] mb-8">
            {step === 1 ? 'Enter your CRN and mobile number to receive an OTP.' : `OTP sent to +91-${crnMobile.mobile.slice(0, 2)}••••••${crnMobile.mobile.slice(-2)}`}
          </p>

          {serverError && <div className="bg-[rgba(37,99,235,0.08)] border border-[#FED7AA] rounded-[6px] p-3 mb-5"><p className="text-[13px] text-[#2563EB]">{serverError}</p></div>}

          {step === 1 ? (
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1.5">Channel Reference Number (CRN)</label>
                <input {...form1.register('crn')} className={INPUT} placeholder="KPT-CP-2025-00142" />
                {form1.formState.errors.crn && <p className={ERR}>{form1.formState.errors.crn.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1.5">Registered Mobile Number</label>
                <input {...form1.register('mobile')} className={INPUT} placeholder="9876543210" maxLength={10} />
                {form1.formState.errors.mobile && <p className={ERR}>{form1.formState.errors.mobile.message}</p>}
              </div>
              <button type="submit" disabled={form1.formState.isSubmitting} className="w-full bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors">
                {form1.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1.5">6-Digit OTP</label>
                <input {...form2.register('otp')} className={INPUT + ' text-center text-[24px] tracking-[0.3em]'} placeholder="••••••" maxLength={6} inputMode="numeric" />
                {form2.formState.errors.otp && <p className={ERR}>{form2.formState.errors.otp.message}</p>}
                {devOtp && <p className="text-[12px] text-[#92400E] bg-[#FFFBEB] border border-[#FCD34D] rounded px-2 py-1 mt-2">Dev mode — OTP: <strong>{devOtp}</strong></p>}
              </div>
              <button type="submit" disabled={form2.formState.isSubmitting} className="w-full bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors">
                {form2.formState.isSubmitting ? 'Verifying…' : 'Verify & Login'}
              </button>
              <button type="button" onClick={() => { setStep(1); setDevOtp(null); setServerError(null); }} className="w-full text-[13px] text-[#6B6B6B] hover:text-[#2563EB] transition-colors">← Back</button>
            </form>
          )}

          <p className="mt-8 text-center text-[13px] text-[#6B6B6B]">
            Don't have a CRN yet?{' '}
            <Link href="/partner/apply" className="text-[#2563EB] hover:underline">Apply now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
