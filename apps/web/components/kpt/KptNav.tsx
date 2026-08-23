'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'About', href: 'https://kpt.co.in/about' },
  { label: 'Products', href: 'https://kpt.co.in/products' },
  { label: 'Dealers', href: 'https://kpt.co.in/dealers' },
  { label: 'Contact', href: 'https://kpt.co.in/contact' },
];

export function KptNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-[#E8E8E6]">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/partner">
          <Image
            src="https://kpt.co.in/kpt-logo.png"
            alt="KPT Industries"
            width={100}
            height={36}
            className="object-contain"
            unoptimized
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium uppercase tracking-[0.05em] text-slate-700 hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <Link
          href="/partner/login"
          className="bg-primary text-white text-[13px] font-medium uppercase tracking-[0.05em] px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Partner Login
        </Link>
      </div>
    </nav>
  );
}
