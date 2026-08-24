'use client';
import Link from 'next/link';

export default function PartnerDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-screen bg-[#F7F7F5] p-4">
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-[rgba(37,99,235,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-[18px] font-bold text-slate-800 mb-2">Failed to load partner</h2>
        <p className="text-[13px] text-[#6B6B6B] mb-6">
          {error.message ?? 'Could not load partner details. Please try again.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full bg-[#2563EB] text-white text-[13px] uppercase tracking-[0.05em] py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/partner-applications"
            className="w-full border border-[#E8E8E6] text-[#6B6B6B] text-[13px] py-2.5 rounded-[4px] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors text-center"
          >
            Back to Partners
          </Link>
        </div>
      </div>
    </div>
  );
}
