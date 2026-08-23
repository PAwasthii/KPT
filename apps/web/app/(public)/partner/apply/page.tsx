'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KptNav } from '@/components/kpt/KptNav';
import { CrnBadge } from '@/components/kpt/CrnBadge';

export const schema = z.object({
  ownerName: z.string().min(2, 'Enter owner name'),
  firmName: z.string().min(2, 'Enter firm name'),
  countryCode: z.string().min(1, 'Select country code'),
  mobile: z.string().min(5, 'Enter valid mobile number').max(15, 'Mobile too long'),
  email: z.string().email('Enter valid email'),
  pincode: z.string().min(3, 'Enter valid pincode').max(12),
  district: z.string().optional(),
  shopSizeSqft: z.string().optional(),
  yearsInBusiness: z.string().optional(),
  existingBrands: z.string().optional(),
  turnoverRange: z.string().optional(),
  productInterest: z.array(z.string()).min(1, 'Select at least one product'),
}).superRefine((data, ctx) => {
  if (data.countryCode === '+91' && !/^[6-9]\d{9}$/.test(data.mobile)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter valid 10-digit Indian mobile', path: ['mobile'] });
  }
});
type FormData = z.infer<typeof schema>;

const PRODUCT_OPTIONS = ['Power Tools', 'Blowers', 'E-Vehicles (K-Power EV / Rayansh / Arin)', 'Agricultural Tools'];
const YEARS_OPTIONS = [{ v: '0', l: 'Less than 1 year' }, { v: '1', l: '1–3 years' }, { v: '3', l: '3–5 years' }, { v: '5', l: '5–10 years' }, { v: '10', l: '10+ years' }];
const TURNOVER_OPTIONS = [{ v: '<5L', l: 'Less than ₹5 Lakh' }, { v: '5L-10L', l: '₹5L – ₹10L' }, { v: '10L-25L', l: '₹10L – ₹25L' }, { v: '25L-50L', l: '₹25L – ₹50L' }, { v: '50L+', l: '₹50L+' }];
const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
];

const LABEL = 'block text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1.5';
const INPUT = 'w-full border border-[#E8E8E6] rounded-[4px] px-3 py-2 text-[14px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB] transition-colors';
const ERR = 'text-[12px] text-[#2563EB] mt-1';
const SELECT = INPUT + ' bg-white';

