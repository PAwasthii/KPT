import { Router } from 'express';
import { ApprovalController } from '../controllers/approval.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();
const approvalController = new ApprovalController();

const allRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.SALES];
const adminRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

router.use(requireAuth);

// GET /api/approvals/my - Get approvals for the current user
router.get('/my', requireRole(allRoles), approvalController.getMyApprovals.bind(approvalController));

// GET /api/approvals - Get all approvals (ADMIN, SYSTEM_ADMIN only; SALES sees only their own via /my)
router.get('/', requireRole(adminRoles), approvalController.getAllApprovals.bind(approvalController));

// GET /api/approvals/:id - Get a single approval by ID
router.get('/:id', requireRole(allRoles), approvalController.getApprovalById.bind(approvalController));

// POST /api/approvals - Raise an approval request (all sales roles)
router.post('/', requireRole(allRoles), approvalController.createApproval.bind(approvalController));

// PATCH /api/approvals/:id/action - Approve or reject (ADMIN, SYSTEM_ADMIN only)
router.patch('/:id/action', requireRole(adminRoles), approvalController.actionApproval.bind(approvalController));

export default router;
