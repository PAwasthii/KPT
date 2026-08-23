'use client';
import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';

// Leaflet must be dynamically imported (no SSR)
const MapPreview = dynamic(() => import('@/components/kpt/LeafletMapPreview'), { ssr: false });

const schema = z.object({
  shopDimensions: z.string().min(1, 'Enter shop dimensions'),
  roadVisibility: z.enum(['Good', 'Average', 'Poor']),
  locationScore: z.enum(['High', 'Medium', 'Low']),
  existingLines: z.string().optional(),
  marketPotential: z.enum(['High', 'Medium', 'Low']),
  nearestDealer: z.string().optional(),
  execNotes: z.string().optional(),
  assignedExecName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const INPUT = 'w-full border border-[#E8E8E6] rounded-[4px] px-3 py-2.5 text-[14px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB] transition-colors bg-white';
const RADIO_GROUP = 'flex gap-3';

export default function FieldExecPage() {
  const { crn } = useParams<{ crn: string }>();
  const router = useRouter();
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roadVisibility: 'Good', locationScore: 'Medium', marketPotential: 'Medium' },
  });

  const captureGeo = useCallback(() => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); setGeoError(null); },
      () => setGeoError('Could not get location. Enter manually below.')
    );
  }, []);

  const handlePhotoUpload = useCallback(async (file: File) => {
    // Try to extract GPS from EXIF
    try {
      const exifr = (await import('exifr')).default;
      const gps = await exifr.gps(file);
      if (gps?.latitude && gps?.longitude) {
        setGeoLat(gps.latitude);
        setGeoLng(gps.longitude);
      }
    } catch { /* EXIF not available */ }
    // Mock upload — in production, use signed URL
    setPhotoPath(`partner-docs/${crn}/field-photo/${file.name}`);
  }, [crn]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const res = await fetch('/api/partner/field-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, crn, geoLat, geoLng, shopPhotoPath: photoPath }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (res.ok && json.success) { setSubmitted(true); }
      else { setServerError(json.error ?? 'Submission failed'); }
    } catch { setServerError('Network error. Please try again.'); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4">
        <div className="bg-white border border-[#A7F3D0] rounded-[8px] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <h2 className="text-[18px] font-bold text-slate-800 mb-2">Report Submitted</h2>
          <p className="text-[14px] text-[#6B6B6B] mb-6">Field verification report for <strong>{crn}</strong> has been submitted. The partner has been advanced to Stage 3.</p>
          <button onClick={() => router.push('/kpt-admin/partners')} className="w-full bg-[#2563EB] text-white text-[13px] uppercase py-2.5 rounded-[4px] hover:bg-[#1D4ED8]">Back to Partners</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 text-slate-800 p-4 sticky top-0 z-10">
        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 mb-0.5">Field Executive</p>
        <h1 className="text-[18px] font-bold">Site Verification Form</h1>
        <p className="text-[12px] font-mono text-[#2563EB] mt-0.5">{crn}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {serverError && (
          <div className="bg-[rgba(37,99,235,0.08)] border border-[#FED7AA] rounded-[6px] p-3">
            <p className="text-[13px] text-[#2563EB]">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Shop photo + geo */}
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-4">
            <p className="text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Shop Photo &amp; Location</p>

            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#E8E8E6] rounded-[6px] cursor-pointer hover:border-[#2563EB] mb-3">
              {photoPath ? (
                <p className="text-[13px] text-[#065F46]">Photo uploaded</p>
              ) : (
                <>
                  <svg className="w-6 h-6 text-[#6B6B6B] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                  <span className="text-[12px] text-[#6B6B6B]">Take shop front photo</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </label>

            <button type="button" onClick={captureGeo} className="w-full border border-[#E8E8E6] text-[#2D2D2D] text-[13px] py-2 rounded-[4px] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors mb-2">
              Capture Current GPS Location
            </button>
            {geoError && <p className="text-[12px] text-[#2563EB] mb-2">{geoError}</p>}
            {geoLat && geoLng && (
              <div className="mb-3">
                <p className="text-[12px] text-[#065F46] mb-2">Location captured: {geoLat.toFixed(5)}, {geoLng.toFixed(5)}</p>
                <div className="h-40 rounded-[6px] overflow-hidden border border-[#E8E8E6]">
                  <MapPreview lat={geoLat} lng={geoLng} />
                </div>
              </div>
            )}
            {/* Manual lat/lng */}
            {!geoLat && (
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[11px] text-[#6B6B6B]">Latitude (manual)</label><input type="number" step="any" className={INPUT} placeholder="18.5204" onChange={e => setGeoLat(parseFloat(e.target.value) || null)} /></div>
                <div><label className="text-[11px] text-[#6B6B6B]">Longitude (manual)</label><input type="number" step="any" className={INPUT} placeholder="73.8567" onChange={e => setGeoLng(parseFloat(e.target.value) || null)} /></div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-4 space-y-4">
            <p className="text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">Site Assessment</p>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Shop Dimensions *</label>
              <input {...register('shopDimensions')} className={INPUT} placeholder="e.g. 40ft × 25ft" />
              {errors.shopDimensions && <p className="text-[12px] text-[#2563EB] mt-1">{errors.shopDimensions.message}</p>}
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Road Visibility *</label>
              <div className={RADIO_GROUP}>
                {['Good', 'Average', 'Poor'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register('roadVisibility')} value={v} className="accent-[#2563EB]" />
                    <span className="text-[14px] text-[#2D2D2D]">{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Location Score *</label>
              <div className={RADIO_GROUP}>
                {['High', 'Medium', 'Low'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register('locationScore')} value={v} className="accent-[#2563EB]" />
                    <span className="text-[14px] text-[#2D2D2D]">{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Market Potential *</label>
              <div className={RADIO_GROUP}>
                {['High', 'Medium', 'Low'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register('marketPotential')} value={v} className="accent-[#2563EB]" />
                    <span className="text-[14px] text-[#2D2D2D]">{v}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Existing Brands Stocked</label>
              <input {...register('existingLines')} className={INPUT} placeholder="Bosch, Stanley, Makita…" />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Nearest KPT Dealer</label>
              <input {...register('nearestDealer')} className={INPUT} placeholder="Shop name or distance" />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Field Executive Name</label>
              <input {...register('assignedExecName')} className={INPUT} placeholder="Your name" />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#2D2D2D] mb-2 block">Notes</label>
              <textarea {...register('execNotes')} className={INPUT + ' min-h-[80px] resize-none'} placeholder="Additional observations…" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-4 rounded-[4px] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors sticky bottom-4">
            {isSubmitting ? 'Submitting…' : 'Submit Field Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
