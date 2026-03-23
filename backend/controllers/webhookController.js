const db = require('../config/database');

/**
 * FIX #2: WhatsApp Webhook Handler
 * Receives and processes status updates from Meta WhatsApp API
 * 
 * Webhook Events:
 * - sent: Message accepted by WhatsApp
 * - delivered: Message delivered to device
 * - read: Message read by recipient
 * - failed: Message failed to send
 */

const msgStatusOrder = {
  sent: 0,
  delivered: 1,
  read: 2,
  failed: 99,  // Failed is separate
};

/**
 * POST /webhooks/whatsapp
 * 
 * Webhook format from Meta:
 * {
 *   "entry": [{
 *     "changes": [{
 *       "value": {
 *         "statuses": [{
 *           "id": "wamid.xxx",
 *           "status": "delivered",
 *           "timestamp": "1234567890"
 *         }],
 *         "messages": [...],
 *         "contacts": [...]
 *       }
 *     }]
 *   }]
 * }
 */
exports.handleWhatsAppWebhook = async (req, res, next) => {
  try {
    const { entry } = req.body;

    // WhatsApp sends array of entries
    if (!entry || !Array.isArray(entry)) {
      console.warn('[Webhook] Invalid webhook format', req.body);
      return res.status(400).json({ message: 'Invalid webhook format' });
    }

    // Process each entry
    for (const entryItem of entry) {
      if (!entryItem.changes) continue;

      for (const change of entryItem.changes) {
        const { value } = change;
        if (!value) continue;

        // Handle message status updates
        if (value.statuses && Array.isArray(value.statuses)) {
          await handleMessageStatuses(value.statuses);
        }

        // Handle incoming messages (optional - for two-way communication)
        if (value.messages && Array.isArray(value.messages)) {
          await handleIncomingMessages(value.messages);
        }
      }
    }

    // Always return 200 to acknowledge webhook
    // Meta expects 200 within 5 seconds
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error.message);
    // Still return 200 to prevent retries from Meta
    res.status(200).json({ success: true, error: error.message });
  }
};

/**
 * Handle message status updates from Meta
 * Updates message records in database
 */
async function handleMessageStatuses(statuses) {
  for (const statusUpdate of statuses) {
    const { id: messageId, status, timestamp } = statusUpdate;

    if (!messageId || !status) {
      console.warn('[Webhook] Missing messageId or status', statusUpdate);
      continue;
    }

    try {
      // FIX #2 Part A: Update message status in database
      // Only update if new status is "higher" than current status
      const currentMsgResult = await db.query(
        `SELECT id, status AS current_status FROM messages 
         WHERE whatsapp_message_id = $1 OR message_id = $1`,
        [messageId]
      );

      if (currentMsgResult.rowCount === 0) {
        console.warn(`[Webhook] Message not found: ${messageId}`);
        continue;
      }

      const message = currentMsgResult.rows[0];
      const currentStatusOrder = msgStatusOrder[message.current_status] || -1;
      const newStatusOrder = msgStatusOrder[status] || -1;

      // Only update if new status is "higher" (don't downgrade status)
      if (newStatusOrder <= currentStatusOrder && status !== 'failed') {
        console.log(`[Webhook] Ignoring status downgrade: ${message.current_status} → ${status}`);
        continue;
      }

      // Perform update
      const updateResult = await db.query(
        `UPDATE messages 
         SET status = $1, updated_at = NOW()
         WHERE whatsapp_message_id = $2 OR message_id = $2
         RETURNING id, campaign_id, lead_id, campaign_lead_id`,
        [status, messageId]
      );

      if (updateResult.rowCount > 0) {
        const message = updateResult.rows[0];
        console.log(`[Webhook] Message updated: ${messageId} → ${status}`);

        // FIX #2 Part B: Update campaign_lead status to match
        if (message.campaign_lead_id) {
          await db.query(
            `UPDATE campaign_leads 
             SET status = $1
             WHERE id = $2`,
            [status, message.campaign_lead_id]
          );
        }
      }
    } catch (err) {
      console.error(`[Webhook] Error updating message ${messageId}:`, err.message);
      // Continue processing other messages
    }
  }
}

/**
 * Handle incoming messages (optional)
 * Useful for reply tracking or two-way chat
 */
async function handleIncomingMessages(messages) {
  for (const msg of messages) {
    const { id: messageId, from, timestamp, type, text } = msg;

    try {
      // Find lead by phone number
      const leadResult = await db.query(
        `SELECT id FROM leads WHERE phone_number = $1`,
        [from]
      );

      if (leadResult.rowCount === 0) {
        console.warn(`[Webhook] Lead not found for phone: ${from}`);
        continue;
      }

      const leadId = leadResult.rows[0].id;

      // Log incoming message (optional)
      console.log(`[Webhook] Incoming message from ${from}: ${text?.body || '[non-text]'}`);

      // You can store incoming messages for analytics or  chatbot purposes
      // INSERT INTO messages_incoming (lead_id, phone, message_type, content, source_message_id)
      // But this is optional - focus on outbound first
    } catch (err) {
      console.error('[Webhook] Error handling incoming message:', err.message);
    }
  }
}

/**
 * Webhook verification endpoint
 * Meta sends GET with verify_token to verify webhook
 * 
 * GET /webhooks/whatsapp?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[Webhook] Verified webhook for WhatsApp');
      res.status(200).send(challenge);
    } else {
      console.warn('[Webhook] Invalid verify token');
      res.status(403).json({ message: 'Invalid verify token' });
    }
  } else {
    res.status(400).json({ message: 'Invalid request' });
  }
};
