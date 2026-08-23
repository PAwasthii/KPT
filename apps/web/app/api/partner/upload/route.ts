export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getPartnerFromRequest } from '@/lib/kpt/auth';
import { prisma } from '@repo/db';

const schema = z.object({
  crn: z.string(),
  stage: z.number().int(),
  docType: z.string(),
  fileName: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getPartnerFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = schema.parse(await req.json());
    if (body.crn !== session.crn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let signedUrl: string;
    const storagePath = `partner-docs/${body.crn}/stage${body.stage}/${body.docType}/${body.fileName}`;

    if (!supabaseUrl || !supabaseKey) {
      // Dev fallback: mock signed URL
      signedUrl = `https://mock-storage.example.com/upload?path=${encodeURIComponent(storagePath)}&token=mock`;
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.storage.from('partner-docs').createSignedUploadUrl(storagePath);
      if (error || !data) throw new Error(error?.message ?? 'Failed to create signed URL');
      signedUrl = data.signedUrl;
    }

    // Create document record
    const doc = await prisma.kptDocument.create({
      data: { crn: body.crn, stage: body.stage, docType: body.docType, fileName: body.fileName, storagePath, verifyStatus: 'pending' },
    });

    return NextResponse.json({ signedUrl, documentId: doc.id, storagePath });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[partner/upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
