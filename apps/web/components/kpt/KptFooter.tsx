import Link from 'next/link';
import Image from 'next/image';

const POWER_TOOLS = [
  'Drills & Drivers',
  'Angle Grinders',
  'Demolition Hammers',
  'Air Compressors',
  'Circular Saws',
];

const BLOWERS = [
  'Roots Blowers',
  'Centrifugal Fans',
  'Industrial Blowers',
  'Air Handling Units',
];

const E_VEHICLES = ['K-Power EV', 'Rayansh E-Rickshaw', 'Arin E-Cargo'];

export function KptFooter() {
  return (
    <footer className="bg-white text-slate-800 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + tagline */}
          <div>
            <Image
              src="https://kpt.co.in/logo_full_white.svg"
              alt="KPT Industries"
              width={140}
              height={48}
              className="mb-4 object-contain"
              unoptimized
            />
            <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
              Manufacturing excellence since 1978. Trusted by 500+ authorised dealers across India.
            </p>
          </div>

          {/* Power Tools */}
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">
              Power Tools
            </h4>
            {POWER_TOOLS.map((p) => (
              <p key={p} className="text-[13px] text-[#D1D5DB] mb-1.5">
                {p}
              </p>
            ))}
          </div>

          {/* Blowers + E-Vehicles */}
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">
              Blowers
            </h4>
            {BLOWERS.map((p) => (
              <p key={p} className="text-[13px] text-[#D1D5DB] mb-1.5">
                {p}
              </p>
            ))}
            <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] mb-3 mt-4">
              E-Vehicles
            </h4>
            {E_VEHICLES.map((p) => (
              <p key={p} className="text-[13px] text-[#D1D5DB] mb-1.5">
                {p}
              </p>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">
              Contact
            </h4>
            <p className="text-[13px] text-[#D1D5DB] mb-3 leading-relaxed">
              GAT No. 320, Mouje Agar, Shirol-416103, Kolhapur, Maharashtra
            </p>
            <p className="text-[13px] text-[#D1D5DB] mb-1">📞 +91-231-3528151</p>
            <p className="text-[12px] text-[#6B6B6B] mt-4">Mon – Sat, 9AM – 5PM</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-[#6B6B6B]">© 2025 KPT. All rights reserved.</p>
          <p className="text-[12px] text-[#6B6B6B]">
            If you are an authorised dealer, you can access your portal{' '}
            <Link href="/partner/login" className="text-[#2563EB] hover:underline">
              here
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
