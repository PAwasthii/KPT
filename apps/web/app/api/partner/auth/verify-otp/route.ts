import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { createHash } from 'crypto';
import { signPartnerToken } from '@/lib/kpt/auth';

const schema = z.object({
  crn: z.string(),
  mobile: z.string(),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const { crn, mobile, otp } = schema.parse(await req.json());
    const otpHash = createHash('sha256').update(otp + crn).digest('hex');

    const record = await prisma.kptOtp.findFirst({
      where: { mobile, crn, otpHash, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });

    // Mark OTP as used
    await prisma.kptOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    const partner = await prisma.kptPartner.findUnique({ where: { crn } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    const token = await signPartnerToken({ crn, mobile, firmName: partner.firmName });

    const res = NextResponse.json({ crn, firmName: partner.firmName, currentStage: partner.currentStage });
    res.cookies.set('kpt_partner_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[partner/auth/verify-otp]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
