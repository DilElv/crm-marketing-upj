const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const templateController = require('../controllers/templateController');

// All template routes require authentication
router.use(auth);

/**
 * GET /api/templates
 * Get all templates (local cache)
 */
router.get('/', roles('ADMIN', 'MARKETING'), templateController.getAllTemplates);

/**
 * GET /api/templates/meta/sync
 * Sync templates from Meta WhatsApp Cloud API
 */
router.get('/meta/sync', roles('ADMIN'), templateController.syncTemplatesFromMeta);

/**
 * GET /api/templates/:name
 * Get specific template by name
 */
router.get('/:name', roles('ADMIN', 'MARKETING'), templateController.getTemplateByName);

/**
 * POST /api/templates
 * Create new template on Meta account
 * Body:
 * {
 *   "name": "template_name",
 *   "category": "MARKETING", // or UTILITY, AUTHENTICATION
 *   "language": "id",
 *   "components": [
 *     {
 *       "type": "BODY",
 *       "text": "Message body with {{1}} placeholders"
 *     },
 *     {
 *       "type": "BUTTONS",
 *       "buttons": [...]
 *     }
 *   ]
 * }
 */
router.post('/', roles('ADMIN'), templateController.createTemplate);

/**
 * POST /api/templates/:id/test
 * Test template by sending to test number
 * Body: { phoneNumber: "62xxxxxxxxxx", parameters: [] }
 */
router.post('/:id/test', roles('ADMIN', 'MARKETING'), templateController.testTemplate);

/**
 * DELETE /api/templates/:id
 * Delete template from local cache (ADMIN only)
 */
router.delete('/:id', roles('ADMIN'), templateController.deleteTemplate);

module.exports = router;
