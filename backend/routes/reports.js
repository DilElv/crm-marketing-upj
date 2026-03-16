const express = require('express');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/campaigns/:campaignId/result', auth, roles('ADMIN', 'MARKETING'), reportController.getCampaignResult);
router.get('/campaigns/:campaignId/export/csv', auth, roles('ADMIN', 'MARKETING'), reportController.exportCampaignCsv);
router.get('/campaigns/:campaignId/export/pdf', auth, roles('ADMIN', 'MARKETING'), reportController.exportCampaignPdf);

module.exports = router;
