const Joi = require('joi');
const db = require('../config/database');
const { messageQueue } = require('../jobs/queue');

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
});

const startBlastSchema = Joi.object({
  parameters: Joi.array().items(Joi.string()).default([]),
  ratePerSecond: Joi.number().integer().min(1).max(50).default(10),
  retryAttempts: Joi.number().integer().min(1).max(10).default(3),
});

async function getQueueStatsWithTimeout(timeoutMs = 1200) {
  let timer = null;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const timeoutError = new Error('Queue stats timeout');
        timeoutError.code = 'QUEUE_TIMEOUT';
        reject(timeoutError);
      }, timeoutMs);
    });

    const stats = await Promise.race([messageQueue.getJobCounts(), timeoutPromise]);
    return stats;
  } catch (err) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      unavailable: true,
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function getCampaignById(campaignId) {
  const result = await db.query(
    `SELECT id, name, template_name, status
     FROM campaigns
     WHERE id = $1`,
    [campaignId]
  );

  return result.rows[0] || null;
}

async function getCampaignTargets(campaignId) {
  const mappedTargets = await db.query(
    `SELECT l.id, l.phone_number
     FROM campaign_leads cl
     INNER JOIN leads l ON l.id = cl.lead_id
     WHERE cl.campaign_id = $1
       AND cl.selected = TRUE`,
    [campaignId]
  );

  return mappedTargets.rows;
}

async function getFailedTargets(campaignId) {
  const result = await db.query(
    `SELECT DISTINCT ON (lead_id)
        lead_id AS id,
        phone_number
     FROM messages
     WHERE campaign_id = $1
       AND status = 'failed'
     ORDER BY lead_id, created_at DESC`,
    [campaignId]
  );

  return result.rows;
}

async function queueTargets({ campaignId, templateName, parameters, ratePerSecond, retryAttempts, targets }) {
  const intervalMs = Math.ceil(1000 / Math.max(1, ratePerSecond));
  let queued = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const delay = i * intervalMs;

    try {
      await messageQueue.add(
        {
          campaignId,
          leadId: target.id,
          phoneNumber: target.phone_number,
          templateName,
          parameters,
        },
        {
          delay,
          attempts: retryAttempts,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }
      );
    } catch (err) {
      const queueError = new Error('Message queue is unavailable. Ensure Redis is running before starting blast.');
      queueError.status = 503;
      queueError.code = 'QUEUE_UNAVAILABLE';
      queueError.original = err;
      throw queueError;
    }

    queued += 1;
  }

  return queued;
}

exports.previewTargets = async (req, res, next) => {
  try {
    const { error, value } = campaignIdSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const campaign = await getCampaignById(value.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const targets = await getCampaignTargets(value.campaignId);

    res.json({
      data: {
        campaign,
        total_targets: targets.length,
        contacts_preview: targets.slice(0, 50),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.startBlast = async (req, res, next) => {
  const client = await db.getClient();

  try {
    // FIX #3: Wrap in transaction for safety
    await client.query('BEGIN');

    const idValidation = campaignIdSchema.validate(req.params);
    if (idValidation.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: idValidation.error.details[0].message });
    }

    const bodyValidation = startBlastSchema.validate(req.body);
    if (bodyValidation.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: bodyValidation.error.details[0].message });
    }

    const campaignId = idValidation.value.campaignId;
    const { parameters, ratePerSecond, retryAttempts } = bodyValidation.value;

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Campaign cannot be started from status ${campaign.status}` });
    }

    const targets = await getCampaignTargets(campaignId);
    if (targets.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No selected leads for this campaign. Select leads first.' });
    }

    // Queue targets (this might fail if Redis is down)
    const queued = await queueTargets({
      campaignId,
      templateName: campaign.template_name,
      parameters,
      ratePerSecond,
      retryAttempts,
      targets,
    });

    // Update campaign status only if queueing succeeded
    await db.query(
      `UPDATE campaigns
       SET status = 'RUNNING'
       WHERE id = $1`,
      [campaignId]
    );

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      message: 'Blast started',
      data: {
        campaign_id: campaignId,
        queued,
        rate_per_second: ratePerSecond,
        retry_attempts: retryAttempts,
      },
    });
  } catch (err) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    next(err);
  } finally {
    client.release();
  }
};

exports.retryFailed = async (req, res, next) => {
  try {
    const idValidation = campaignIdSchema.validate(req.params);
    if (idValidation.error) return res.status(400).json({ message: idValidation.error.details[0].message });

    const bodyValidation = startBlastSchema.validate(req.body);
    if (bodyValidation.error) return res.status(400).json({ message: bodyValidation.error.details[0].message });

    const campaignId = idValidation.value.campaignId;
    const { parameters, ratePerSecond, retryAttempts } = bodyValidation.value;

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const failedTargets = await getFailedTargets(campaignId);
    if (failedTargets.length === 0) {
      return res.status(400).json({ message: 'No failed messages to retry' });
    }

    const queued = await queueTargets({
      campaignId,
      templateName: campaign.template_name,
      parameters,
      ratePerSecond,
      retryAttempts,
      targets: failedTargets,
    });

    await db.query(
      `UPDATE campaigns
       SET status = 'RUNNING'
       WHERE id = $1`,
      [campaignId]
    );

    res.json({
      message: 'Failed messages re-queued',
      data: {
        campaign_id: campaignId,
        failed_targets: failedTargets.length,
        queued,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getBlastStatus = async (req, res, next) => {
  try {
    const { error, value } = campaignIdSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const campaign = await getCampaignById(value.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const messageStatsResult = await db.query(
      `SELECT
        COUNT(*)::int AS total_messages,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int AS sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int AS delivered,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END)::int AS read,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed
      FROM messages
      WHERE campaign_id = $1`,
      [value.campaignId]
    );

    const queueStats = await getQueueStatsWithTimeout();

    res.json({
      data: {
        campaign,
        message_stats: messageStatsResult.rows[0],
        queue: queueStats,
      },
    });
  } catch (err) {
    next(err);
  }
};
