const Joi = require('joi');
const db = require('../config/database');
const { messageQueue } = require('../jobs/queue');

const createCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  templateName: Joi.string().required(),
  targetLeadStatus: Joi.string().valid('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED').allow(null),
  parameters: Joi.array().items(Joi.string()).default([]),
  scheduleAt: Joi.date().optional(),
});

/**
 * GET /api/campaigns
 * Get all campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.template_name, c.status, c.scheduled_at,
              COALESCE(u.name, 'Unknown') as created_by_name, c.created_at,
              COUNT(DISTINCT m.id) as total_messages,
              SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
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
      `SELECT c.*, COALESCE(u.name, 'Unknown') as created_by_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
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

    const { name, templateName, targetLeadStatus, parameters, scheduleAt } = value;

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

    // Get target leads if status specified
    let leadCount = 0;
    if (targetLeadStatus) {
      const leadsResult = await db.query(
        `SELECT id, phone_number FROM leads WHERE status = $1`,
        [targetLeadStatus]
      );

      const leads = leadsResult.rows;
      leadCount = leads.length;

      if (scheduleAt) {
        // Schedule untuk nanti
        const delayMs = new Date(scheduleAt).getTime() - Date.now();
        if (delayMs > 0) {
          await messageQueue.add(
            'blast-campaign',
            {
              campaignId: campaign.id,
              templateName,
              parameters,
              targetLeadStatus,
            },
            {
              delay: delayMs,
              attempts: 1,
            }
          );
          console.log(`[Campaign] Scheduled campaign ${campaign.id} untuk ${new Date(scheduleAt).toISOString()}`);
        }
      } else {
        // Send immediately
        for (const lead of leads) {
          await messageQueue.add(
            'send-whatsapp-message',
            {
              campaignId: campaign.id,
              phoneNumber: lead.phone_number,
              leadId: lead.id,
              templateName,
              parameters,
            },
            {
              delay: Math.random() * 5000,
            }
          );
        }

        console.log(`[Campaign] Queued ${leadCount} messages untuk campaign ${campaign.id}`);
      }
    }

    res.status(201).json({
      data: campaign,
      message: 'Campaign created',
      queued: `${leadCount} leads scheduled`,
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
        COUNT(m.id)::int as total_sent,
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

    res.json({ data: statsResult.rows[0] });
  } catch (err) {
    next(err);
  }
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
