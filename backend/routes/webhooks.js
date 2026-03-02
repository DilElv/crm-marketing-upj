const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');
const automationController = require('../controllers/automationController');

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification from Meta
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[Webhook] Verification request:', { mode, token: token ? '***' : 'missing' });

  if (!mode || !token) {
    return res.status(400).json({ error: 'Missing mode or token' });
  }

  if (mode !== 'subscribe' || token !== config.whatsapp.webhookToken) {
    console.warn('[Webhook] Invalid token received');
    return res.status(403).json({ error: 'Invalid token' });
  }

  console.log('[Webhook] ✅ Verified successfully');
  res.status(200).send(challenge);
});

/**
 * POST /api/webhooks/whatsapp
 * Webhook handler for incoming messages and status updates
 */
router.post('/whatsapp', async (req, res) => {
  const body = req.body;

  // Respond immediately with 200 (Meta requirement)
  res.status(200).send('EVENT_RECEIVED');

  // Process event asynchronously
  setImmediate(async () => {
    try {
      await processWhatsAppEvent(body);
    } catch (error) {
      console.error('[Webhook Error]', error);
    }
  });
});

/**
 * Process incoming WhatsApp events
 */
async function processWhatsAppEvent(payload) {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      console.log('[Webhook] No value in event');
      return;
    }

    console.log(`[Webhook] Processing event type:`, {
      hasMessages: !!value.messages?.length,
      hasStatuses: !!value.statuses?.length,
    });

    // Handle incoming messages
    if (value.messages?.length > 0) {
      for (const message of value.messages) {
        const contact = value.contacts?.[0];
        await handleIncomingMessage(message, contact, value.metadata);
      }
    }

    // Handle message status updates
    if (value.statuses?.length > 0) {
      for (const status of value.statuses) {
        await handleMessageStatus(status);
      }
    }
  } catch (error) {
    console.error('[Webhook] Unhandled error in processWhatsAppEvent:', error);
  }
}

/**
 * Handle incoming messages from users
 */
async function handleIncomingMessage(message, contact, metadata) {
  const phoneNumber = message.from;
  const messageId = message.id;
  const timestamp = message.timestamp;

  console.log(`[Message] Received from ${phoneNumber} at ${new Date(timestamp * 1000).toISOString()}`);

  try {
    // Find lead by phone number
    const leadResult = await db.query(
      'SELECT id, full_name, phone_number, status FROM leads WHERE phone_number = $1',
      [phoneNumber]
    );

    let leadId = null;
    let previousStatus = null;

    if (leadResult.rowCount > 0) {
      leadId = leadResult.rows[0].id;
      previousStatus = leadResult.rows[0].status;
    } else {
      console.log(`[Message] Lead not found for ${phoneNumber}, creating entry...`);
      // Auto-create lead jika belum ada
      const newLeadResult = await db.query(
        `INSERT INTO leads (full_name, phone_number, status)
         VALUES ($1, $2, $3) RETURNING id`,
        [contact?.name || phoneNumber, phoneNumber, 'NEW']
      );
      leadId = newLeadResult.rows[0].id;
      previousStatus = 'NEW';
    }

    // Mark as read on WhatsApp
    await WhatsAppService.markAsRead(messageId);

    // Process by message type
    let incomingText = null;

    if (message.type === 'text') {
      incomingText = message.text.body;
      console.log(`[Message] Text: "${incomingText}"`);
    } else if (message.type === 'button') {
      incomingText = message.button.text;
      console.log(`[Message] Button: "${incomingText}"`);
    } else if (message.type === 'interactive') {
      incomingText = message.interactive?.button_reply?.text ||
        message.interactive?.list_reply?.title;
      console.log(`[Message] Interactive: "${incomingText}"`);
    } else {
      console.log(`[Message] Other type: ${message.type}`);
    }

    // Trigger INCOMING_MESSAGE automations
    if (incomingText) {
      await automationController.triggerAutomations('INCOMING_MESSAGE', {
        phoneNumber,
        leadId,
        text: incomingText,
        previousStatus,
      });

      // Also handle inline text routing
      await handleTextMessage(phoneNumber, leadId, incomingText);
    }
  } catch (error) {
    console.error(`[Message Error] Failed to handle message ${messageId}:`, error);
  }
}

/**
 * Handle text messages - routing based on keywords
 */
async function handleTextMessage(phoneNumber, leadId, text) {
  const textLower = text.toLowerCase().trim();
  let templateName = null;
  let parameters = [];

  // Simple routing logic
  if (textLower.includes('daftar') || textLower.includes('registrasi')) {
    templateName = 'info_pendaftaran';
  } else if (textLower.includes('biaya') || textLower.includes('cicilan') || textLower.includes('harga')) {
    templateName = 'info_biaya';
  } else if (textLower.includes('program') || textLower.includes('jurusan') || textLower.includes('prodi')) {
    templateName = 'info_program';
  } else if (textLower.includes('buka') || textLower.includes('admisi')) {
    templateName = 'info_pembukaan';
  } else if (textLower.includes('kontak') || textLower.includes('hubungi')) {
    templateName = 'contact_info';
  } else {
    // Default: help menu
    templateName = 'menu_bantuan';
  }

  if (templateName) {
    console.log(`[Webhook] Send template: ${templateName}`);
    const result = await WhatsAppService.sendTemplateMessage(phoneNumber, templateName, parameters);

    if (result.success) {
      console.log(`[Webhook] ✅ Message sent: ${result.messageId}`);

      // Save message record
      try {
        await db.query(
          `INSERT INTO messages (lead_id, phone_number, message_id, status)
           VALUES ($1, $2, $3, $4)`,
          [leadId, phoneNumber, result.messageId, 'sent']
        );
      } catch (err) {
        console.error('[Webhook] Error saving message:', err.message);
      }

      // Update notes
      try {
        await db.query(
          `UPDATE leads 
           SET notes = COALESCE(notes, '') || E'\\n' || $1
           WHERE id = $2`,
          [`[${new Date().toISOString()}] Keyword: "${text}"`, leadId]
        );
      } catch (err) {
        console.error('[Webhook] Error updating notes:', err);
      }
    } else {
      console.error(`[Webhook] ❌ Failed to send template:`, result.error);
    }
  }
}

/**
 * Handle message status updates (delivered, read, failed)
 */
async function handleMessageStatus(statusUpdate) {
  const messageId = statusUpdate.id;
  const statusType = statusUpdate.status; // sent, delivered, read, failed

  try {
    const result = await db.query(
      'UPDATE messages SET status = $1 WHERE message_id = $2 RETURNING lead_id',
      [statusType, messageId]
    );

    if (result.rowCount > 0) {
      console.log(`[Status] Message ${messageId} → ${statusType}`);

      // Trigger LEAD_STATUS_CHANGE automation jika status = 'read'
      if (statusType === 'read') {
        const leadId = result.rows[0].lead_id;
        const leadResult = await db.query(
          'SELECT status FROM leads WHERE id = $1',
          [leadId]
        );

        if (leadResult.rowCount > 0) {
          await automationController.triggerAutomations('LEAD_STATUS_CHANGE', {
            leadId,
            messageStatus: statusType,
          });
        }
      }
    }
  } catch (error) {
    console.error('[Status Error]', error);
  }
}

module.exports = router;
