import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ crn: string }> },
) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { crn } = await params;

  const partner = await prisma.kptPartner.findUnique({
    where: { crn },
    include: {
      fieldReport: true,
      documents: {
        select: {
          id: true,
          docType: true,
          fileName: true,
          storagePath: true,
          verifyStatus: true,
          failReason: true,
          uploadedAt: true,
          verifiedAt: true,
        },
      },
      approvalLogs: {
        orderBy: { createdAt: 'asc' },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
      agreement: true,
    },
  });

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  return NextResponse.json({
    crn: partner.crn,
    ownerName: partner.ownerName,
    firmName: partner.firmName,
    mobile: partner.mobile,
    email: partner.email,
    city: partner.city,
    district: partner.district,
    state: partner.state,
    pincode: partner.pincode,
    shopSizeSqft: partner.shopSizeSqft,
    existingBrands: partner.existingBrands,
    yearsInBusiness: partner.yearsInBusiness,
    turnoverRange: partner.turnoverRange,
    productInterest: partner.productInterest,
    currentStage: partner.currentStage,
    status: partner.status,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
    fieldReport: partner.fieldReport,
    documents: partner.documents,
    approvalLogs: partner.approvalLogs,
    statusHistory: partner.statusHistory,
    agreement: partner.agreement
      ? {
          signStatus: partner.agreement.signStatus,
          signingUrl: partner.agreement.signingUrl,
          signedAt: partner.agreement.signedAt,
          activatedAt: partner.agreement.activatedAt,
        }
      : null,
  });
}
