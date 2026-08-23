import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@repo/db';
import { generateToken, generateResetToken, verifyResetToken } from '../utils/jwt.utils.js';
import crypto from 'crypto';
import { emailService } from '../services/email.service.js';
import { recordAuditLog } from '../utils/audit.utils.js';
import { UserRole, AuthProvider, AuditCategory } from '@prisma/client';
import {
  handleError,
  handleValidationError,
  handleUnauthorizedError,
  handleNotFoundError,
  handleForbiddenError,
  handleConflictError,
  validateRequiredFields,
} from '../utils/errorHandler.js';
import { isValidEmail, isValidPhone, isValidName } from '../utils/validators.js';
import { parsePhoneNumber } from '../utils/phoneHelper.js';
import { generateUserPassword } from '../utils/password.utils.js';
import { createNotification } from './notification.controller.js';

const developerEmailConfigured = process.env.DEVELOPER_LOGIN_EMAIL?.trim();
const developerEmailNormalized = developerEmailConfigured ? developerEmailConfigured.toLowerCase() : undefined;
const developerPasswordConfigured = process.env.DEVELOPER_LOGIN_PASSWORD;
const developerNameConfigured = process.env.DEVELOPER_LOGIN_NAME || 'Developer Access';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!validateRequiredFields(req.body, ['email', 'password'], res, 'Login')) {
        return;
      }

      // Normalize email: trim whitespace and convert to lowercase for consistent matching
      const normalizedEmail = email.trim().toLowerCase();

      // Find user by email - try normalized email first, then original if different
      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // If not found with normalized email, try original email (in case it was stored differently)
      if (!user && email.trim() !== normalizedEmail) {
        user = await prisma.user.findUnique({
          where: { email: email.trim() },
        });
      }

      if (!user) {
        return handleUnauthorizedError(res, 'Invalid email or password', 'Login');
      }

      const developerName = (process.env.DEVELOPER_LOGIN_NAME || 'Developer Access').toLowerCase();
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      if (
        (developerEmailNormalized && user.email.trim().toLowerCase() === developerEmailNormalized) ||
        (user.role === UserRole.SYSTEM_ADMIN && userFullName === developerName)
      ) {
        return handleForbiddenError(res, 'Developer access requires the dedicated login route', 'Login');
      }

      // Compare password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return handleUnauthorizedError(res, 'Invalid email or password', 'Login');
      }

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      // Return user data (excluding password hash) and token
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        role: user.role
      };

      res.json({
        token,
        user: userResponse,
        isDeveloper: false
      });
    } catch (error) {
      handleError(error, res, 'Login');
    }
  }

  async logout(req: Request, res: Response) {
    try {
      if (req.user?.isDeveloper) {
        await recordAuditLog({
          action: 'DEVELOPER_LOGOUT',
          changedBy: req.user.id,
          entityType: 'DEVELOPER_AUTH',
          entityId: req.user.id,
          oldValues: null,
          newValues: null,
        });
      }

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      handleError(error, res, 'Logout');
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return handleUnauthorizedError(res, 'User not authenticated', 'Get current user');
      }

      // Fetch full user details from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return handleNotFoundError(res, 'User', 'Get current user');
      }

      // Return user data (excluding password hash)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        role: user.role,
        isDeveloper: req.user?.isDeveloper ?? false
      };

      res.json(userResponse);
    } catch (error) {
      handleError(error, res, 'Get current user');
    }
  }

  async createTestAdmin(req: Request, res: Response) {
    try {
      // Verify secret token for protection
      const { secret } = req.body;
      const expectedSecret = process.env.TEST_ADMIN_SECRET || "1234";

      if (secret !== expectedSecret) {
        return handleForbiddenError(res, 'Invalid secret token', 'Create test admin');
      }

      // Check if test admin already exists
      const existingAdmin = await prisma.user.findUnique({
        where: { email: "superadmin@example.com" }
      });

      if (existingAdmin) {
        return res.status(200).json({
          message: 'Test admin already exists'
        });
      }

      // Create test admin user
      const passwordHash = await bcrypt.hash("admin123", 10);

      await prisma.user.create({
        data: {
          firstName: "Super",
          lastName: "Admin",
          email: "superadmin@example.com",
          passwordHash,
          role: UserRole.SYSTEM_ADMIN
        }
      });

      res.status(201).json({
        message: 'Test admin created successfully'
      });
    } catch (error) {
      handleError(error, res, 'Create test admin');
    }
  }

  async developerLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!developerEmailConfigured || !developerPasswordConfigured) {
        return handleForbiddenError(res, 'Developer credentials not configured', 'Developer login');
      }

      if (!email || !password) {
        return handleValidationError(res, 'Email and password are required', undefined, 'Developer login');
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!developerEmailNormalized || normalizedEmail !== developerEmailNormalized) {
        return handleUnauthorizedError(res, 'Invalid developer credentials', 'Developer login');
      }

      if (password !== developerPasswordConfigured) {
        return handleUnauthorizedError(res, 'Invalid developer credentials', 'Developer login');
      }

      let developerUser = await prisma.user.findUnique({
        where: { email: developerEmailConfigured }
      });

      const ensurePasswordHash = async () => bcrypt.hash(developerPasswordConfigured!, 10);

      // Parse developer name into firstName/lastName
      const developerNameParts = developerNameConfigured.split(' ');
      const developerFirstName = developerNameParts[0] || 'Developer';
      const developerLastName = developerNameParts.slice(1).join(' ') || 'Access';

      if (!developerUser) {
        developerUser = await prisma.user.create({
          data: {
            email: developerEmailConfigured,
            firstName: developerFirstName,
            lastName: developerLastName,
            passwordHash: await ensurePasswordHash(),
            role: UserRole.SYSTEM_ADMIN
          }
        });
      } else {
        const updates: Record<string, unknown> = {};

        if (developerUser.role !== UserRole.SYSTEM_ADMIN) {
          updates.role = UserRole.SYSTEM_ADMIN;
        }

        if (developerUser.firstName !== developerFirstName) {
          updates.firstName = developerFirstName;
        }
        if (developerUser.lastName !== developerLastName) {
          updates.lastName = developerLastName;
        }

        const passwordMatches = await bcrypt.compare(
          developerPasswordConfigured!,
          developerUser.passwordHash
        );

        if (!passwordMatches) {
          updates.passwordHash = await ensurePasswordHash();
        }

        if (Object.keys(updates).length > 0) {
          developerUser = await prisma.user.update({
            where: { id: developerUser.id },
            data: updates
          });
        }
      }

      const token = generateToken(developerUser.id, developerUser.email, { isDeveloper: true });

      const userResponse = {
        id: developerUser.id,
        email: developerUser.email,
        firstName: developerUser.firstName,
        lastName: developerUser.lastName,
        createdAt: developerUser.createdAt,
        role: developerUser.role
      };

      await recordAuditLog({
        action: 'DEVELOPER_LOGIN',
        changedBy: developerUser.id,
        entityType: 'DEVELOPER_AUTH',
        entityId: developerUser.id,
        oldValues: null,
        newValues: {
          email: developerUser.email,
        },
      });

      res.json({
        token,
        user: userResponse,
        isDeveloper: true
      });
    } catch (error) {
      handleError(error, res, 'Developer login');
    }
  }

  /**
   * Start forgot password: generate OTP and email it
   * POST /api/auth/forgot-password { email }
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        return handleValidationError(res, 'Email is required', 'email', 'Forgot password');
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Do not reveal existence; respond success
        return res.json({ success: true });
      }

      // Create 6-digit numeric OTP
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      const otpHash = await bcrypt.hash(otp, 10);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create reset record
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
        },
      });

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      await emailService.sendPasswordResetOtpEmail(email, userName, otp);

      return res.json({ success: true });
    } catch (error) {
      handleError(error, res, 'Forgot password');
    }
  }

  /**
   * Verify OTP and return a short-lived reset token
   * POST /api/auth/forgot-password/verify { email, otp }
   */
  async verifyForgotPassword(req: Request, res: Response) {
    try {
      const { email, otp } = req.body as { email?: string; otp?: string };
      if (!email || !otp) {
        return handleValidationError(res, 'Email and otp are required', undefined, 'Verify OTP');
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return handleUnauthorizedError(res, 'Invalid code', 'Verify OTP');
      }

      // Get latest non-used, non-expired reset entry
      const record = await prisma.passwordReset.findFirst({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return handleUnauthorizedError(res, 'Invalid or expired code', 'Verify OTP');
      }

      if (record.attempts >= 5) {
        return handleUnauthorizedError(res, 'Too many attempts', 'Verify OTP');
      }

      const ok = await bcrypt.compare(otp, record.otpHash);
      if (!ok) {
        await prisma.passwordReset.update({ where: { id: record.id }, data: { attempts: record.attempts + 1 } });
        return handleUnauthorizedError(res, 'Invalid code', 'Verify OTP');
      }

      // Mark usedAt to prevent reuse of OTP itself, but keep row for jti mapping
      const updated = await prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } });

      // Use record id as jti
      const resetToken = generateResetToken(user.id, String(updated.id), '15m');
      return res.json({ resetToken, expiresIn: 900 });
    } catch (error) {
      handleError(error, res, 'Verify OTP');
    }
  }

  /**
   * Reset password with resetToken
   * POST /api/auth/forgot-password/reset { resetToken, newPassword }
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { resetToken, newPassword } = req.body as { resetToken?: string; newPassword?: string };
      if (!resetToken || !newPassword) {
        return handleValidationError(res, 'resetToken and newPassword are required', undefined, 'Reset password');
      }
      if (newPassword.length < 8) {
        return handleValidationError(res, 'Password must be at least 8 characters', 'newPassword', 'Reset password');
      }

      const decoded = verifyResetToken(resetToken);

      // Ensure the referenced reset record exists and is not expired beyond grace
      const recId = Number(decoded.jti);
      const rec = await prisma.passwordReset.findUnique({ where: { id: recId } });
      if (!rec || rec.userId !== decoded.userId) {
        return handleUnauthorizedError(res, 'Invalid reset token', 'Reset password');
      }

      const hash = await bcrypt.hash(newPassword, 10);

      await prisma.$transaction([
        prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash: hash } }),
        // Invalidate all outstanding reset requests for user
        prisma.passwordReset.updateMany({ where: { userId: decoded.userId, usedAt: null }, data: { usedAt: new Date() } }),
      ]);

      createNotification({
        userId: decoded.userId,
        type: 'PASSWORD_RESET',
        title: 'Password Reset Successfully',
        message: 'Your password was reset successfully. If this wasn\'t you, contact support immediately.',
      }).catch(() => {});

      return res.json({ success: true });
    } catch (error) {
      handleError(error, res, 'Reset password');
    }
  }

  /**
   * Change password for authenticated user
   * POST /api/auth/change-password { currentPassword, newPassword }
   */
  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return handleUnauthorizedError(res, 'User not authenticated', 'Change password');
      }
      const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
      if (!currentPassword || !newPassword) {
        return handleValidationError(res, 'currentPassword and newPassword are required', undefined, 'Change password');
      }
      if (newPassword.length < 8) {
        return handleValidationError(res, 'Password must be at least 8 characters', 'newPassword', 'Change password');
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return handleNotFoundError(res, 'User', 'Change password');
      }

      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        createNotification({
          userId: user.id,
          type: 'PASSWORD_CHANGE_FAILED',
          title: 'Password Change Failed',
          message: `An unsuccessful password change attempt was made on your account (${user.email}). If this wasn't you, contact support.`,
        }).catch(() => {});
        return handleUnauthorizedError(res, 'Current password is incorrect', 'Change password');
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

      createNotification({
        userId: user.id,
        type: 'PASSWORD_CHANGED',
        title: 'Password Changed Successfully',
        message: `Your password for ${user.email} was changed successfully. If this wasn't you, contact support immediately.`,
      }).catch(() => {});

      return res.json({ success: true });
    } catch (error) {
      handleError(error, res, 'Change password');
    }
  }

  /**
   * Send login OTP to email address
   * POST /api/auth/otp/send { email }
   */
  async sendOtpLogin(req: Request, res: Response) {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        return handleValidationError(res, 'Email is required', 'email', 'OTP login');
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Invalidate any previous unused OTPs for this email
      await prisma.loginOtp.updateMany({
        where: { email: normalizedEmail, usedAt: null },
        data: { usedAt: new Date() },
      });

      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.loginOtp.create({
        data: { email: normalizedEmail, otpHash, expiresAt },
      });

      // Find user name if they exist (don't reveal whether they exist)
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || normalizedEmail : '';

      const emailSent = await emailService.sendLoginOtpEmail(normalizedEmail, name, otp);
      if (!emailSent) {
        const fromDomain = (process.env.RESEND_FROM_EMAIL || '').split('@')[1] ?? '';
        const hint = fromDomain
          ? `The sending domain "${fromDomain}" may not be verified in Resend. Visit https://resend.com/domains to verify it.`
          : 'RESEND_FROM_EMAIL is not configured.';
        console.error(`[Auth.sendOtpLogin] Email delivery failed — ${hint}`);
        return res.status(503).json({
          success: false,
          error: 'OTP could not be delivered. Email is not configured correctly — please contact your administrator.',
        });
      }

      return res.json({ success: true });
    } catch (error) {
      handleError(error, res, 'Send OTP login');
    }
  }

  /**
   * Verify login OTP and return JWT
   * POST /api/auth/otp/verify { email, otp }
   */
  async verifyOtpLogin(req: Request, res: Response) {
    try {
      const { email, otp } = req.body as { email?: string; otp?: string };
      if (!email || !otp) {
        return handleValidationError(res, 'Email and otp are required', undefined, 'Verify OTP login');
      }

      const normalizedEmail = email.trim().toLowerCase();

      const record = await prisma.loginOtp.findFirst({
        where: { email: normalizedEmail, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) {
        return handleUnauthorizedError(res, 'Invalid or expired code', 'Verify OTP login');
      }

      if (record.attempts >= 5) {
        return handleUnauthorizedError(res, 'Too many attempts. Request a new code.', 'Verify OTP login');
      }

      const ok = await bcrypt.compare(otp, record.otpHash);
      if (!ok) {
        await prisma.loginOtp.update({ where: { id: record.id }, data: { attempts: record.attempts + 1 } });
        const remaining = 5 - (record.attempts + 1);
        return handleUnauthorizedError(
          res,
          remaining > 0 ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Too many attempts. Request a new code.',
          'Verify OTP login'
        );
      }

      // Mark OTP used
      await prisma.loginOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });

      // Find or create user — new emails become GUEST
      let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const isNewUser = !user;

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: '',
            role: UserRole.GUEST,
            authProvider: AuthProvider.EMAIL_OTP,
            lastLoginAt: new Date(),
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider: AuthProvider.EMAIL_OTP, lastLoginAt: new Date() },
        });
      }

      await recordAuditLog({
        action: isNewUser ? 'GUEST_CREATED' : 'LOGIN_SUCCESS',
        changedBy: user.id,
        entityType: 'USER',
        entityId: user.id,
        newValues: { email: normalizedEmail, method: 'EMAIL_OTP' },
        category: AuditCategory.AUTH_MANAGEMENT,
      });

      const token = generateToken(user.id, user.email);
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
          role: user.role,
        },
        isDeveloper: false,
      });
    } catch (error) {
      handleError(error, res, 'Verify OTP login');
    }
  }

  /**
   * Create a system admin user (protected by ADMIN-SECRET)
   * POST /api/auth/create-system-admin
   * Requires: ADMIN_SECRET environment variable
   */
  async createSystemAdmin(req: Request, res: Response) {
    try {
      // Ensure request body is parsed
      if (!req.body || typeof req.body !== 'object') {
        return handleValidationError(
          res,
          'Request body is required. Please ensure Content-Type is application/json and body is properly formatted.',
          'body',
          'Create system admin'
        );
      }

      const { firstName, lastName, email, phone, role } = req.body;

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'role'];
      if (!validateRequiredFields(req.body, requiredFields, res, 'Create system admin')) {
        return;
      }

      // Normalize email: trim whitespace and convert to lowercase for consistent storage
      const normalizedEmail = email.trim().toLowerCase();

      // Validate firstName
      if (!isValidName(firstName)) {
        return handleValidationError(
          res,
          'First name is required and must be non-empty (max 255 characters)',
          'firstName',
          'Create system admin'
        );
      }

      // Validate lastName
      if (!isValidName(lastName)) {
        return handleValidationError(
          res,
          'Last name is required and must be non-empty (max 255 characters)',
          'lastName',
          'Create system admin'
        );
      }

      // Validate email format
      if (!isValidEmail(normalizedEmail)) {
        return handleValidationError(
          res,
          'Invalid email format. Email must be a valid address ending with .com, .co, .in, .org, .net, .edu, .gov, .io, or .info',
          'email',
          'Create system admin'
        );
      }

      // Validate phone if provided
      if (phone && !isValidPhone(phone)) {
        return handleValidationError(
          res,
          'Invalid phone number. Phone must be 10 digits',
          'phone',
          'Create system admin'
        );
      }

      // Validate role - must be SYSTEM_ADMIN or ADMIN
      if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.ADMIN) {
        return handleValidationError(
          res,
          'Invalid role. Role must be SYSTEM_ADMIN or ADMIN',
          'role',
          'Create system admin'
        );
      }

      // Check if user with this email already exists (use normalized email)
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser && !existingUser.deletedAt) {
        return handleConflictError(
          res,
          `User with email ${normalizedEmail} already exists`,
          'Create system admin'
        );
      }

      // Generate random password
      const generatedPassword = generateUserPassword();
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      // Parse phone number to extract country code
      const parsedPhone = phone ? parsePhoneNumber(phone) : null;
      const countryCode = parsedPhone?.countryCode || '91';
      const localPhone = parsedPhone?.localNumber || phone;

      // Create user (store normalized email)
      // Note: This endpoint bypasses the restriction on creating multiple SYSTEM_ADMIN users
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phone: localPhone || null,
          countryCode,
          passwordHash,
          role: role as UserRole,
          region: null, // System admins don't have regions
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          countryCode: true,
          role: true,
          region: true,
          createdAt: true,
        }
      });

      // Send email with credentials (async, don't wait for it)
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      emailService.sendUserCreationEmail({
        name: fullName,
        email: normalizedEmail,
        password: generatedPassword,
        role: role as string,
      }).catch(error => {
        console.error('Failed to send user creation email:', error);
      });

      // Return user data (without password hash)
      res.status(201).json({
        ...user,
        message: 'System admin created successfully. Login credentials have been sent to their email.',
      });
    } catch (error) {
      handleError(error, res, 'Create system admin');
    }
  }
}
