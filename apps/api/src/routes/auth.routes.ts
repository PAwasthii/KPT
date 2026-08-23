import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth, requireAdminSecret } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const authController = new AuthController();

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/developer-login
router.post('/developer-login', authController.developerLogin);

// POST /api/auth/logout
router.post('/logout', requireAuth, authController.logout);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getCurrentUser);

// POST /api/auth/create-test-admin - Development/Testing only
router.post('/create-test-admin', authController.createTestAdmin);

// POST /api/auth/create-system-admin - Protected by ADMIN-SECRET
router.post('/create-system-admin', requireAdminSecret, (req, res) => authController.createSystemAdmin(req, res));

// Email OTP login
router.post('/otp/send', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: (req) => String(req.body?.email || '') }), (req, res) => authController.sendOtpLogin(req, res));
router.post('/otp/verify', rateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyGenerator: (req) => String(req.body?.email || '') }), (req, res) => authController.verifyOtpLogin(req, res));

// Forgot password (OTP via email)
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: (req) => String(req.body?.email || '') }), authController.forgotPassword);
router.post('/forgot-password/verify', rateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyGenerator: (req) => String(req.body?.email || '') }), authController.verifyForgotPassword);
router.post('/forgot-password/reset', authController.resetPassword);

// Change password (self-service)
router.post('/change-password', requireAuth, authController.changePassword);

export default router;
