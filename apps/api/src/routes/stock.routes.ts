import { Router } from 'express';
import { StockController } from '../controllers/stock.controller.js';

const router = Router();
const stockController = new StockController();

// GET /api/kpt/stock — paginated list with optional filters
router.get('/', stockController.getAll.bind(stockController));

// GET /api/kpt/stock/alerts — low/critical/out-of-stock entries ordered by severity
// Must be defined before /:id to avoid shadowing
router.get('/alerts', stockController.getAlerts.bind(stockController));

// GET /api/kpt/stock/partner/:partnerId — all stock for a specific partner
router.get('/partner/:partnerId', stockController.getByPartner.bind(stockController));

// POST /api/kpt/stock — create stock entry
router.post('/', stockController.create.bind(stockController));

// PUT /api/kpt/stock/:id — update stock entry (recomputes stockStatus)
router.put('/:id', stockController.update.bind(stockController));

// DELETE /api/kpt/stock/:id — delete stock entry
router.delete('/:id', stockController.delete.bind(stockController));

export default router;
