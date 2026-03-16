const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const campaignController = require('../controllers/campaignController');

const uploadCsv = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
});

// All campaign routes require authentication
router.use(auth);

/**
 * GET /api/campaigns
 * Retrieve all campaigns (ADMIN, MARKETING dapat akses)
 */
router.get('/', roles('ADMIN', 'MARKETING'), campaignController.getAllCampaigns);

/**
 * GET /api/campaigns/import-template
 * Download CSV template for campaign lead import
 */
router.get('/import-template', roles('ADMIN', 'MARKETING'), campaignController.downloadCampaignLeadImportTemplate);

/**
 * GET /api/campaigns/:id
 * Get single campaign details
 */
router.get('/:id', roles('ADMIN', 'MARKETING'), campaignController.getCampaignById);

/**
 * POST /api/campaigns/:id/import-leads
 * Upload Google Form/Sheet CSV and import leads to campaign
 * multipart/form-data fields:
 * - file: CSV file
 * - mapping: JSON object (optional)
 */
router.post(
	'/:id/import-leads',
	roles('ADMIN', 'MARKETING'),
	uploadCsv.single('file'),
	campaignController.importCampaignLeadsFromCsv
);

/**
 * POST /api/campaigns
 * Create new campaign (ADMIN, MARKETING dapat membuat)
 * Body: {
 *   name: string (3-200 chars),
 *   templateName: string (nama template yang sudah ada di Meta),
 *   targetLeadStatus: string (optional - CONTACTED, INTERESTED, NEW, dll),
 *   parameters: array (fill-in values untuk template placeholders),
 *   scheduleAt: ISO datetime (optional) - jika ada, campaign dipending sampai waktu tersebut
 * }
 */
router.post('/', roles('ADMIN', 'MARKETING'), campaignController.createCampaign);

/**
 * PUT /api/campaigns/:id
 * Update campaign status
 * Body: { status: "DRAFT" | "SCHEDULED" | "RUNNING" | "COMPLETED" | "CANCELLED" }
 */
router.put('/:id', roles('ADMIN', 'MARKETING'), campaignController.updateCampaign);

/**
 * GET /api/campaigns/:id/stats
 * Get campaign statistics (delivery rate, read count, etc)
 */
router.get('/:id/stats', roles('ADMIN', 'MARKETING'), campaignController.getCampaignStats);

/**
 * GET /api/campaigns/:id/preview-contacts
 * Preview selected contacts before blasting
 */
router.get('/:id/preview-contacts', roles('ADMIN', 'MARKETING'), campaignController.previewCampaignContacts);

/**
 * PUT /api/campaigns/:id/leads
 * Replace selected leads for campaign
 */
router.put('/:id/leads', roles('ADMIN', 'MARKETING'), campaignController.updateCampaignLeadSelection);

/**
 * DELETE /api/campaigns/:id
 * Delete campaign (ADMIN only)
 */
router.delete('/:id', roles('ADMIN'), campaignController.deleteCampaign);

module.exports = router;
