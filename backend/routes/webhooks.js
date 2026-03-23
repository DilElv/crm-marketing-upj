const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification from Meta
 */
router.get("/whatsapp", webhookController.verifyWebhook);

/**
 * POST /api/webhooks/whatsapp
 * Webhook handler for incoming messages and status updates from Meta
 */
router.post("/whatsapp", webhookController.handleWhatsAppWebhook);

module.exports = router;
