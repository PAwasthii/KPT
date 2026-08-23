export interface EsignResult {
  status: 'sent' | 'failed';
  message: string;
  esignRef?: string;
  signingUrl?: string;
}

export async function sendForEsign(crn: string, pdfPath: string): Promise<EsignResult> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KPT MOCK] sendForEsign: crn=${crn} pdfPath=${pdfPath}`);
    await new Promise(r => setTimeout(r, 2500));
    const mockRef = `MOCK-ESIGN-${crn}-${Date.now()}`;
    return { status: 'sent', message: 'Mock esign sent', esignRef: mockRef, signingUrl: `/partner/agreement?mock=1` };
  }
  const apiKey = process.env.LEEGALITY_API_KEY;
  if (!apiKey) throw new Error('LEEGALITY_API_KEY not configured');
  throw new Error('Leegality esign not yet integrated in production');
}
