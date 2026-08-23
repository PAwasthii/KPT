export interface PennyDropResult {
  status: 'verified' | 'failed' | 'pending';
  message: string;
  data?: {
    accountNumber: string;
    ifsc: string;
    bankName?: string;
    accountHolderName?: string;
  };
}

export async function pennyDrop(accountNumber: string, ifsc: string): Promise<PennyDropResult> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT MOCK] pennyDrop called: ${accountNumber} / ${ifsc}`);
    await new Promise(r => setTimeout(r, 2500));
    return {
      status: 'verified',
      message: 'Mock success',
      data: { accountNumber, ifsc, bankName: 'State Bank of India', accountHolderName: 'MOCK ACCOUNT HOLDER' },
    };
  }
  const apiKey = process.env.SANDBOX_API_KEY;
  if (!apiKey) throw new Error('SANDBOX_API_KEY not configured');
  throw new Error('Penny drop API not yet integrated in production');
}
