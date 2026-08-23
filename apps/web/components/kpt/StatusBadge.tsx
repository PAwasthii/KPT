interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const STATUS_MAP: Record<string, BadgeStyle> = {
  enquiry_received: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FCD34D]',
    label: 'Enquiry Received',
  },
  field_scheduled: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1E40AF]',
    border: 'border-[#BFDBFE]',
    label: 'Field Scheduled',
  },
  field_verified: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1E40AF]',
    border: 'border-[#BFDBFE]',
    label: 'Field Verified',
  },
  docs_pending: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FCD34D]',
    label: 'Docs Pending',
  },
  docs_submitted: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1E40AF]',
    border: 'border-[#BFDBFE]',
    label: 'Docs Submitted',
  },
  under_review: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1E40AF]',
    border: 'border-[#BFDBFE]',
    label: 'Under Review',
  },
  approved: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    border: 'border-[#A7F3D0]',
    label: 'Approved',
  },
  active: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    border: 'border-[#A7F3D0]',
    label: 'Active',
  },
  rejected: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#2563EB]',
    border: 'border-[#BFDBFE]',
    label: 'Rejected',
  },
  pending: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FCD34D]',
    label: 'Pending',
  },
};

const DEFAULT_STYLE: BadgeStyle = {
  bg: 'bg-[#F7F7F5]',
  text: 'text-[#6B6B6B]',
  border: 'border-[#E8E8E6]',
  label: '',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STATUS_MAP[status] ?? DEFAULT_STYLE;
  const label = style.label || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-[0.04em] ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {label}
    </span>
  );
}
