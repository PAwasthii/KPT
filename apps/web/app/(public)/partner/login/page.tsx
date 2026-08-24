'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Field, FieldLabel, FieldGroup } from '@repo/ui/components/ui/field';
import logo from '@/app/assets/images/logos/kpt-logo.png';
import BrandPanel from '@/components/BrandPanel';

const step1Schema = z.object({
  crn: z.string().regex(/^KPT-CP-\d{4}-\d{5}$/, 'Enter CRN in format KPT-CP-YYYY-NNNNN'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile'),
});
const step2Schema = z.object({ otp: z.string().length(6, 'Enter 6-digit OTP') });
type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

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
    <div className="grid h-screen w-full overflow-hidden md:grid-cols-2">
      {/* Left: brand panel */}
      <BrandPanel />

      {/* Right: form panel */}
      <div className="flex h-full flex-col items-center justify-center bg-background px-6 py-6 sm:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <Image
            src={logo}
            alt="KPT — Kulkarni Power Tools"
            width={160}
            height={54}
            priority
            className="mb-6 h-10 w-auto object-contain object-left"
          />

          <div className="mb-5">
            <h1 className="text-[1.75rem] font-bold leading-[1.15] text-foreground">
              Partner Portal
              <br />
              <span className="text-primary">Sign In</span>
            </h1>
            <span className="mt-2.5 block h-[3px] w-14 rounded-full bg-primary" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {step === 1
                ? 'Enter your CRN and mobile number to receive an OTP.'
                : `OTP sent to +91-${crnMobile.mobile.slice(0, 2)}••••••${crnMobile.mobile.slice(-2)}`}
            </p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={form1.handleSubmit(onStep1)}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="crn">Channel Reference Number (CRN)</FieldLabel>
                  <Input
                    id="crn"
                    {...form1.register('crn')}
                    placeholder="KPT-CP-2025-00142"
                  />
                  {form1.formState.errors.crn && (
                    <p className="mt-1 text-xs text-destructive">{form1.formState.errors.crn.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="mobile">Registered Mobile Number</FieldLabel>
                  <Input
                    id="mobile"
                    {...form1.register('mobile')}
                    placeholder="9876543210"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  {form1.formState.errors.mobile && (
                    <p className="mt-1 text-xs text-destructive">{form1.formState.errors.mobile.message}</p>
                  )}
                </Field>
                <Field>
                  <Button
                    type="submit"
                    disabled={form1.formState.isSubmitting}
                    className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
                  >
                    {form1.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {form1.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
                    {!form1.formState.isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={form2.handleSubmit(onStep2)}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="otp">6-Digit OTP</FieldLabel>
                  <Input
                    id="otp"
                    {...form2.register('otp')}
                    className="text-center font-mono text-2xl tracking-[0.3em]"
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                  />
                  {form2.formState.errors.otp && (
                    <p className="mt-1 text-xs text-destructive">{form2.formState.errors.otp.message}</p>
                  )}
                  {devOtp && (
                    <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      Dev mode — OTP: <strong>{devOtp}</strong>
                    </p>
                  )}
                </Field>
                <Field>
                  <Button
                    type="submit"
                    disabled={form2.formState.isSubmitting}
                    className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
                  >
                    {form2.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {form2.formState.isSubmitting ? 'Verifying…' : 'Verify & Login'}
                    {!form2.formState.isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>
                <button
                  type="button"
                  onClick={() => { setStep(1); setDevOtp(null); setServerError(null); }}
                  className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Back
                </button>
              </FieldGroup>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don&apos;t have a CRN yet?{' '}
            <Link href="/partner/apply" className="text-primary underline-offset-2 hover:underline">
              Apply now
            </Link>
          </p>

          <div className="mt-3 text-center text-xs text-muted-foreground">
            <span>www.kpt.co.in</span>
          </div>
        </div>
      </div>

    </div>
  );
}
