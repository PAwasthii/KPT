import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';

const router = Router();
const inventoryController = new InventoryController();

router.get('/', inventoryController.getAll.bind(inventoryController));

// Must be before /:id to avoid shadowing
router.post('/import', inventoryController.bulkImport.bind(inventoryController));

router.post('/', inventoryController.create.bind(inventoryController));
router.put('/:id', inventoryController.update.bind(inventoryController));
router.delete('/:id', inventoryController.delete.bind(inventoryController));

export default router;
