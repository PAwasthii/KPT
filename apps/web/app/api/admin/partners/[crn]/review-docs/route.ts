export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';
import { generateKptAgreement } from '@/lib/kpt/agreement';
import { sendSMS } from '@/lib/kpt/sms';
import { createClient } from '@supabase/supabase-js';

const schema = z.object({
  action: z.enum(['approve_doc', 'reject_doc', 'approve_all']),
  docId: z.string().optional(),
  reason: z.string().optional(),
  adminId: z.string().optional(),
  adminName: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ crn: string }> },
) {
  const { admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { crn } = await params;
    const body = schema.parse(await req.json());
    const { action, docId, reason } = body;
    const adminId = body.adminId ?? String(admin.userId);
    const adminName = body.adminName ?? admin.email;

    if (action === 'approve_doc') {
      if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
      await prisma.kptDocument.update({
        where: { id: docId },
        data: { verifyStatus: 'verified', verifiedAt: new Date() },
      });
      await prisma.kptApprovalLog.create({
        data: { crn, action: 'doc_approved', doneBy: adminId, doneByName: adminName, notes: `Document ${docId} approved` },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject_doc') {
      if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
      await prisma.kptDocument.update({
        where: { id: docId },
        data: { verifyStatus: 'failed', failReason: reason ?? 'Rejected by admin' },
      });
      await prisma.kptApprovalLog.create({
        data: { crn, action: 'doc_rejected', doneBy: adminId, doneByName: adminName, notes: reason ?? 'Rejected by admin' },
      });
      return NextResponse.json({ success: true });
    }

    // approve_all → generate agreement + advance to Stage 5
    const partner = await prisma.kptPartner.findUnique({
      where: { crn },
      include: { documents: true },
    });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    // Mark any remaining pending / manual_review docs as verified
    await prisma.kptDocument.updateMany({
      where: { crn, verifyStatus: { in: ['pending', 'manual_review'] } },
      data: { verifyStatus: 'verified', verifiedAt: new Date() },
    });

    const agreementPath = `agreements/${crn}/dealer-agreement.pdf`;
    const esignRef = `MOCK-ESIGN-${crn}-0`;

    try {
      const pdfBuffer = await generateKptAgreement({
        crn,
        ownerName: partner.ownerName,
        firmName: partner.firmName,
        city: partner.city ?? '',
        district: partner.district ?? '',
        state: partner.state ?? '',
        pincode: partner.pincode,
        productInterest: partner.productInterest,
      });
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.storage
          .from('partner-docs')
          .upload(agreementPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
      }
    } catch (e) {
      console.error('[review-docs] PDF generation failed (non-fatal):', e);
    }

    await prisma.$transaction([
      prisma.kptPartner.update({
        where: { crn },
        data: { currentStage: 5, status: 'approved' },
      }),
      prisma.kptAgreement.upsert({
        where: { crn },
        create: { crn, agreementPath, signStatus: 'sent', esignRef },
        update: { agreementPath, signStatus: 'sent', esignRef },
      }),
      prisma.kptStatusHistory.create({
        data: {
          crn,
          fromStatus: partner.status,
          toStatus: 'approved',
          note: `All ${partner.documents.length} documents verified — agreement sent for signing`,
        },
      }),
      prisma.kptApprovalLog.create({
        data: {
          crn,
          action: 'docs_all_approved',
          doneBy: adminId,
          doneByName: adminName,
          notes: `All documents approved. Partner advanced to Stage 5.`,
        },
      }),
    ]);

    await sendSMS(
      partner.mobile,
      `Congratulations! Your KPT dealer application (${crn}) documents have been approved. Please log in to review and sign your dealer agreement: https://kpt-web.onrender.com/partner/login`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[admin/review-docs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
