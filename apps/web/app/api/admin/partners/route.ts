import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';

export async function GET(req: NextRequest) {
  const { admin, error } = await requireAdmin(req);
  if (error) return error;
  void admin;

  const { searchParams } = req.nextUrl;
  const stage = searchParams.get('stage');
  const status = searchParams.get('status');
  const city = searchParams.get('city');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  const where: Record<string, unknown> = {};
  if (stage) where.currentStage = parseInt(stage);
  if (status) where.status = status;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { crn: { contains: search, mode: 'insensitive' } },
      { firmName: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.kptPartner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { documents: { select: { verifyStatus: true } }, fieldReport: { select: { verifiedAt: true, scheduledDate: true, assignedExecName: true, scheduleNote: true } } },
    }),
    prisma.kptPartner.count({ where }),
  ]);

  return NextResponse.json({ partners, total, page, pages: Math.ceil(total / limit) });
}
