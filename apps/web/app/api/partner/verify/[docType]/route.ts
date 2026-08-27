import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { getPartnerFromRequest } from '@/lib/kpt/auth';
import { verifyGSTIN } from '@/lib/kpt/apis/gstin';
import { verifyPAN } from '@/lib/kpt/apis/pan';
import { pennyDrop } from '@/lib/kpt/apis/bank';

const schema = z.object({ crn: z.string(), documentId: z.string() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ docType: string }> }) {
  try {
    const session = await getPartnerFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { crn, documentId } = schema.parse(await req.json());
    if (crn !== session.crn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { docType } = await params;
    const doc = await prisma.kptDocument.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    let result: { status: string; message: string; data?: unknown };

    switch (docType) {
      case 'gstin':
        result = await verifyGSTIN(doc.storagePath ?? '');
        break;
      case 'pan':
        result = await verifyPAN(doc.storagePath ?? '');
        break;
      case 'cancelled_cheque':
        result = await pennyDrop('', '');
        break;
      case 'shop_establishment':
      case 'address_proof':
      case 'passport_photo':
        // Manual review documents — mark as manual_review after upload
        result = { status: 'manual_review', message: 'Queued for manual KPT review' };
        break;
      default:
        result = { status: 'manual_review', message: 'Document queued for review' };
    }

    const verifyStatus = result.status === 'verified' ? 'verified' : result.status === 'manual_review' ? 'manual_review' : 'failed';
    await prisma.kptDocument.update({
      where: { id: documentId },
      data: {
        verifyStatus,
        verifyPayload: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
        failReason: verifyStatus === 'failed' ? result.message : undefined,
        verifiedAt: verifyStatus === 'verified' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ status: verifyStatus, message: result.message });
  } catch (err) {
    console.error('[partner/verify]', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 500 });
  }
}
