'use client';
import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@repo/ui/components/ui/button';
import { ArrowLeft, CheckCircle2, MapPin, Camera } from 'lucide-react';

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

const INPUT = 'w-full border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors bg-card';

function RadioGroup({ label, name, options, register, required }: {
  label: string; name: any; options: string[];
  register: any; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="flex gap-4">
        {options.map(v => (
          <label key={v} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" {...register(name)} value={v} className="accent-primary" />
            <span className="text-sm text-foreground">{v}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FieldReportPage() {
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
    try {
      const exifr = (await import('exifr')).default;
      const gps = await exifr.gps(file);
      if (gps?.latitude && gps?.longitude) {
        setGeoLat(gps.latitude);
        setGeoLng(gps.longitude);
      }
    } catch { /* EXIF not available */ }
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
      if (res.ok && json.success) setSubmitted(true);
      else setServerError(json.error ?? 'Submission failed');
    } catch { setServerError('Network error. Please try again.'); }
  };

  if (submitted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Report Submitted</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Field verification report for <span className="font-mono font-medium text-foreground">{crn}</span> has been submitted. The partner has been advanced to Stage 3.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push(`/partner-applications/${crn}`)}>
              View Application
            </Button>
            <Button variant="outline" onClick={() => router.push('/partner-applications')}>
              Back to Partner Applications
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          href={`/partner-applications/${crn}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Partner Applications
        </Link>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Field Visit</p>
        <h1 className="text-2xl font-bold text-foreground">Site Verification Report</h1>
        <p className="text-sm font-mono text-primary mt-1">{crn}</p>
      </div>

      <div className="max-w-lg space-y-4">
        {serverError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Shop photo + location */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" /> Shop Photo &amp; Location
            </p>

            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors mb-3">
              {photoPath ? (
                <p className="text-sm text-emerald-600 font-medium">Photo uploaded</p>
              ) : (
                <>
                  <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Take shop front photo</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
              />
            </label>

            <button
              type="button"
              onClick={captureGeo}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground text-sm py-2 rounded-md hover:border-primary hover:text-primary transition-colors mb-2"
            >
              <MapPin className="h-4 w-4" /> Capture Current GPS Location
            </button>

            {geoError && <p className="text-xs text-destructive mb-2">{geoError}</p>}

            {geoLat && geoLng && (
              <div className="mb-3">
                <p className="text-xs text-emerald-600 mb-2">
                  Location captured: {geoLat.toFixed(5)}, {geoLng.toFixed(5)}
                </p>
                <div className="h-40 rounded-lg overflow-hidden border border-border">
                  <MapPreview lat={geoLat} lng={geoLng} />
                </div>
              </div>
            )}

            {!geoLat && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Latitude (manual)</label>
                  <input type="number" step="any" className={INPUT} placeholder="18.5204"
                    onChange={e => setGeoLat(parseFloat(e.target.value) || null)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Longitude (manual)</label>
                  <input type="number" step="any" className={INPUT} placeholder="73.8567"
                    onChange={e => setGeoLng(parseFloat(e.target.value) || null)} />
                </div>
              </div>
            )}
          </div>

          {/* Site assessment */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Site Assessment</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Shop Dimensions <span className="text-destructive">*</span>
              </label>
              <input {...register('shopDimensions')} className={INPUT} placeholder="e.g. 40ft × 25ft" />
              {errors.shopDimensions && <p className="text-xs text-destructive mt-1">{errors.shopDimensions.message}</p>}
            </div>

            <RadioGroup label="Road Visibility" name="roadVisibility" options={['Good', 'Average', 'Poor']} register={register} required />
            <RadioGroup label="Location Score" name="locationScore" options={['High', 'Medium', 'Low']} register={register} required />
            <RadioGroup label="Market Potential" name="marketPotential" options={['High', 'Medium', 'Low']} register={register} required />

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Existing Brands Stocked</label>
              <input {...register('existingLines')} className={INPUT} placeholder="Bosch, Stanley, Makita…" />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nearest KPT Dealer</label>
              <input {...register('nearestDealer')} className={INPUT} placeholder="Shop name or distance" />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Field Executive Name</label>
              <input {...register('assignedExecName')} className={INPUT} placeholder="Your name" />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <textarea {...register('execNotes')} className={INPUT + ' min-h-[80px] resize-none'} placeholder="Additional observations…" />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting…' : 'Submit Field Report'}
          </Button>
        </form>
      </div>
    </div>
  );
}
