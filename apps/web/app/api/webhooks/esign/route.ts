import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { sendSMS } from '@/lib/kpt/sms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { reference_id?: string; status?: string };
    const esignRef = body.reference_id;
    if (!esignRef) return NextResponse.json({ error: 'Missing reference_id' }, { status: 400 });

    const agreement = await prisma.kptAgreement.findFirst({ where: { esignRef } });
    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.kptAgreement.update({ where: { id: agreement.id }, data: { signStatus: 'signed', signedAt: new Date(), activatedAt: new Date() } }),
      prisma.kptPartner.update({ where: { crn: agreement.crn }, data: { status: 'active' } }),
      prisma.kptStatusHistory.create({ data: { crn: agreement.crn, fromStatus: 'approved', toStatus: 'active', note: 'Agreement signed via Leegality' } }),
    ]);

    const partner = await prisma.kptPartner.findUnique({ where: { crn: agreement.crn } });
    if (partner) {
      await sendSMS(partner.mobile, `Welcome to KPT! You are now an authorised channel partner (${agreement.crn}). Your ClarityERP credentials will be shared within 24 hours. Welcome to the KPT family!`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhooks/esign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
