import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { isValidCrn } from '@/lib/kpt/crn';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ crn: string }> }) {
  const { crn } = await params;
  if (!isValidCrn(crn)) return NextResponse.json({ error: 'Invalid CRN format' }, { status: 400 });

  const partner = await prisma.kptPartner.findUnique({
    where: { crn },
    include: {
      fieldReport: true,
      documents: { select: { docType: true, verifyStatus: true, uploadedAt: true, verifiedAt: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      agreement: true,
    },
  });
  if (!partner) return NextResponse.json({ error: 'CRN not found' }, { status: 404 });

  const docCounts = { total: partner.documents.length, verified: partner.documents.filter(d => d.verifyStatus === 'verified' || d.verifyStatus === 'manual_review').length };

  return NextResponse.json({
    crn: partner.crn,
    firmName: partner.firmName,
    ownerName: partner.ownerName,
    city: partner.city,
    state: partner.state,
    currentStage: partner.currentStage,
    status: partner.status,
    createdAt: partner.createdAt,
    fieldReport: partner.fieldReport ? { visitedAt: partner.fieldReport.visitedAt, verifiedAt: partner.fieldReport.verifiedAt, assignedExecName: partner.fieldReport.assignedExecName } : null,
    documents: partner.documents,
    docCounts,
    agreement: partner.agreement ? { signStatus: partner.agreement.signStatus, signedAt: partner.agreement.signedAt, activatedAt: partner.agreement.activatedAt } : null,
    statusHistory: partner.statusHistory,
  });
}
