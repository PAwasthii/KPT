'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CrnTrackerWidget() {
  const [crn, setCrn] = useState('');
  const router = useRouter();
  return (
    <form onSubmit={e => { e.preventDefault(); if (crn.trim()) router.push(`/partner/track/${crn.trim().toUpperCase()}`); }} className="flex gap-2">
      <input
        value={crn}
        onChange={e => setCrn(e.target.value)}
        placeholder="KPT-CP-2025-00001"
        className="flex-1 border border-[#E8E8E6] rounded-[4px] px-4 py-2.5 text-[14px] text-[#2D2D2D] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#2563EB]"
      />
      <button type="submit" className="bg-[#2563EB] text-white text-[13px] font-medium uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">Track</button>
    </form>
  );
}
