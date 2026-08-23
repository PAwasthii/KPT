import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { getPartnerFromRequest } from '@/lib/kpt/auth';

const schema = z.object({ crn: z.string(), targetStage: z.number().int().min(1).max(5) });

export async function POST(req: NextRequest) {
  try {
    const session = await getPartnerFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { crn, targetStage } = schema.parse(await req.json());
    if (crn !== session.crn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check stage 3 → 4: all docs must be verified or manual_review
    if (targetStage === 4) {
      const unverified = await prisma.kptDocument.count({
        where: { crn, stage: 3, verifyStatus: { notIn: ['verified', 'manual_review'] } },
      });
      if (unverified > 0) return NextResponse.json({ error: `${unverified} documents still pending verification` }, { status: 422 });
    }

    const partner = await prisma.kptPartner.findUnique({ where: { crn } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.kptPartner.update({ where: { crn }, data: { currentStage: targetStage } }),
      prisma.kptStatusHistory.create({ data: { crn, fromStatus: partner.status, toStatus: `stage_${targetStage}`, note: 'Partner advanced stage' } }),
      prisma.kptApprovalLog.create({ data: { crn, action: 'stage_advanced', doneBy: crn, doneByName: partner.firmName, notes: `Advanced to stage ${targetStage}` } }),
    ]);

    return NextResponse.json({ success: true, currentStage: targetStage });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[partner/stage/advance]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
