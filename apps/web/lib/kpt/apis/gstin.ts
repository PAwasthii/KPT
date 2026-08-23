export interface GstinVerifyResult {
  status: 'verified' | 'failed' | 'pending';
  message: string;
  data?: {
    gstin: string;
    legalName?: string;
    tradeName?: string;
    registrationDate?: string;
    status?: string;
  };
}

export async function verifyGSTIN(gstin: string): Promise<GstinVerifyResult> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT MOCK] verifyGSTIN called with: ${gstin}`);
    await new Promise(r => setTimeout(r, 2500));
    return {
      status: 'verified',
      message: 'Mock success',
      data: { gstin, legalName: 'MOCK FIRM PRIVATE LIMITED', status: 'Active' },
    };
  }
  const apiKey = process.env.PERFIOS_API_KEY ?? process.env.WHITEBOOKS_API_KEY;
  if (!apiKey) throw new Error('GST verification API key not configured');
  // TODO: integrate Perfios/WhiteBooks GST lookup
  throw new Error('GST verification API not yet integrated in production');
}
