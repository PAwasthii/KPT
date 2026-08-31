export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { requireAdmin } from '@/lib/kpt/adminAuth';
import { generateKptAgreement } from '@/lib/kpt/agreement';
import { createDigioRequest } from '@/lib/kpt/digio';

export async function POST(req: NextRequest, { params }: { params: Promise<{ crn: string }> }) {
  const { admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { crn } = await params;

    const partner = await prisma.kptPartner.findUnique({
      where: { crn },
      include: { documents: true, agreement: true },
    });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    if (partner.currentStage < 5) return NextResponse.json({ error: 'Partner not at agreement stage' }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const gstnDoc = partner.documents.find(d => d.docType === 'gstin');

    let esignRef: string;
    let signingUrl: string | null;

    const devMode = !process.env.DIGIO_CLIENT_ID || !process.env.DIGIO_CLIENT_SECRET;

    if (devMode) {
      // Dev fallback — skip Digio, use a local test signing page
      esignRef = `MOCK-ESIGN-${crn}-${Date.now()}`;
      signingUrl = `${appUrl}/dev/esign-test?ref=${encodeURIComponent(esignRef)}&crn=${encodeURIComponent(crn)}`;
    } else {
      const pdfBuffer = await generateKptAgreement({
        crn,
        ownerName: partner.ownerName,
        firmName: partner.firmName,
        city: partner.city ?? '',
        district: partner.district ?? '',
        state: partner.state ?? '',
        pincode: partner.pincode,
        productInterest: partner.productInterest,
        gstin: gstnDoc?.storagePath ?? undefined,
      });

      const digio = await createDigioRequest(
        pdfBuffer,
        `KPT-Dealer-Agreement-${crn}.pdf`,
        partner.email,
        partner.ownerName,
        `${appUrl}/api/webhooks/esign`,
      );

      esignRef = digio.id;
      signingUrl = digio.signing_parties[0]?.sign_link ?? null;
    }

    await prisma.$transaction([
      prisma.kptAgreement.upsert({
        where: { crn },
        create: {
          crn,
          agreementPath: `agreements/${crn}/dealer-agreement.pdf`,
          esignRef,
          signingUrl,
          signStatus: 'sent',
        },
        update: { esignRef, signingUrl, signStatus: 'sent' },
      }),
      prisma.kptApprovalLog.create({
        data: {
          crn,
          action: 'agreement_sent',
          doneBy: String(admin.userId),
          doneByName: admin.email,
          notes: `Agreement sent via Digio. Ref: ${esignRef}`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, esignRef, signingUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-for-signing]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
