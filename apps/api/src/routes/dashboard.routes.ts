import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { UserRole } from '@prisma/client';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const dashboardController = new DashboardController();

// GET /api/dashboard/leads-generated
router.get('/leads-generated',requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), dashboardController.getLeadsGeneratedOverTime);

// GET /api/dashboard/conversion-rate
router.get('/conversion-rate', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), dashboardController.getConversionRate);

// GET /api/dashboard/lead-sources
router.get('/lead-sources', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), dashboardController.getLeadSources);

// GET /api/dashboard/key-metrics
router.get('/key-metrics', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), dashboardController.getKeyMetrics);

export default router;
