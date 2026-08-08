import { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/db';
import { verifyToken, JWTPayload } from '../utils/jwt.utils.js';
import { UserRole } from '@prisma/client';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: UserRole;
        isDeveloper?: boolean;
      };
      subdealer?: {
        id: number;
        phone: string;
        gstNumber: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token
    const decoded: JWTPayload = verifyToken(token);

    // Fetch user details from database (get role only)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Developer account enforcement
    const originalUrl = req.originalUrl || '';

    if (decoded.isDeveloper) {
      const allowedPrefixes = ['/api/integrations', '/api/auth/logout', '/api/auth/me'];
      const isAllowed = allowedPrefixes.some(prefix => originalUrl.startsWith(prefix));

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Developer access is restricted to integration management endpoints'
        });
      }
    }

    // If the authenticated user is the developer account but token is not developer-scoped, block access
    const developerEmail = process.env.DEVELOPER_LOGIN_EMAIL?.trim();
    const developerName = process.env.DEVELOPER_LOGIN_NAME?.trim() || 'Developer Access';
    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const isDeveloperAccount =
      (!!developerEmail && user.email.toLowerCase() === developerEmail.toLowerCase()) ||
      (user.role === UserRole.SYSTEM_ADMIN && userFullName.toLowerCase() === developerName.toLowerCase());
    if (isDeveloperAccount && !decoded.isDeveloper) {
      return res.status(403).json({ error: 'Developer must use developer login' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      isDeveloper: !!decoded.isDeveloper
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Subdealer authentication middleware
export async function requireSubdealerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token using subdealer verification
    const { verifySubdealerToken } = await import('../utils/jwt.utils.js');
    const decoded = verifySubdealerToken(token);

    // Verify subdealer exists and is active (optional but recommended)
    const subdealer = await prisma.subdealer.findUnique({
      where: { id: decoded.subdealerId }
    });

    if (!subdealer) {
      return res.status(401).json({ error: 'Subdealer not found' });
    }

    req.subdealer = {
      id: subdealer.id,
      phone: subdealer.phone,
      gstNumber: subdealer.gstNumber,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// New role-based middleware
type UserRoleType = UserRole;
export function requireRole(allowedRoles: UserRoleType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role to access this resource' });
    }
    next();
  };
}

export function requireDeveloper(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isDeveloper) {
    return res.status(403).json({ error: 'Developer access required' });
  }

  next();
}

/**
 * Middleware to validate ADMIN-SECRET from environment variable
 * Accepts secret from header (x-admin-secret) or request body (adminSecret)
 */
export function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ 
      error: 'Admin secret not configured. Please set ADMIN_SECRET environment variable.' 
    });
  }

  // Check header first (x-admin-secret), then body (adminSecret)
  const providedSecret = req.headers['x-admin-secret'] as string || req.body?.adminSecret;

  if (!providedSecret) {
    return res.status(401).json({ 
      error: 'Admin secret required. Provide it via x-admin-secret header or adminSecret in request body.' 
    });
  }

  if (providedSecret !== adminSecret) {
    return res.status(403).json({ 
      error: 'Invalid admin secret' 
    });
  }

  next();
}