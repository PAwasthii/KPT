import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.KPT_JWT_SECRET ?? 'kpt-dev-secret-change-in-production'
);
const ALG = 'HS256';
const COOKIE_NAME = 'kpt_partner_token';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface PartnerTokenPayload {
  crn: string;
  mobile: string;
  firmName: string;
}

export async function signPartnerToken(payload: PartnerTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifyPartnerToken(token: string): Promise<PartnerTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
    const { crn, mobile, firmName } = payload as Record<string, unknown>;
    if (typeof crn !== 'string' || typeof mobile !== 'string' || typeof firmName !== 'string') {
      return null;
    }
    return { crn, mobile, firmName };
  } catch {
    return null;
  }
}

export async function getPartnerFromRequest(request: Request): Promise<PartnerTokenPayload | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!token) return null;
  return verifyPartnerToken(token);
}

export function setPartnerCookie(response: Response, token: string): void {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`
  );
}

export function clearPartnerCookie(response: Response): void {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
}
