const express = require('express');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const blastController = require('../controllers/blastController');

const router = express.Router();

router.post('/', auth, roles('ADMIN', 'MARKETING'), (req, res, next) => {
	const campaignId = req.body?.campaignId || req.body?.campaign_id;

	if (!campaignId) {
		return res.status(400).json({
			message: 'campaignId is required in request body',
		});
	}

	req.params.campaignId = campaignId;

	const body = { ...req.body };
	delete body.campaignId;
	delete body.campaign_id;
	req.body = body;

	return blastController.startBlast(req, res, next);
});

router.post('/:campaignId/preview', auth, roles('ADMIN', 'MARKETING'), blastController.previewTargets);
router.post('/:campaignId/start', auth, roles('ADMIN', 'MARKETING'), blastController.startBlast);
router.post('/:campaignId/retry-failed', auth, roles('ADMIN', 'MARKETING'), blastController.retryFailed);
router.get('/:campaignId/status', auth, roles('ADMIN', 'MARKETING'), blastController.getBlastStatus);

module.exports = router;
