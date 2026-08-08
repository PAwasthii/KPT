import { Router } from 'express';
import { getGlobalSettings, updateGlobalSetting, getCurrencies } from '../controllers/settings.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();

// GET - any authenticated user can read settings (used by frontend for threshold checks)
router.get('/global-settings', getGlobalSettings);

// PUT - only SYSTEM_ADMIN can modify settings
router.put('/global-settings', requireRole([UserRole.SYSTEM_ADMIN]), updateGlobalSetting);

router.get('/currencies', getCurrencies);

export default router;
