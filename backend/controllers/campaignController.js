const Joi = require('joi');
const db = require('../config/database');
const {
  parseCsvBuffer,
  importRowsToCampaign,
  getCampaignImportTemplateCsv,
} = require('../services/campaignLeadImportService');

const createCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(200),
  campaign_name: Joi.string().min(3).max(200),
  templateName: Joi.string(),
  message_template: Joi.string(),
  targetLeadStatus: Joi.string().valid('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED').allow(null),
  leadIds: Joi.array().items(Joi.string().uuid()).default([]),
  parameters: Joi.array().items(Joi.string()).default([]),
  scheduleAt: Joi.date().optional(),
  schedule_time: Joi.date().optional(),
}).custom((value, helper) => {
  const finalName = value.name || value.campaign_name;
  const finalTemplate = value.templateName || value.message_template;

  if (!finalName) {
    return helper.error('any.invalid', { message: 'name or campaign_name is required' });
  }

  if (!finalTemplate) {
    return helper.error('any.invalid', { message: 'templateName or message_template is required' });
  }

  return value;
});

const updateSelectionSchema = Joi.object({
  leadIds: Joi.array().items(Joi.string().uuid()).required(),
});

const importMappingSchema = Joi.object({
  name: Joi.string().allow(''),
  phone_number: Joi.string().allow(''),
  email: Joi.string().allow(''),
  city: Joi.string().allow(''),
  program_interest: Joi.string().allow(''),
});

function parseImportMapping(rawMapping) {
  if (!rawMapping) return null;

  if (typeof rawMapping === 'object' && rawMapping !== null) {
    const { error, value } = importMappingSchema.validate(rawMapping);
    if (error) {
      const err = new Error(error.details[0].message);
      err.status = 400;
      throw err;
    }
    return value;
  }

  if (typeof rawMapping === 'string') {
    let parsed = null;
    try {
      parsed = JSON.parse(rawMapping);
    } catch (jsonError) {
      const err = new Error('Invalid mapping payload. Expected JSON object.');
      err.status = 400;
      throw err;
    }

    const { error, value } = importMappingSchema.validate(parsed);
    if (error) {
      const err = new Error(error.details[0].message);
      err.status = 400;
      throw err;
    }

    return value;
  }

  const err = new Error('Invalid mapping payload format.');
  err.status = 400;
  throw err;
}

async function upsertCampaignLeads(campaignId, leadIds) {
  if (!leadIds || leadIds.length === 0) return 0;

  const result = await db.query(
    `INSERT INTO campaign_leads (campaign_id, lead_id, selected)
     SELECT $1, UNNEST($2::uuid[]), TRUE
     ON CONFLICT (campaign_id, lead_id)
     DO UPDATE SET selected = EXCLUDED.selected
     RETURNING lead_id`,
    [campaignId, leadIds]
  );

  return result.rowCount;
}

/**
 * GET /api/campaigns
 * Get all campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.template_name, c.status, c.scheduled_at,
              COALESCE(u.name, 'Unknown') as created_by_name, c.created_at,
              COUNT(DISTINCT cl.lead_id)::int as total_targets,
              COUNT(DISTINCT m.id) as total_messages,
              SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN campaign_leads cl ON cl.campaign_id = c.id AND cl.selected = TRUE
       LEFT JOIN messages m ON m.campaign_id = c.id
       GROUP BY c.id, u.name
       ORDER BY c.created_at DESC`
    );

    res.json({
      data: result.rows,
      total: result.rowCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/campaigns/:id
 * Get single campaign
 */
