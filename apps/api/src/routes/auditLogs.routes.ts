import { Router } from 'express';
import { AuditLogsController } from '../controllers/auditLogs.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();
const controller = new AuditLogsController();

router.use(requireRole([UserRole.SYSTEM_ADMIN]));

router.get('/', controller.getAuditLogs.bind(controller));
router.get('/stats', controller.getStats.bind(controller));
router.get('/entity-types', controller.getEntityTypes.bind(controller));
router.get('/:id', controller.getAuditLogById.bind(controller));

export default router;
