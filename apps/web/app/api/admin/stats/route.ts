import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [total, byStage, active, rejected, recent] = await Promise.all([
    prisma.kptPartner.count(),
    prisma.kptPartner.groupBy({ by: ['currentStage'], _count: true }),
    prisma.kptPartner.count({ where: { status: 'active' } }),
    prisma.kptPartner.count({ where: { status: 'rejected' } }),
    prisma.kptPartner.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const stageMap = Object.fromEntries(byStage.map(s => [s.currentStage, s._count]));
  return NextResponse.json({ total, stage1: stageMap[1] ?? 0, stage2: stageMap[2] ?? 0, stage3: stageMap[3] ?? 0, stage4: stageMap[4] ?? 0, stage5: stageMap[5] ?? 0, active, rejected, recent });
}
