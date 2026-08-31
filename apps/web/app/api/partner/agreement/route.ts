export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getPartnerFromRequest } from '@/lib/kpt/auth';
import { prisma } from '@repo/db';

export async function GET(req: NextRequest) {
  const session = await getPartnerFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agreement = await prisma.kptAgreement.findUnique({
    where: { crn: session.crn },
    select: { signStatus: true, signingUrl: true, signedAt: true, activatedAt: true },
  });

  return NextResponse.json(agreement ?? null);
}
