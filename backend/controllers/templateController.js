const Joi = require('joi');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');

const createTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(512).required(),
  category: Joi.string().valid('MARKETING', 'UTILITY', 'AUTHENTICATION').required(),
  language: Joi.string().default('id'),
  components: Joi.array().required(), // See Meta documentation for component structure
});

/**
 * GET /api/templates
 * Get all templates (synced from Meta or local DB)
 */
exports.getAllTemplates = async (req, res, next) => {
  try {
    // First try to get from local cache
    const result = await db.query(
      `SELECT id, name, category, language, status, created_at
       FROM templates
       ORDER BY created_at DESC`,
    );

    res.json({
      data: result.rows,
      cached: true,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/templates/Meta/sync
 * Sync templates from Meta WhatsApp Cloud API
 * WARNING: This hits Meta API, may have rate limits
 */
exports.syncTemplatesFromMeta = async (req, res, next) => {
  try {
    console.log('[Template] Syncing templates from Meta...');

    const templates = await WhatsAppService.getTemplates();
    console.log(`[Template] Received ${templates.length} templates from Meta`);

    // Save to local cache (optional - untuk mengurangi API calls)
    // Di sini kita bisa store ke DB, tapi untuk sekarang kita cuma return

    res.json({
      data: templates,
      message: `Synced ${templates.length} templates`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/templates
 * Create new template on Meta WhatsApp account
 * 
 * Body example:
 * {
 *   "name": "info_pendaftaran",
 *   "category": "MARKETING",
 *   "language": "id",
 *   "components": [
 *     {
 *       "type": "BODY",
 *       "text": "Halo {{1}}, terima kasih telah menunjukkan minat pada program kami. Silakan isi formulir pendaftaran berikut: {{2}}"
 *     },
 *     {
 *       "type": "BUTTONS",
 *       "buttons": [
 *         {
 *           "type": "URL",
 *           "text": "Daftar Sekarang",
 *           "url": "https://example.com/register"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { error, value } = createTemplateSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, category, language, components } = value;

    console.log(`[Template] Creating template "${name}" on Meta...`);

    // Call Meta API to create template
    const result = await WhatsAppService.createTemplate(
      name,
      category,
      components,
      language
    );

    // Optionally save to local DB for reference
    try {
      await db.query(
        `INSERT INTO templates (name, category, language, status, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET updated_at = NOW()`,
        [name, category, language, 'ACTIVE', req.user.id]
      );
    } catch (dbErr) {
      console.error('[Template] Warning: Could not save template to DB:', dbErr.message);
    }

    res.status(201).json({
      data: result,
      message: 'Template created successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/templates/:id/test
 * Test template by sending to a test number
 */
exports.testTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phoneNumber, parameters } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number required' });
    }

    // Get template name
    let templateName = id; // Assume id is template name

    console.log(`[Template] Testing template "${templateName}" to ${phoneNumber}...`);

    // Send test message
    const result = await WhatsAppService.sendTemplateMessage(
      phoneNumber,
      templateName,
      parameters || []
    );

    if (!result.success) {
      return res.status(400).json({
        message: 'Failed to send test message',
        error: result.error,
      });
    }

    res.json({
      data: result,
      message: 'Test message sent',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/templates/:id
 * Delete template (dari Meta dan local DB)
 * NOTE: Meta API might not support deletion, check Meta docs
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to delete from local DB
    const result = await db.query(
      `DELETE FROM templates WHERE name = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // NOTE: Meta API might not support delete, so we just remove from local cache

    res.json({ message: 'Template deleted from local cache' });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper: Get template by name
 * Returns template structure for reference
 */
exports.getTemplateByName = async (req, res, next) => {
  try {
    const { name } = req.params;

    const result = await db.query(
      `SELECT * FROM templates WHERE name = $1`,
      [name]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
