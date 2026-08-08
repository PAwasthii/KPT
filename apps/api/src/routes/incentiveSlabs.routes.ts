import { Router } from 'express';
import { IncentiveSlabController } from '../controllers/incentiveSlabs.controller.js';

const router = Router();
const incentiveSlabController = new IncentiveSlabController();

// GET /api/kpt/incentive-slabs — all slabs, optional filter by tier or isActive
router.get('/', incentiveSlabController.getAll.bind(incentiveSlabController));

// POST /api/kpt/incentive-slabs — create slab
router.post('/', incentiveSlabController.create.bind(incentiveSlabController));

// PUT /api/kpt/incentive-slabs/:id — update slab
router.put('/:id', incentiveSlabController.update.bind(incentiveSlabController));

// DELETE /api/kpt/incentive-slabs/:id — delete slab
router.delete('/:id', incentiveSlabController.delete.bind(incentiveSlabController));

export default router;
