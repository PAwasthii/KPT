import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { sendSMS } from '@/lib/kpt/sms';
import { sendEmail } from '@/lib/kpt/email';

const schema = z.object({
  ownerName: z.string().min(2),
  firmName: z.string().min(2),
  countryCode: z.string().min(1),
  mobile: z.string().min(5).max(15),
  email: z.string().email(),
  pincode: z.string().min(3).max(12),
  district: z.string().optional(),
  shopSizeSqft: z.number().positive().optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  existingBrands: z.string().optional(),
  turnoverRange: z.string().optional(),
  productInterest: z.array(z.string()).min(1, 'Select at least one product category'),
}).superRefine((data, ctx) => {
  if (data.countryCode === '+91' && !/^[6-9]\d{9}$/.test(data.mobile)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter valid 10-digit Indian mobile', path: ['mobile'] });
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Deduplicate
    const existing = await prisma.kptPartner.findFirst({
      where: { OR: [{ mobile: data.mobile }, { email: data.email }] },
    });
    if (existing) {
      return NextResponse.json({ error: 'An application with this mobile or email already exists', crn: existing.crn }, { status: 409 });
    }

    // Generate CRN via Supabase RPC (PostgreSQL function)
    const crnResult = await prisma.$queryRawUnsafe<[{ generate_kpt_crn: string }]>('SELECT generate_kpt_crn()');
    const crn = crnResult[0]?.generate_kpt_crn;
    if (!crn) throw new Error('CRN generation failed');

    // Create partner record
    await prisma.kptPartner.create({
      data: {
        crn,
        ownerName: data.ownerName,
        firmName: data.firmName,
        countryCode: data.countryCode,
        mobile: data.mobile,
        email: data.email,
        pincode: data.pincode,
        district: data.district,
        shopSizeSqft: data.shopSizeSqft,
        yearsInBusiness: data.yearsInBusiness,
        existingBrands: data.existingBrands,
        turnoverRange: data.turnoverRange,
        productInterest: data.productInterest,
        currentStage: 1,
        status: 'enquiry_received',
        statusHistory: {
          create: { fromStatus: '', toStatus: 'enquiry_received', note: 'Online enquiry submitted' },
        },
      },
    });

    // Create empty field verification record
    await prisma.kptFieldVerification.create({ data: { crn } });

    const trackUrl = `${process.env.NEXT_PUBLIC_VERCEL_URL ?? 'https://kpt-web.onrender.com'}/partner/track/${crn}`;

    // Mock SMS + email
    await sendSMS(data.mobile, `Welcome to KPT! Your CRN is ${crn}. Track your application at ${trackUrl}`);
    await sendEmail(data.email, 'KPT Partner Application Received',
      `<p>Dear ${data.ownerName},</p><p>Thank you for applying to become a KPT Authorised Channel Partner.</p><p>Your Channel Reference Number (CRN): <strong>${crn}</strong></p><p>Track your application: <a href="${trackUrl}">${trackUrl}</a></p><p>Regards,<br/>KPT Network Development Team</p>`
    );

    return NextResponse.json({ crn, message: 'Application submitted successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    console.error('[partner/apply]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
