import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';

const schema = z.object({
  crn: z.string(),
  shopDimensions: z.string().optional(),
  roadVisibility: z.enum(['Good', 'Average', 'Poor']),
  locationScore: z.enum(['High', 'Medium', 'Low']),
  existingLines: z.string().optional(),
  marketPotential: z.enum(['High', 'Medium', 'Low']),
  nearestDealer: z.string().optional(),
  execNotes: z.string().optional(),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
  shopPhotoPath: z.string().optional(),
  assignedExecId: z.string().optional(),
  assignedExecName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const data = schema.parse(await req.json());

    await prisma.kptFieldVerification.upsert({
      where: { crn: data.crn },
      create: {
        crn: data.crn,
        shopDimensions: data.shopDimensions,
        roadVisibility: data.roadVisibility,
        locationScore: data.locationScore,
        existingLines: data.existingLines,
        marketPotential: data.marketPotential,
        nearestDealer: data.nearestDealer,
        execNotes: data.execNotes,
        geoLat: data.geoLat,
        geoLng: data.geoLng,
        shopPhotoPath: data.shopPhotoPath,
        assignedExecId: data.assignedExecId,
        assignedExecName: data.assignedExecName,
        visitedAt: new Date(),
        verifiedAt: new Date(),
      },
      update: {
        shopDimensions: data.shopDimensions,
        roadVisibility: data.roadVisibility,
        locationScore: data.locationScore,
        existingLines: data.existingLines,
        marketPotential: data.marketPotential,
        nearestDealer: data.nearestDealer,
        execNotes: data.execNotes,
        geoLat: data.geoLat,
        geoLng: data.geoLng,
        shopPhotoPath: data.shopPhotoPath,
        visitedAt: new Date(),
        verifiedAt: new Date(),
      },
    });

    const partner = await prisma.kptPartner.findUnique({ where: { crn: data.crn } });
    if (partner && partner.currentStage < 3) {
      await prisma.$transaction([
        prisma.kptPartner.update({ where: { crn: data.crn }, data: { currentStage: 3, status: 'field_verified' } }),
        prisma.kptStatusHistory.create({ data: { crn: data.crn, fromStatus: partner.status, toStatus: 'field_verified', note: 'Field verification completed' } }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 });
    console.error('[partner/field-report]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
