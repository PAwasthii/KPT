import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { createHash, randomInt } from 'crypto';
import { sendSMS } from '@/lib/kpt/sms';

const schema = z.object({
  crn: z.string().regex(/^KPT-CP-\d{4}-\d{5}$/),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
});

export async function POST(req: NextRequest) {
  try {
    const { crn, mobile } = schema.parse(await req.json());
    const partner = await prisma.kptPartner.findUnique({ where: { crn } });
    if (!partner || partner.mobile !== mobile) {
      return NextResponse.json({ error: 'CRN and mobile number do not match our records' }, { status: 401 });
    }

    const otp = process.env.NODE_ENV !== 'production' ? '123456' : String(randomInt(100000, 999999));
    const otpHash = createHash('sha256').update(otp + crn).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.kptOtp.create({ data: { mobile, crn, otpHash, expiresAt } });

    await sendSMS(mobile, `Your KPT login OTP is ${otp}. Valid for 10 minutes. Do not share this OTP.`);

    return NextResponse.json({ sent: true, ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[partner/auth/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
