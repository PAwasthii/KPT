import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireRole } from '../middleware/auth.middleware.js';
import { FinanceController } from '../controllers/finance.controller.js';

const router = Router();
const controller = new FinanceController();

const viewRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.FINANCE_ADMIN];
const manageRoles = [UserRole.SYSTEM_ADMIN, UserRole.FINANCE_ADMIN];

// Overview
router.get('/overview', requireRole(viewRoles), controller.getOverview.bind(controller));

// Invoices
router.get('/invoices', requireRole(viewRoles), controller.getInvoices.bind(controller));
router.get('/invoices/:id', requireRole(viewRoles), controller.getInvoiceById.bind(controller));
router.post('/invoices', requireRole(manageRoles), controller.createInvoice.bind(controller));
router.put('/invoices/:id', requireRole(manageRoles), controller.updateInvoice.bind(controller));

// SKU Analysis
router.get('/sku-analysis', requireRole(viewRoles), controller.getSkuAnalysis.bind(controller));
router.get('/sku-analysis/:sku', requireRole(viewRoles), controller.getSkuDetail.bind(controller));

// Budgets
router.get('/budgets', requireRole(viewRoles), controller.getBudgets.bind(controller));
router.get('/budgets/:id', requireRole(viewRoles), controller.getBudgetById.bind(controller));
router.post('/budgets', requireRole(manageRoles), controller.createBudget.bind(controller));
router.put('/budgets/:id', requireRole(manageRoles), controller.updateBudget.bind(controller));
router.delete('/budgets/:id', requireRole(manageRoles), controller.deleteBudget.bind(controller));

// Integration (stub)
router.get('/integration/status', requireRole(viewRoles), controller.getIntegrationStatus.bind(controller));
router.post('/integration/sync', requireRole(manageRoles), controller.syncIntegration.bind(controller));
router.get('/integration/logs', requireRole(viewRoles), controller.getIntegrationLogs.bind(controller));

export default router;
