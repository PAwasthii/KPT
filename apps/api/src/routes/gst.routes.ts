import { Router } from 'express';
import { GstController } from '../controllers/gst.controller.js';

const router = Router();
const gstController = new GstController();

// GET /api/gst/verify?gstin=XXXXXXXXXXXXXXXXXXXX
router.get('/verify', (req, res) => gstController.verify(req, res));

export default router;
