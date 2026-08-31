import { createHmac } from 'crypto';

const BASE_URL = process.env.DIGIO_BASE_URL ?? 'https://ext.digio.in:444';

function authHeader(): string {
  const id = process.env.DIGIO_CLIENT_ID ?? '';
  const secret = process.env.DIGIO_CLIENT_SECRET ?? '';
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

export interface DigioResponse {
  id: string;
  signing_parties: Array<{
    id: string;
    identifier: string;
    name: string;
    sign_link: string;
    status: string;
  }>;
}

export async function createDigioRequest(
  pdfBuffer: Buffer,
  fileName: string,
  signerEmail: string,
  signerName: string,
  callbackUrl: string,
): Promise<DigioResponse> {
  const res = await fetch(`${BASE_URL}/client/api/v2/multi_sign/upload`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_name: fileName,
      file: pdfBuffer.toString('base64'),
      request_type: 'sign',
      signing_parties: [
        {
          identifier: signerEmail,
          name: signerName,
          sign_type: 'electronic',
          reason: 'KPT Authorised Channel Partner Agreement',
        },
      ],
      notify_signers: true,
      send_sign_link: true,
      expire_in_days: 30,
      callback_url: callbackUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Digio API ${res.status}: ${text}`);
  }
  return res.json() as Promise<DigioResponse>;
}

export function verifyDigioSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.DIGIO_CLIENT_SECRET ?? '';
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
