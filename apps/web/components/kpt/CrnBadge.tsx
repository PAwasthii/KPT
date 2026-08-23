'use client';
import { useState } from 'react';

interface CrnBadgeProps {
  crn: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<CrnBadgeProps['size']>, string> = {
  sm: 'text-[12px] py-1 px-2',
  md: 'text-[13px] py-1.5 px-3',
  lg: 'text-[16px] py-2 px-4',
};

const ICON_SIZE: Record<NonNullable<CrnBadgeProps['size']>, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function CrnBadge({ crn, size = 'md' }: CrnBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(crn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API is unavailable
      const el = document.createElement('textarea');
      el.value = crn;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy CRN'}
      className={`inline-flex items-center gap-1.5 font-mono bg-[rgba(37,99,235,0.08)] border border-[#2563EB]/20 text-[#2563EB] rounded-[4px] transition-all select-none cursor-pointer hover:border-[#2563EB]/50 hover:bg-[rgba(37,99,235,0.06)] ${SIZE_CLASSES[size]}`}
    >
      <span>{crn}</span>
      {copied ? (
        <svg
          className={`${ICON_SIZE[size]} shrink-0`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg
          className={`${ICON_SIZE[size]} shrink-0`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
          />
        </svg>
      )}
      {copied && (
        <span className={`ml-0.5 ${size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-[14px]' : 'text-[12px]'}`}>
          Copied!
        </span>
      )}
    </button>
  );
}
