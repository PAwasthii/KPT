// Central location for lead status badge styles
import type { LeadStatus, LeadSource } from '@prisma/client';
import { BadgeProps } from '@repo/ui/components/ui/badge';

// Local runtime mirrors of the Prisma enums (string values match the schema
// 1:1) so this client-safe module never pulls in @prisma/client's generated
// runtime (which drags Node-only code into client/edge bundles).
const LeadStatusValue = {
  OPEN: 'OPEN',
  WORKING: 'WORKING',
  QUALIFIED: 'QUALIFIED',
  NURTURING: 'NURTURING',
  CONVERTED: 'CONVERTED',
  UNQUALIFIED: 'UNQUALIFIED',
} as const satisfies Record<string, LeadStatus>;

const LeadSourceValue = {
  MANUAL: 'MANUAL',
  IMPORT: 'IMPORT',
  LANDING_PAGE: 'LANDING_PAGE',
} as const satisfies Record<string, LeadSource>;

export const leadStatusConfig = {
  [LeadStatusValue.OPEN]: { label: 'OPEN', className: 'bg-brand-pale-aqua text-brand-indigo hover:bg-brand-pale-aqua', variant: 'outline' },
  [LeadStatusValue.WORKING]: { label: 'WORKING', className: 'bg-brand-amber/15 text-brand-amber hover:bg-brand-amber/15', variant: 'outline' },
  [LeadStatusValue.QUALIFIED]: { label: 'QUALIFIED', className: 'bg-brand-mint/40 text-brand-teal hover:bg-brand-mint/40', variant: 'outline' },
  [LeadStatusValue.NURTURING]: { label: 'NURTURING', className: 'bg-brand-lavender text-brand-indigo hover:bg-brand-lavender', variant: 'outline' },
  [LeadStatusValue.CONVERTED]: { label: 'CONVERTED', className: 'bg-brand-mint/40 text-brand-teal hover:bg-brand-mint/40', variant: 'outline' },
  [LeadStatusValue.UNQUALIFIED]: { label: 'UNQUALIFIED', className: 'bg-destructive/10 text-destructive hover:bg-destructive/10', variant: 'outline' },
};

// Lead source display labels
export const leadSourceLabels: Record<LeadSource, string> = {
  [LeadSourceValue.MANUAL]: 'Manual',
  [LeadSourceValue.IMPORT]: 'Import',
  [LeadSourceValue.LANDING_PAGE]: 'Landing Page',
};

export function getLeadStatusConfig(status: LeadStatus | string | null | undefined) {
  if (!status) {
    // Default to OPEN if status is null/undefined
    return leadStatusConfig[LeadStatusValue.OPEN] as {
      label: string;
      className: string;
      variant: BadgeProps['variant'];
    };
  }

  // Normalize status to uppercase string for comparison
  const statusStr = String(status).toUpperCase();

  // Map string values to enum values (including legacy values like 'New')
  const statusMap: Record<string, LeadStatus> = {
    'OPEN': LeadStatusValue.OPEN,
    'WORKING': LeadStatusValue.WORKING,
    'QUALIFIED': LeadStatusValue.QUALIFIED,
    'UNQUALIFIED': LeadStatusValue.UNQUALIFIED,
    'NURTURING': LeadStatusValue.NURTURING,
    'CONVERTED': LeadStatusValue.CONVERTED,
    'NEW': LeadStatusValue.OPEN, // Map legacy 'NEW' to OPEN
    'New': LeadStatusValue.OPEN, // Map legacy 'New' to OPEN
  };

  // Try to get the enum value from the map, or use the status directly if it's already an enum
  const enumStatus = statusMap[statusStr] || (status as LeadStatus);

  // Try to find the status in the config
  const config = leadStatusConfig[enumStatus as keyof typeof leadStatusConfig];

  if (config) {
    return config as {
      label: string;
      className: string;
      variant: BadgeProps['variant'];
    };
  }

  // Fallback for unknown status - default to OPEN
  return leadStatusConfig[LeadStatusValue.OPEN] as {
    label: string;
    className: string;
    variant: BadgeProps['variant'];
  };
}

export function getLeadSourceLabel(source: LeadSource | string | null | undefined): string {
  if (!source) return 'Unknown source';
  return leadSourceLabels[source as LeadSource] || source;
}
