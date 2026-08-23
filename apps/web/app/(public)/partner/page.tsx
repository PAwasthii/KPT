import Link from 'next/link';
import Image from 'next/image';
import { KptNav } from '@/components/kpt/KptNav';
import { KptFooter } from '@/components/kpt/KptFooter';
import { CrnTrackerWidget } from '@/components/kpt/CrnTrackerWidget';

export const metadata = { title: 'KPT Partner Portal — Become an Authorised Dealer' };

const WHY_KPT = [
  { stat: '45+', label: 'Years of Manufacturing', desc: 'Founded 1978 in Kolhapur, Maharashtra. ISO certified facility.' },
  { stat: '500+', label: 'Authorised Dealers', desc: 'Trusted dealer network spanning all major Indian states.' },
  { stat: '4', label: 'Product Verticals', desc: 'Power Tools, Blowers, E-Vehicles, Agricultural Equipment.' },
  { stat: 'ISO', label: 'Certified Facility', desc: 'Internationally certified manufacturing standards.' },
];

const HOW_STEPS = [
  { n: 1, title: 'Online Enquiry', desc: 'Fill the form in under 5 minutes. Get your CRN instantly.' },
  { n: 2, title: 'Field Verification', desc: 'A KPT field executive visits your location and assesses the site.' },
  { n: 3, title: 'Document Upload', desc: 'Upload GST, PAN, Shop Establishment, Cancelled Cheque online.' },
  { n: 4, title: 'KPT Approval', desc: 'Sales head reviews your application within 5 working days.' },
  { n: 5, title: 'Agreement & Activation', desc: 'Sign the dealer agreement digitally. Go live on the same day.' },
];

const PRODUCTS = [
  {
    category: 'Power Tools',
    items: ['Rotary Hammers & Demolition Hammers', 'Angle Grinders', 'Drills & Impact Drivers', 'Circular Saws', 'Air Compressors', 'Die Grinders'],
  },
  {
    category: 'Blowers',
    items: ['Roots Blowers', 'Centrifugal Fans', 'Industrial Air Blowers', 'Air Handling Units', 'High Pressure Blowers'],
  },
  {
    category: 'E-Vehicles',
    items: ['K-Power EV — e-carts', 'Rayansh — e-rickshaw (passenger)', 'Arin — e-cargo (last-mile delivery)'],
  },
];

export default function PartnerLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <KptNav />

      {/* HERO */}
      <section className="bg-white text-slate-800 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#2563EB] font-medium mb-4">KPT Industries Ltd. — Authorised Partner Programme</p>
            <h1 className="text-[42px] md:text-[52px] font-bold leading-tight mb-5">Become a KPT Authorised Channel Partner</h1>
            <p className="text-[18px] text-slate-500 leading-relaxed mb-8">Join India's trusted manufacturer of Power Tools, Blowers & E-Vehicles since 1978. Apply online in minutes.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/partner/apply" className="bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] px-8 py-3 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">Apply Now</Link>
              <Link href="/partner/track" className="border border-[#2563EB] text-[#2563EB] text-[14px] font-semibold uppercase tracking-[0.05em] px-8 py-3 rounded-[4px] hover:bg-[#2563EB] hover:text-white transition-colors">Track Application</Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {['Power Tools', 'Blowers', 'E-Vehicles', 'Agricultural'].map(cat => (
              <div key={cat} className="bg-[#E2E8F0] rounded-[8px] p-6 text-center">
                <div className="w-12 h-12 bg-[#2563EB] rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg>
                </div>
                <p className="text-[14px] font-medium text-slate-700">{cat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY KPT */}
      <section className="bg-[#F7F7F5] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6B6B6B] text-center mb-2">Why Partner with KPT</p>
          <h2 className="text-[32px] font-bold text-slate-800 text-center mb-10">Backed by 45+ years of manufacturing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_KPT.map(w => (
              <div key={w.stat} className="bg-white border border-[#E8E8E6] rounded-[8px] p-6">
                <div className="w-10 h-10 bg-[rgba(37,99,235,0.08)] rounded-full flex items-center justify-center mb-4">
                  <span className="text-[#2563EB] font-bold text-[16px]">★</span>
                </div>
                <p className="text-[36px] font-bold text-[#2563EB] leading-none mb-1">{w.stat}</p>
                <p className="text-[14px] font-semibold text-slate-800 mb-2">{w.label}</p>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6B6B6B] text-center mb-2">Simple 5-Step Process</p>
          <h2 className="text-[32px] font-bold text-slate-800 text-center mb-12">How Onboarding Works</h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-[#E8E8E6]" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {HOW_STEPS.map(step => (
                <div key={step.n} className="flex flex-col items-center text-center relative">
                  <div className="w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[18px] font-bold mb-4 relative z-10">{step.n}</div>
                  <h3 className="text-[14px] font-semibold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="bg-[#F7F7F5] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6B6B6B] text-center mb-2">Our Product Range</p>
          <h2 className="text-[32px] font-bold text-slate-800 text-center mb-10">Products you'll sell</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRODUCTS.map(p => (
              <div key={p.category} className="bg-white border border-[#E8E8E6] rounded-[8px] p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8E8E6]">
                  <div className="w-8 h-8 bg-[rgba(37,99,235,0.08)] rounded-[4px] flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#2563EB] rounded-sm" />
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-800">{p.category}</h3>
                </div>
                <ul className="space-y-2">
                  {p.items.map(item => (
                    <li key={item} className="text-[13px] text-[#2D2D2D] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRN TRACKER WIDGET */}
      <section className="py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-[24px] font-bold text-slate-800 mb-2">Already applied?</h2>
          <p className="text-[14px] text-[#6B6B6B] mb-6">Enter your Channel Reference Number to check your application status.</p>
          <CrnTrackerWidget />
        </div>
      </section>

      <KptFooter />
    </div>
  );
}
