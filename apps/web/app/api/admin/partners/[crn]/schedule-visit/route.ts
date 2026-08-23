import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';

const schema = z.object({
  scheduledDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  execName: z.string().min(1, 'Exec name required'),
  execId: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ crn: string }> }) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { crn } = await params;
    const body = schema.parse(await req.json());
    const scheduledDate = new Date(body.scheduledDate);

    const partner = await prisma.kptPartner.findUnique({ where: { crn } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    if (partner.currentStage > 2) return NextResponse.json({ error: 'Partner is already past field visit stage' }, { status: 400 });

    await prisma.$transaction([
      prisma.kptFieldVerification.upsert({
        where: { crn },
        create: {
          crn,
          assignedExecId: body.execId,
          assignedExecName: body.execName,
          scheduledDate,
          scheduleNote: body.note,
        },
        update: {
          assignedExecId: body.execId,
          assignedExecName: body.execName,
          scheduledDate,
          scheduleNote: body.note,
        },
      }),
      prisma.kptPartner.update({
        where: { crn },
        data: { currentStage: 2, status: 'field_visit_scheduled' },
      }),
      prisma.kptStatusHistory.create({
        data: {
          crn,
          fromStatus: partner.status,
          toStatus: 'field_visit_scheduled',
          note: `Field visit scheduled for ${scheduledDate.toLocaleDateString('en-IN')} with ${body.execName}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 });
    console.error('[schedule-visit]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
