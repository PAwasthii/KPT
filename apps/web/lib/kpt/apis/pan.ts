export interface PanVerifyResult {
  status: 'verified' | 'failed' | 'pending';
  message: string;
  data?: {
    pan: string;
    name?: string;
    category?: string;
  };
}

export async function verifyPAN(pan: string): Promise<PanVerifyResult> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT MOCK] verifyPAN called with: ${pan}`);
    await new Promise(r => setTimeout(r, 2500));
    return {
      status: 'verified',
      message: 'Mock success',
      data: { pan, name: 'MOCK OWNER NAME', category: 'Individual' },
    };
  }
  const apiKey = process.env.SANDBOX_API_KEY ?? process.env.EKO_API_KEY;
  if (!apiKey) throw new Error('PAN verification API key not configured');
  throw new Error('PAN verification API not yet integrated in production');
}
