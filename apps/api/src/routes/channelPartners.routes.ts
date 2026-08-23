import { Router } from 'express';
import { ChannelPartnerController } from '../controllers/channelPartners.controller.js';

const router = Router();
const channelPartnerController = new ChannelPartnerController();

// GET /api/kpt/channel-partners — paginated list
router.get('/', channelPartnerController.getAll.bind(channelPartnerController));

// GET /api/kpt/channel-partners/incentives — all incentives flat list (static before /:id)
router.get('/incentives', channelPartnerController.getAllIncentives.bind(channelPartnerController));

// GET /api/kpt/channel-partners/eligible-applications — KptPartner applications eligible for activation
router.get('/eligible-applications', channelPartnerController.getEligibleApplications.bind(channelPartnerController));

// GET /api/kpt/channel-partners/activate-info/:crn — prefill data from KptPartner application
router.get('/activate-info/:crn', channelPartnerController.getApplicationForActivation.bind(channelPartnerController));

// POST /api/kpt/channel-partners/activate/:crn — create ChannelPartner from approved application
router.post('/activate/:crn', channelPartnerController.activateFromApplication.bind(channelPartnerController));

// GET /api/kpt/channel-partners/:id — single partner with relations
router.get('/:id', channelPartnerController.getById.bind(channelPartnerController));

// GET /api/kpt/channel-partners/:id/incentives — list incentives for a partner
router.get('/:id/incentives', channelPartnerController.getIncentives.bind(channelPartnerController));

// POST /api/kpt/channel-partners — create partner
router.post('/', channelPartnerController.create.bind(channelPartnerController));

// POST /api/kpt/channel-partners/bulk-import — bulk create/update from spreadsheet
router.post('/bulk-import', channelPartnerController.bulkImport.bind(channelPartnerController));

// POST /api/kpt/channel-partners/:id/incentives — create incentive for partner
router.post('/:id/incentives', channelPartnerController.createIncentive.bind(channelPartnerController));

// PUT /api/kpt/channel-partners/:id — update partner
router.put('/:id', channelPartnerController.update.bind(channelPartnerController));

// PATCH /api/kpt/channel-partners/incentives/:incentiveId — update incentive status
router.patch('/incentives/:incentiveId', channelPartnerController.updateIncentive.bind(channelPartnerController));

// DELETE /api/kpt/channel-partners/:id — delete partner
router.delete('/:id', channelPartnerController.delete.bind(channelPartnerController));

export default router;
