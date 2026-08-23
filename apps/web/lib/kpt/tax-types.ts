export interface TaxTypeConfig {
  key: string;
  label: string;
  shortLabel: string;
  placeholder: string;
  maxLength?: number;
  format?: RegExp;
  canVerify: boolean;
  verificationNote?: string;
}

export interface TaxVerifyResult {
  status: "verified" | "not_found" | "invalid" | "error" | "manual";
  legalName?: string;
  tradeName?: string;
  address?: string;
  registrationDate?: string;
  businessStatus?: string;
  message?: string;
}

export const TAX_TYPE_CONFIGS: Record<string, TaxTypeConfig> = {
  GSTIN: {
    key: "GSTIN",
    label: "GST — India",
    shortLabel: "GST",
    placeholder: "27AABCS1429B1Z5",
    maxLength: 15,
    format: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    canVerify: true,
    verificationNote: "Verified via GST portal",
  },
  VAT_ID: {
    key: "VAT_ID",
    label: "VAT — EU",
    shortLabel: "VAT",
    placeholder: "DE123456789",
    canVerify: true,
    verificationNote: "Verified via VIES (EU)",
  },
  VAT_UK: {
    key: "VAT_UK",
    label: "VAT — United Kingdom",
    shortLabel: "VAT",
    placeholder: "123456789",
    maxLength: 9,
    canVerify: true,
    verificationNote: "Verified via HMRC",
  },
  ABN: {
    key: "ABN",
    label: "ABN/GST — Australia",
    shortLabel: "ABN",
    placeholder: "51 824 753 556",
    maxLength: 14,
    canVerify: true,
    verificationNote: "Verified via ABN Lookup",
  },
  EIN: {
    key: "EIN",
    label: "EIN — United States",
    shortLabel: "EIN",
    placeholder: "12-3456789",
    maxLength: 10,
    canVerify: false,
  },
  GST_HST: {
    key: "GST_HST",
    label: "GST/HST — Canada",
    shortLabel: "GST/HST",
    placeholder: "123456789RT0001",
    canVerify: false,
  },
  VAT_TRN: {
    key: "VAT_TRN",
    label: "VAT TRN — UAE",
    shortLabel: "VAT TRN",
    placeholder: "100123456700003",
    maxLength: 15,
    canVerify: false,
  },
  GST_SG: {
    key: "GST_SG",
    label: "GST — Singapore",
    shortLabel: "GST",
    placeholder: "200312345A",
    canVerify: false,
  },
  GST_NZ: {
    key: "GST_NZ",
    label: "GST — New Zealand",
    shortLabel: "GST",
    placeholder: "123456789",
    maxLength: 9,
    canVerify: false,
  },
  JCT: {
    key: "JCT",
    label: "Consumption Tax — Japan",
    shortLabel: "JCT",
    placeholder: "T1234567890123",
    maxLength: 14,
    canVerify: false,
  },
  OTHER: {
    key: "OTHER",
    label: "Tax / Registration Number",
    shortLabel: "Tax Reg.",
    placeholder: "Enter registration number",
    canVerify: false,
  },
};

const EU_ISOS = [
  "DE","FR","IT","ES","NL","BE","AT","PL","PT","SE",
  "DK","FI","CZ","HU","RO","SK","SI","EE","LV","LT",
  "HR","CY","LU","MT","BG","IE","GR",
];

const COUNTRY_TAX_MAP: Record<string, string[]> = {
  IN: ["GSTIN"],
  GB: ["VAT_UK"],
  AU: ["ABN"],
  US: ["EIN"],
  CA: ["GST_HST"],
  AE: ["VAT_TRN"],
  SG: ["GST_SG"],
  NZ: ["GST_NZ"],
  JP: ["JCT"],
};
EU_ISOS.forEach((iso) => { COUNTRY_TAX_MAP[iso] = ["VAT_ID"]; });

export function getTaxTypesForCountry(iso: string): TaxTypeConfig[] {
  const keys = COUNTRY_TAX_MAP[iso] ?? ["OTHER"];
  const configs = keys
    .map((k) => TAX_TYPE_CONFIGS[k])
    .filter((c): c is TaxTypeConfig => !!c);
  // Always append OTHER as fallback option (deduped)
  if (!configs.find((c) => c.key === "OTHER")) {
    configs.push(TAX_TYPE_CONFIGS.OTHER!);
  }
  return configs;
}

export function getDefaultTaxType(iso: string): string {
  return (COUNTRY_TAX_MAP[iso] ?? ["OTHER"])[0] ?? "OTHER";
}
