export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { sendSMS } from '@/lib/kpt/sms';
import { verifyDigioSignature } from '@/lib/kpt/digio';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify Digio webhook signature when secret is configured
    const sig = req.headers.get('x-digio-signature');
    if (process.env.DIGIO_CLIENT_SECRET && sig) {
      if (!verifyDigioSignature(rawBody, sig)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Digio sends `id` + `status: "signing_complete"`;
    // legacy mock sends `reference_id` + `status: "signed"`
    const body = JSON.parse(rawBody) as { id?: string; reference_id?: string; status?: string };
    const esignRef = body.id ?? body.reference_id;
    if (!esignRef) return NextResponse.json({ error: 'Missing reference_id' }, { status: 400 });

    const status = body.status ?? '';
    if (status && status !== 'signing_complete' && status !== 'signed') {
      // Digio may send intermediate events (e.g. "document_opened") — ignore them
      return NextResponse.json({ ok: true, skipped: true });
    }

    const agreement = await prisma.kptAgreement.findFirst({ where: { esignRef } });
    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.kptAgreement.update({
        where: { id: agreement.id },
        data: { signStatus: 'signed', signedAt: new Date(), activatedAt: new Date() },
      }),
      prisma.kptPartner.update({ where: { crn: agreement.crn }, data: { status: 'active' } }),
      prisma.kptStatusHistory.create({
        data: { crn: agreement.crn, fromStatus: 'approved', toStatus: 'active', note: 'Agreement signed via Digio' },
      }),
    ]);

    const partner = await prisma.kptPartner.findUnique({ where: { crn: agreement.crn } });
    if (partner) {
      await sendSMS(
        partner.mobile,
        `Welcome to KPT! You are now an authorised channel partner (${agreement.crn}). Your ClarityERP credentials will be shared within 24 hours. Welcome to the KPT family!`,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhooks/esign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
