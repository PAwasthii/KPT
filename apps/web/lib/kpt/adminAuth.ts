import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-key-change-in-production'
);

export interface AdminTokenPayload {
  userId: number;
  email: string;
  isDeveloper?: boolean;
}

async function getAdminFromRequest(req: NextRequest): Promise<AdminTokenPayload | null> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('auth_token='))
    ?.slice('auth_token='.length);

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
    const { userId, email } = payload as Record<string, unknown>;
    if (typeof userId !== 'number' || typeof email !== 'string') return null;
    return { userId, email, isDeveloper: payload.isDeveloper as boolean | undefined };
  } catch {
    return null;
  }
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ admin: AdminTokenPayload; error: null } | { admin: null; error: NextResponse }> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return {
      admin: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { admin, error: null };
}
