import { Router } from 'express';
import { PriceBookEntryController } from '../controllers/pricebookEntry.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();
const pricebookEntryController = new PriceBookEntryController();

const viewRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN, UserRole.SALES];
const manageRoles = [UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

router.use(requireAuth);

router.get('/', requireRole(viewRoles), pricebookEntryController.getAllPriceBookEntries.bind(pricebookEntryController));
router.get('/:id', requireRole(viewRoles), pricebookEntryController.getPriceBookEntryById.bind(pricebookEntryController));
router.get('/pricebook/:priceBookId', requireRole(viewRoles), pricebookEntryController.getPriceBookEntries.bind(pricebookEntryController));
router.post('/', requireRole(manageRoles), pricebookEntryController.createPriceBookEntry.bind(pricebookEntryController));
router.put('/:id', requireRole(manageRoles), pricebookEntryController.updatePriceBookEntry.bind(pricebookEntryController));
router.delete('/:id', requireRole(manageRoles), pricebookEntryController.deletePriceBookEntry.bind(pricebookEntryController));

export default router;
