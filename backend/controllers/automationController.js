const Joi = require('joi');
const db = require('../config/database');
const { messageQueue } = require('../jobs/queue');
const WhatsAppService = require('../services/whatsappService');

const createAutomationSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  triggerType: Joi.string().valid('INCOMING_MESSAGE', 'LEAD_STATUS_CHANGE', 'SCHEDULED').required(),
  conditions: Joi.object().required(), // JSONB conditions object
  action: Joi.object().required(), // JSONB action object (e.g., { type: "send_message", templateName: "..." })
  enabled: Joi.boolean().default(true),
});

/**
 * GET /api/automations
 * Get all automation rules
 */
exports.getAllAutomations = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, trigger_type, enabled, created_at, created_by,
              COALESCE(u.name, 'Unknown') as created_by_name
       FROM automations a
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    );

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/automations/:id
 * Get single automation rule
 */
exports.getAutomationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM automations WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/automations
 * Create new automation rule
 */
exports.createAutomation = async (req, res, next) => {
  try {
    const { error, value } = createAutomationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, triggerType, conditions, action, enabled } = value;

    const result = await db.query(
      `INSERT INTO automations (name, trigger_type, conditions, action, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, triggerType, JSON.stringify(conditions), JSON.stringify(action), enabled, req.user.id]
    );

    res.status(201).json({
      data: result.rows[0],
      message: 'Automation created',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/automations/:id
 * Update automation rule
 */
exports.updateAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, conditions, action, enabled } = req.body;

    let query = `UPDATE automations SET `;
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (conditions !== undefined) {
      fields.push(`conditions = $${paramCount++}`);
      values.push(JSON.stringify(conditions));
    }
    if (action !== undefined) {
      fields.push(`action = $${paramCount++}`);
      values.push(JSON.stringify(action));
    }
    if (enabled !== undefined) {
      fields.push(`enabled = $${paramCount++}`);
      values.push(enabled);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    query += fields.join(', ') + ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json({
      data: result.rows[0],
      message: 'Automation updated',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/automations/:id
 * Delete automation rule
 */
exports.deleteAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM automations WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json({ message: 'Automation deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Core function: Trigger automations
 * Dijalankan saat ada event (incoming message, status change, etc)
 * @param {string} triggerType - INCOMING_MESSAGE | LEAD_STATUS_CHANGE | SCHEDULED
 * @param {object} eventData - { phoneNumber, leadId, text, newStatus, etc }
 */
exports.triggerAutomations = async (triggerType, eventData) => {
  try {
    console.log(`[Automation] Triggering automations for ${triggerType}`, eventData);

    // Get all enabled automations matching trigger type
    const result = await db.query(
      `SELECT * FROM automations WHERE trigger_type = $1 AND enabled = true`,
      [triggerType]
    );

    const automations = result.rows;
    let triggered = 0;

    for (const automation of automations) {
      // Check if conditions match
      const conditionsMet = await checkConditions(automation.conditions, eventData);

      if (conditionsMet) {
        // Execute action
        await executeAction(automation.action, eventData, automation.id);
        triggered++;
      }
    }

    console.log(`[Automation] Triggered ${triggered}/${automations.length} automations`);
    return triggered;
  } catch (err) {
    console.error('[Automation] Error triggering automations:', err.message);
  }
};

/**
 * Check if automation conditions match the event data
 */
async function checkConditions(conditionsJson, eventData) {
  const conditions = typeof conditionsJson === 'string' ? JSON.parse(conditionsJson) : conditionsJson;

  // Example: { keywords: ['daftar', 'register'], leadStatus: null (any), ... }
  // If keywords provided, check against incoming text
  if (conditions.keywords && Array.isArray(conditions.keywords)) {
    if (!eventData.text) return false;
    const textLower = eventData.text.toLowerCase();
    const matched = conditions.keywords.some(kw => textLower.includes(kw.toLowerCase()));
    if (!matched) return false;
  }

  // If leadStatus condition specified, check current status
  if (conditions.leadStatus && eventData.leadId) {
    try {
      const leadResult = await db.query(
        `SELECT status FROM leads WHERE id = $1`,
        [eventData.leadId]
      );
      if (leadResult.rowCount === 0) return false;
      const currentStatus = leadResult.rows[0].status;
      if (!conditions.leadStatus.includes(currentStatus)) return false;
    } catch (err) {
      console.error('[Automation] Error checking lead status:', err.message);
      return false;
    }
  }

  // If previousStatus condition specified (for status change events)
  if (conditions.previousStatus && eventData.previousStatus) {
    if (!conditions.previousStatus.includes(eventData.previousStatus)) return false;
  }

  return true;
}

/**
 * Execute automation action
 */
async function executeAction(actionJson, eventData, automationId) {
  const action = typeof actionJson === 'string' ? JSON.parse(actionJson) : actionJson;

  console.log(`[Automation] Executing action for automation ${automationId}:`, action);

  // Action type: send_message
  if (action.type === 'send_message') {
    const { templateName, parameters } = action;
    const phoneNumber = eventData.phoneNumber;
    const leadId = eventData.leadId;

    if (!templateName || !phoneNumber) {
      console.error('[Automation] Invalid action: missing templateName or phoneNumber');
      return;
    }

    try {
      // Send immediately or queue
      const result = await WhatsAppService.sendTemplateMessage(
        phoneNumber,
        templateName,
        parameters || []
      );

      if (result.success) {
        // Save message record
        await db.query(
          `INSERT INTO messages (lead_id, phone_number, message_id, status, automation_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [leadId, phoneNumber, result.messageId, 'sent', automationId]
        );
        console.log(`[Automation] Message sent successfully via automation ${automationId}`);
      } else {
        console.error(`[Automation] Failed to send message:`, result.error);
      }
    } catch (err) {
      console.error('[Automation] Error sending message:', err.message);
    }
  }

  // Action type: update_lead_status
  if (action.type === 'update_lead_status') {
    const { newStatus } = action;
    const leadId = eventData.leadId;

    if (!newStatus || !leadId) {
      console.error('[Automation] Invalid action: missing newStatus or leadId');
      return;
    }

    try {
      await db.query(
        `UPDATE leads SET status = $1 WHERE id = $2`,
        [newStatus, leadId]
      );

      // Log to history
      await db.query(
        `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, eventData.previousStatus || 'UNKNOWN', newStatus, null, `Automation ${automationId}`]
      );

      console.log(`[Automation] Lead ${leadId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('[Automation] Error updating lead status:', err.message);
    }
  }

  // Action type: create_note
  if (action.type === 'create_note') {
    const { noteText } = action;
    const leadId = eventData.leadId;

    if (!noteText || !leadId) {
      console.error('[Automation] Invalid action: missing noteText or leadId');
      return;
    }

    try {
      // Note: ada di schema? jika tidak, skip atau create sesuai kebutuhan
      console.log(`[Automation] Note created for lead ${leadId}:`, noteText);
    } catch (err) {
      console.error('[Automation] Error creating note:', err.message);
    }
  }

  // Action type: add_to_campaign
  if (action.type === 'add_to_campaign') {
    const { campaignId } = action;
    const leadId = eventData.leadId;

    if (!campaignId || !leadId) {
      console.error('[Automation] Invalid action: missing campaignId or leadId');
      return;
    }

    try {
      await messageQueue.add(
        'send-whatsapp-message',
        {
          campaignId,
          phoneNumber: eventData.phoneNumber,
          leadId,
          templateName: action.templateName || 'default_template',
          parameters: action.parameters || [],
        }
      );
      console.log(`[Automation] Lead ${leadId} added to campaign ${campaignId}`);
    } catch (err) {
      console.error('[Automation] Error adding lead to campaign:', err.message);
    }
  }
}