exports.getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT c.*, COALESCE(u.name, 'Unknown') as created_by_name,
              COUNT(DISTINCT cl.lead_id)::int as total_targets,
              SUM(CASE WHEN cl.selected = TRUE THEN 1 ELSE 0 END)::int as selected_targets
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN campaign_leads cl ON cl.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.name`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns
 * Create new campaign
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const name = value.name || value.campaign_name;
    const templateName = value.templateName || value.message_template;
    const scheduleAt = value.scheduleAt || value.schedule_time;
    const { targetLeadStatus, leadIds } = value;

    // Create campaign record
    const campaignResult = await db.query(
      `INSERT INTO campaigns (name, template_name, status, created_by, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        templateName,
        scheduleAt ? 'SCHEDULED' : 'DRAFT',
        req.user.id,
        scheduleAt || null,
      ]
    );

    const campaign = campaignResult.rows[0];

    let selectedCount = 0;

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      selectedCount += await upsertCampaignLeads(campaign.id, leadIds);
    } else if (targetLeadStatus) {
      const leadsResult = await db.query(
        `SELECT id FROM leads WHERE status = $1`,
        [targetLeadStatus]
      );

      const autoLeadIds = leadsResult.rows.map((lead) => lead.id);
      selectedCount += await upsertCampaignLeads(campaign.id, autoLeadIds);
    }

    res.status(201).json({
      data: campaign,
      message: 'Campaign created',
      selectedLeads: selectedCount,
      nextStep: 'Use /api/blast/:campaignId/preview and /start to run blast',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/campaigns/:id
 * Update campaign status
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status required' });
    }

    if (!['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ data: result.rows[0], message: 'Campaign updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/campaigns/:id/stats
 * Get campaign statistics
 */
exports.getCampaignStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const statsResult = await db.query(
      `SELECT
        c.name,
        c.status,
        c.created_at,
        c.scheduled_at,
        COUNT(m.id)::int as total_messages,
        SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
        SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END)::int as read_count,
        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END)::int as failed,
        CASE 
          WHEN COUNT(m.id) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(m.id) / (SELECT COUNT(*) FROM leads), 2)::float
        END as coverage_rate
       FROM campaigns c
       LEFT JOIN messages m ON m.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, c.name, c.status, c.created_at, c.scheduled_at`,
      [id]
    );

    if (statsResult.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const data = statsResult.rows[0];
    res.json({
      data: {
        ...data,
        total_sent: data.total_messages,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.previewCampaignContacts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaignResult = await db.query(
      `SELECT id, name, template_name, status
       FROM campaigns
       WHERE id = $1`,
      [id]
    );

    if (campaignResult.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const [targetsResult, countResult] = await Promise.all([
      db.query(
      `SELECT l.id, l.full_name, l.phone_number, l.email, l.city, l.status
       FROM campaign_leads cl
       INNER JOIN leads l ON l.id = cl.lead_id
       WHERE cl.campaign_id = $1
         AND cl.selected = TRUE
       ORDER BY l.created_at DESC
       LIMIT 100`,
      [id]
      ),
      db.query(
        `SELECT COUNT(*)::int AS total_targets
         FROM campaign_leads
         WHERE campaign_id = $1
           AND selected = TRUE`,
        [id]
      ),
    ]);

    res.json({
      data: {
        campaign: campaignResult.rows[0],
        total_targets: countResult.rows[0]?.total_targets || 0,
        contacts: targetsResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCampaignLeadSelection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateSelectionSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const campaignResult = await db.query(
      `SELECT id FROM campaigns WHERE id = $1`,
      [id]
    );

    if (campaignResult.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    await db.query('DELETE FROM campaign_leads WHERE campaign_id = $1', [id]);
    const selectedCount = await upsertCampaignLeads(id, value.leadIds);

    res.json({
      message: 'Campaign leads updated',
      data: {
        campaign_id: id,
        selected_leads: selectedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.importCampaignLeadsFromCsv = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required (field name: file)' });
    }

    const fileName = String(req.file.originalname || '').toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return res.status(400).json({ message: 'Only CSV files are allowed' });
    }

    const mapping = parseImportMapping(req.body?.mapping);

    const parsed = await parseCsvBuffer(req.file.buffer, mapping);
    const importResult = await importRowsToCampaign({
      campaignId: id,
      rows: parsed.rows,
    });

    res.json({
      imported: importResult.imported,
      skipped: importResult.skipped + parsed.invalidRows.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadCampaignLeadImportTemplate = (req, res) => {
  const csvTemplate = getCampaignImportTemplateCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=campaign_leads_import_template.csv');
  res.status(200).send(csvTemplate);
};

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM campaigns WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    next(err);
  }
};
