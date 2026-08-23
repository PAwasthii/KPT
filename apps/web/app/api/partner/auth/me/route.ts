import { NextRequest, NextResponse } from 'next/server';
import { getPartnerFromRequest } from '@/lib/kpt/auth';
import { prisma } from '@repo/db';

export async function GET(req: NextRequest) {
  const session = await getPartnerFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const partner = await prisma.kptPartner.findUnique({
    where: { crn: session.crn },
    select: {
      crn: true, firmName: true, ownerName: true, mobile: true, email: true,
      currentStage: true, status: true, city: true, state: true,
      productInterest: true, createdAt: true,
      fieldReport: { select: { scheduledDate: true, assignedExecName: true, scheduleNote: true } },
    },
  });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const { fieldReport, ...rest } = partner;
  return NextResponse.json({
    ...rest,
    fieldVisit: fieldReport ? {
      scheduledDate: fieldReport.scheduledDate?.toISOString() ?? null,
      execName: fieldReport.assignedExecName ?? null,
      note: fieldReport.scheduleNote ?? null,
    } : null,
  });
}