export default function ApplyPage() {
  const [successCrn, setSuccessCrn] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { productInterest: [], countryCode: '+91' },
  });

  const selectedProducts = watch('productInterest');
  const countryCode = watch('countryCode');
  const isIndia = countryCode === '+91';

  const handlePincodeLookup = async (pin: string) => {
    if (!isIndia || pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json() as Array<{ Status: string; PostOffice: Array<{ District: string }> }>;
      if (data[0]?.Status === 'Success' && data[0].PostOffice?.length) {
        setValue('district', data[0].PostOffice[0].District, { shouldValidate: true });
      }
    } catch { /* ignore */ } finally { setPincodeLoading(false); }
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: data.ownerName,
          firmName: data.firmName,
          countryCode: data.countryCode,
          mobile: data.mobile,
          email: data.email,
          pincode: data.pincode,
          district: data.district,
          existingBrands: data.existingBrands,
          turnoverRange: data.turnoverRange,
          productInterest: data.productInterest,
          shopSizeSqft: data.shopSizeSqft ? parseInt(data.shopSizeSqft) : undefined,
          yearsInBusiness: data.yearsInBusiness ? parseInt(data.yearsInBusiness) : undefined,
        }),
      });
      const json = await res.json() as { crn?: string; error?: string };
      if (!res.ok) {
        if (res.status === 409 && json.crn) { setSuccessCrn(json.crn); return; }
        setServerError(json.error ?? 'Submission failed');
        return;
      }
      setSuccessCrn(json.crn!);
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  // SUCCESS STATE
  if (successCrn) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <KptNav />
        <div className="flex items-center justify-center py-20 px-6">
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-10 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </div>
            <h2 className="text-[24px] font-bold text-slate-800 mb-2">Application Submitted!</h2>
            <p className="text-[14px] text-[#6B6B6B] mb-6">Your Channel Reference Number:</p>
            <div className="mb-6"><CrnBadge crn={successCrn} size="lg" /></div>
            <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] p-4 mb-6">
              <p className="text-[13px] text-[#92400E]">Save this CRN. You will need it to track your application and log in to the partner portal.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href={`/partner/track/${successCrn}`} className="bg-[#2563EB] text-white text-[13px] font-medium uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors text-center">Track my application</Link>
              <Link href="/partner" className="border border-[#E8E8E6] text-[#6B6B6B] text-[13px] font-medium uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors text-center">Back to home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <KptNav />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left panel */}
          <div className="md:col-span-2 bg-[#2563EB] rounded-[8px] p-8 text-white">
            <Image src="https://kpt.co.in/logo_full_white.svg" alt="KPT" width={120} height={40} className="mb-8 object-contain" unoptimized />
            <h2 className="text-[22px] font-bold mb-4">Start your partnership journey</h2>
            <ul className="space-y-3 mb-8">
              {[
                'Become an authorised KPT dealer',
                'Access exclusive dealer pricing',
                'Free product training & support',
                'Marketing collateral provided',
                'Part of 500+ dealer network',
              ].map(b => (
                <li key={b} className="flex items-start gap-2.5 text-[14px]">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  {b}
                </li>
              ))}
            </ul>
            <div className="bg-white/10 rounded-[6px] p-4">
              <p className="text-[13px] text-white/80">You'll receive your CRN <strong className="text-white">instantly</strong> after submitting.</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-3 bg-white border border-[#E8E8E6] rounded-[8px] p-8">
            <h1 className="text-[22px] font-bold text-slate-800 mb-1">Partner Application</h1>
            <p className="text-[13px] text-[#6B6B6B] mb-6">All fields marked * are required.</p>

            {serverError && (
              <div className="bg-[rgba(37,99,235,0.08)] border border-[#FED7AA] rounded-[6px] p-4 mb-6">
                <p className="text-[13px] text-[#2563EB]">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal */}
              <div>
                <p className="text-[12px] uppercase tracking-[0.1em] text-[#2563EB] font-semibold mb-4 pb-2 border-b border-[#E8E8E6]">Personal Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={LABEL}>Owner / Proprietor Name *</label><input {...register('ownerName')} className={INPUT} placeholder="Rajesh Kumar" />{errors.ownerName && <p className={ERR}>{errors.ownerName.message}</p>}</div>
                  <div><label className={LABEL}>Firm / Company Name *</label><input {...register('firmName')} className={INPUT} placeholder="Kumar Enterprises" />{errors.firmName && <p className={ERR}>{errors.firmName.message}</p>}</div>
                  <div>
                    <label className={LABEL}>Mobile Number *</label>
                    <div className="flex">
                      <select {...register('countryCode')} className="shrink-0 border border-r-0 border-[#E8E8E6] rounded-l-[4px] px-2 py-2 text-[13px] text-[#2D2D2D] bg-white focus:outline-none focus:border-[#2563EB] transition-colors">
                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                      </select>
                      <input {...register('mobile')} className={INPUT + ' rounded-l-none'} placeholder={isIndia ? '9876543210' : 'Phone number'} maxLength={15} />
                    </div>
                    {errors.mobile && <p className={ERR}>{errors.mobile.message}</p>}
                  </div>
                  <div><label className={LABEL}>Email Address *</label><input {...register('email')} type="email" className={INPUT} placeholder="rajesh@example.com" />{errors.email && <p className={ERR}>{errors.email.message}</p>}</div>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-[12px] uppercase tracking-[0.1em] text-[#2563EB] font-semibold mb-4 pb-2 border-b border-[#E8E8E6]">Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Pin / Postal Code *</label>
                    <div className="relative">
                      <input {...register('pincode')} className={INPUT} placeholder={isIndia ? '416103' : 'Postal code'}
                        maxLength={12}
                        onBlur={e => handlePincodeLookup(e.target.value)}
                        onChange={e => { register('pincode').onChange(e); if (isIndia && e.target.value.length === 6) handlePincodeLookup(e.target.value); }}
                      />
                      {pincodeLoading && <div className="absolute right-3 top-2.5 w-4 h-4 border border-[#2563EB] border-t-transparent rounded-full animate-spin" />}
                    </div>
                    {errors.pincode && <p className={ERR}>{errors.pincode.message}</p>}
                  </div>
                  <div>
                    <label className={LABEL}>District / Region{isIndia ? ' (auto-filled)' : ''}</label>
                    <input {...register('district')} className={INPUT} placeholder={isIndia ? 'Auto-filled from pincode' : 'District or region'} />
                    {errors.district && <p className={ERR}>{errors.district.message}</p>}
                  </div>
                </div>
              </div>

              {/* Business */}
              <div>
                <p className="text-[12px] uppercase tracking-[0.1em] text-[#2563EB] font-semibold mb-4 pb-2 border-b border-[#E8E8E6]">Business Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={LABEL}>Shop Size (sq ft)</label><input {...register('shopSizeSqft')} type="number" className={INPUT} placeholder="500" /></div>
                  <div>
                    <label className={LABEL}>Years in Business</label>
                    <select {...register('yearsInBusiness')} className={SELECT}>
                      <option value="">Select…</option>
                      {YEARS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2"><label className={LABEL}>Existing Brands Handled</label><input {...register('existingBrands')} className={INPUT} placeholder="Bosch, Makita, Stanley…" /></div>
                  <div>
                    <label className={LABEL}>Monthly Turnover Range</label>
                    <select {...register('turnoverRange')} className={SELECT}>
                      <option value="">Select…</option>
                      {TURNOVER_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <p className="text-[12px] uppercase tracking-[0.1em] text-[#2563EB] font-semibold mb-4 pb-2 border-b border-[#E8E8E6]">Product Interest *</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRODUCT_OPTIONS.map(p => (
                    <label key={p} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" value={p}
                        checked={selectedProducts.includes(p)}
                        onChange={e => {
                          const cur = selectedProducts;
                          setValue('productInterest', e.target.checked ? [...cur, p] : cur.filter(x => x !== p), { shouldValidate: true });
                        }}
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                      <span className="text-[14px] text-[#2D2D2D] group-hover:text-[#2563EB] transition-colors">{p}</span>
                    </label>
                  ))}
                </div>
                {errors.productInterest && <p className={ERR}>{errors.productInterest.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {isSubmitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
