import { Router } from 'express';
import { TaxVerifyController } from '../controllers/taxVerify.controller.js';

const router = Router();
const taxVerifyController = new TaxVerifyController();

// POST /api/tax/verify
router.post('/verify', (req, res) => taxVerifyController.verify(req, res));

export default router;
