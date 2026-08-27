export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { generateKptAgreement } from '@/lib/kpt/agreement';
import { sendSMS } from '@/lib/kpt/sms';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/kpt/adminAuth';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'more_info']),
  notes: z.string().optional(),
  adminId: z.string().default('admin'),
  adminName: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ crn: string }> }) {
  const { admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { crn } = await params;
    const body = schema.parse(await req.json());
    const { action, notes } = body;
    const adminId = body.adminId ?? String(admin.userId);
    const adminName = body.adminName ?? admin.email;
    const partner = await prisma.kptPartner.findUnique({ where: { crn }, include: { documents: true } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    if (action === 'approve') {
      const agreementPath = `agreements/${crn}/dealer-agreement.pdf`;

      // Generate + upload PDF — non-fatal; approval proceeds even if this fails
      try {
        const gstnDoc = partner.documents.find(d => d.docType === 'gstin');
        const pdfBuffer = await generateKptAgreement({
          crn,
          ownerName: partner.ownerName,
          firmName: partner.firmName,
          city: partner.city ?? '',
          district: partner.district ?? '',
          state: partner.state ?? '',
          pincode: partner.pincode,
          productInterest: partner.productInterest,
          gstin: gstnDoc?.storagePath ?? undefined,
        });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.storage.from('partner-docs').upload(agreementPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
        }
      } catch (pdfErr) {
        console.error('[admin/partners/approve] PDF generation failed (non-fatal):', pdfErr);
      }

      // In production this ref comes from the e-sign provider (Leegality etc.)
      // For now use a deterministic value the mock signing flow can match
      const esignRef = `MOCK-ESIGN-${crn}-0`;

      await prisma.$transaction([
        prisma.kptPartner.update({ where: { crn }, data: { currentStage: 5, status: 'approved' } }),
        prisma.kptAgreement.upsert({
          where: { crn },
          create: { crn, agreementPath, signStatus: 'sent', esignRef },
          update: { agreementPath, signStatus: 'sent', esignRef },
        }),
        prisma.kptStatusHistory.create({ data: { crn, fromStatus: partner.status, toStatus: 'approved', note: notes } }),
        prisma.kptApprovalLog.create({ data: { crn, action: 'approved', doneBy: adminId, doneByName: adminName, notes } }),
      ]);

      await sendSMS(partner.mobile, `Congratulations! Your KPT dealer application (${crn}) has been approved. Please log in to sign your dealer agreement: https://kpt-web.onrender.com/partner/login`);
    } else if (action === 'reject') {
      await prisma.$transaction([
        prisma.kptPartner.update({ where: { crn }, data: { status: 'rejected' } }),
        prisma.kptStatusHistory.create({ data: { crn, fromStatus: partner.status, toStatus: 'rejected', note: notes } }),
        prisma.kptApprovalLog.create({ data: { crn, action: 'rejected', doneBy: adminId, doneByName: adminName, notes } }),
      ]);
      await sendSMS(partner.mobile, `Your KPT channel partner application (${crn}) could not be approved at this time. Reason: ${notes ?? 'Not specified'}. For queries call +91-231-3528151.`);
    } else {
      // more_info
      await prisma.$transaction([
        prisma.kptStatusHistory.create({ data: { crn, fromStatus: partner.status, toStatus: 'more_info_requested', note: notes } }),
        prisma.kptApprovalLog.create({ data: { crn, action: 'more_info_requested', doneBy: adminId, doneByName: adminName, notes } }),
      ]);
      await sendSMS(partner.mobile, `KPT requires additional information for your application (${crn}). Our team will contact you at this number. Queries: +91-231-3528151.`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[admin/partners/approve]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
