import { Router } from 'express';
import { PriceBookController } from '../controllers/pricebook.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();
const pricebookController = new PriceBookController();

const viewRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.SALES];
const manageRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

router.use(requireAuth);

router.get('/', requireRole(viewRoles), pricebookController.getAllPriceBooks.bind(pricebookController));
router.get('/:id', requireRole(viewRoles), pricebookController.getPriceBookById.bind(pricebookController));
router.post('/', requireRole(manageRoles), pricebookController.createPriceBook.bind(pricebookController));
router.put('/:id', requireRole(manageRoles), pricebookController.updatePriceBook.bind(pricebookController));
router.delete('/:id', requireRole(manageRoles), pricebookController.deletePriceBook.bind(pricebookController));

export default router;
