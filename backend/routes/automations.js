const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const automationController = require('../controllers/automationController');

// All automation routes require authentication
router.use(auth);

/**
 * GET /api/automations
 * Retrieve all automation rules (ADMIN, MARKETING dapat akses)
 */
router.get('/', roles('ADMIN', 'MARKETING'), automationController.getAllAutomations);

/**
 * GET /api/automations/:id
 * Get single automation rule
 */
router.get('/:id', roles('ADMIN', 'MARKETING'), automationController.getAutomationById);

/**
 * POST /api/automations
 * Create new automation rule (ADMIN, MARKETING dapat membuat)
 * Body: {
 *   name: string,
 *   triggerType: "INCOMING_MESSAGE" | "LEAD_STATUS_CHANGE" | "SCHEDULED",
 *   conditions: {
 *     keywords: ["daftar", "register"],  // optional - check incoming text
 *     leadStatus: ["NEW", "CONTACTED"],  // optional - check current lead status
 *     previousStatus: ["NEW"]            // optional - for status change events
 *   },
 *   action: {
 *     type: "send_message" | "update_lead_status" | "create_note" | "add_to_campaign",
 *     templateName?: string,
 *     parameters?: array,
 *     newStatus?: string,
 *     noteText?: string,
 *     campaignId?: int
 *   },
 *   enabled: boolean (default: true)
 * }
 *
 * Example 1 - Respond to "daftar" keyword:
 * POST /api/automations
 * {
 *   "name": "Auto-reply Pendaftaran",
 *   "triggerType": "INCOMING_MESSAGE",
 *   "conditions": { "keywords": ["daftar", "register"] },
 *   "action": {
 *     "type": "send_message",
 *     "templateName": "info_pendaftaran",
 *     "parameters": []
 *   }
 * }
 *
 * Example 2 - Update status when "minat" button clicked:
 * POST /api/automations
 * {
 *   "name": "Mark as Interested",
 *   "triggerType": "INCOMING_MESSAGE",
 *   "conditions": { "keywords": ["minat"] },
 *   "action": {
 *     "type": "update_lead_status",
 *     "newStatus": "INTERESTED"
 *   }
 * }
 */
router.post('/', roles('ADMIN', 'MARKETING'), automationController.createAutomation);

/**
 * PUT /api/automations/:id
 * Update automation rule
 */
router.put('/:id', roles('ADMIN', 'MARKETING'), automationController.updateAutomation);

/**
 * DELETE /api/automations/:id
 * Delete automation rule (ADMIN only)
 */
router.delete('/:id', roles('ADMIN'), automationController.deleteAutomation);

module.exports = router;
