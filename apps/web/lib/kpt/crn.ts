export const CRN_REGEX = /^KPT-CP-\d{4}-\d{5}$/;

export function isValidCrn(crn: string): boolean {
  return CRN_REGEX.test(crn);
}

export function formatCrnDisplay(crn: string): string {
  return crn.toUpperCase().trim();
}
