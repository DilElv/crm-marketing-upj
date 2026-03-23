const Queue = require('bull');
const config = require('../config');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');

const queueConnectionState = new Map();

function buildRedisOptions(redisUrl) {
  const fallback = {
    host: '127.0.0.1',
    port: 6379,
  };

  const baseOptions = {
    connectTimeout: 5000,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 2000, 30000),
  };

  if (!redisUrl || typeof redisUrl !== 'string') {
    return {
      ...fallback,
      ...baseOptions,
    };
  }

  try {
    const normalized = redisUrl.includes('://') ? redisUrl : `redis://${redisUrl}`;
    const parsed = new URL(normalized);

    const options = {
      host: parsed.hostname || fallback.host,
      port: parsed.port ? Number(parsed.port) : fallback.port,
      ...baseOptions,
    };

    if (parsed.username) {
      options.username = decodeURIComponent(parsed.username);
    }

    if (parsed.password) {
      options.password = decodeURIComponent(parsed.password);
    }

    if (parsed.pathname && parsed.pathname !== '/') {
      const dbIndex = Number(parsed.pathname.slice(1));
      if (Number.isInteger(dbIndex) && dbIndex >= 0) {
        options.db = dbIndex;
      }
    }

    if (parsed.protocol === 'rediss:') {
      options.tls = {};
    }

    return options;
  } catch (err) {
    console.warn(`[Queue] Invalid REDIS_URL "${redisUrl}". Falling back to 127.0.0.1:6379`);
    return {
      ...fallback,
      ...baseOptions,
    };
  }
}

function markQueueConnectionIssue(queueLabel, err) {
  const currentState = queueConnectionState.get(queueLabel) || {
    isDown: false,
    code: null,
  };

  const nextCode = err?.code || 'UNKNOWN';
  if (currentState.isDown && currentState.code === nextCode) {
    return;
  }

  queueConnectionState.set(queueLabel, {
    isDown: true,
    code: nextCode,
  });

  const host = err?.address || '127.0.0.1';
  const port = err?.port || 6379;
  console.error(`[Queue] ${queueLabel} Redis connection issue (${nextCode}) at ${host}:${port}. Retrying in background.`);
}

function markQueueReady(queueLabel) {
  const currentState = queueConnectionState.get(queueLabel) || {
    isDown: false,
  };

  if (currentState.isDown) {
    console.log(`[Queue] ${queueLabel} Redis connection restored.`);
  }

  queueConnectionState.set(queueLabel, {
    isDown: false,
    code: null,
  });
}

const redisOptions = buildRedisOptions(config.redis.url);

// Initialize queues
const messageQueue = new Queue('send-whatsapp-message', {
  redis: { ...redisOptions },
});

const blastQueue = new Queue('blast-campaign', {
  redis: { ...redisOptions },
});

/**
 * WORKER: send-whatsapp-message
 * Processes individual message sending jobs
 */
messageQueue.process(async (job) => {
  const { campaignId, phoneNumber, leadId, templateName, parameters } = job.data;

  try {
    console.log(`[Queue] Processing message job ${job.id} untuk ${phoneNumber}`);

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/^0/, '62');

    // Send via WhatsApp service
    const result = await WhatsAppService.sendTemplateMessage(
      normalizedPhone,
      templateName,
      parameters
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    // FIX #1: Get campaign_lead_id for proper tracking
    const campaignLeadResult = await db.query(
      `SELECT id FROM campaign_leads 
       WHERE campaign_id = $1 AND lead_id = $2`,
      [campaignId, leadId]
    );
    
    const campaign_lead_id = campaignLeadResult.rows[0]?.id || null;

    // Save message record to database with campaign_lead_id
    const msgResult = await db.query(
      `INSERT INTO messages (campaign_lead_id, lead_id, campaign_id, phone_number, whatsapp_message_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [campaign_lead_id, leadId, campaignId, normalizedPhone, result.messageId, 'sent']
    );

    // Update campaign_lead status to 'queued'
    if (campaign_lead_id) {
      await db.query(
        `UPDATE campaign_leads SET status = 'sent' WHERE id = $1`,
        [campaign_lead_id]
      );
    }

    console.log(`[Queue] Message sent successfully - Campaign: ${campaignId}, Lead: ${leadId}, MessageId: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      leadId,
      phoneNumber: normalizedPhone,
    };
  } catch (error) {
    console.error(`[Queue] Error sending message job ${job.id}:`, error.message);

    // Save failed message record with campaign_lead_id
    try {
      const campaignLeadResult = await db.query(
        `SELECT id FROM campaign_leads 
         WHERE campaign_id = $1 AND lead_id = $2`,
        [campaignId, leadId]
      );
      
      const campaign_lead_id = campaignLeadResult.rows[0]?.id || null;

      await db.query(
        `INSERT INTO messages (campaign_lead_id, lead_id, campaign_id, phone_number, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [campaign_lead_id, leadId, campaignId, phoneNumber, 'failed', error.message]
      );

      // Update campaign_lead status to 'failed'
      if (campaign_lead_id) {
        await db.query(
          `UPDATE campaign_leads SET status = 'failed' WHERE id = $1`,
          [campaign_lead_id]
        );
      }
    } catch (dbErr) {
      console.error(`[Queue] Failed to save error message to DB:`, dbErr.message);
    }

    throw error;
  }
});

/**
 * WORKER: blast-campaign
 * Processes blast campaign jobs - sends to multiple leads
 */
blastQueue.process(async (job) => {
  const { campaignId, templateName, parameters, targetLeadStatus } = job.data;

  try {
    console.log(`[Queue] Processing blast campaign ${campaignId}`);

    // Get target leads
    let query = `SELECT id, phone_number FROM leads`;
    let params = [];

    if (targetLeadStatus) {
      query += ` WHERE status = $1`;
      params = [targetLeadStatus];
    }

    const leadsResult = await db.query(query, params);
    const leads = leadsResult.rows;

    console.log(`[Queue] Found ${leads.length} target leads untuk campaign ${campaignId}`);

    // Queue individual messages dengan delay untuk rate limiting
    let queued = 0;
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const delayMs = i * 2000; // 2 second delay between each message

      try {
        await messageQueue.add(
          {
            campaignId,
            phoneNumber: lead.phone_number,
            leadId: lead.id,
            templateName,
            parameters,
          },
          {
            delay: delayMs,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000, // Start with 2s, multiply on retry
            },
            timeout: 30000, // 30 second timeout per message
          }
        );
        queued++;
      } catch (err) {
        console.error(`[Queue] Failed to queue message untuk lead ${lead.id}:`, err.message);
      }
    }

    // Update campaign status to RUNNING
    await db.query(
      `UPDATE campaigns SET status = $1 WHERE id = $2`,
      ['RUNNING', campaignId]
    );

    console.log(`[Queue] Blast campaign ${campaignId} queued ${queued}/${leads.length} messages`);

    return {
      campaignId,
      totalLeads: leads.length,
      queued,
      estimatedDuration: `${(queued * 2) / 60} minutes`,
    };
  } catch (error) {
    console.error(`[Queue] Error processing blast campaign:`, error.message);
    throw error;
  }
});

/**
 * Event handlers for message queue
 */
messageQueue.on('progress', (job, progress) => {
  console.log(`[Queue] Message job ${job.id} progress: ${progress}%`);
});

messageQueue.on('completed', (job, result) => {
  console.log(`[Queue] ✓ Message job ${job.id} completed`, result);
});

messageQueue.on('failed', (job, err) => {
  console.error(`[Queue] ✗ Message job ${job.id} failed: ${err.message}`);
});

messageQueue.on('error', (err) => {
  markQueueConnectionIssue('Message queue', err);
});

messageQueue.on('ready', () => {
  markQueueReady('Message queue');
});

/**
 * Event handlers for blast queue
 */
blastQueue.on('progress', (job, progress) => {
  console.log(`[Queue] Blast job ${job.id} progress: ${progress}%`);
});

blastQueue.on('completed', (job, result) => {
  console.log(`[Queue] ✓ Blast job ${job.id} completed`, result);
});

blastQueue.on('failed', (job, err) => {
  console.error(`[Queue] ✗ Blast job ${job.id} failed: ${err.message}`);
});

blastQueue.on('error', (err) => {
  markQueueConnectionIssue('Blast queue', err);
});

blastQueue.on('ready', () => {
  markQueueReady('Blast queue');
});

/**
 * Cleanup on process termination
 */
process.on('SIGTERM', async () => {
  console.log('[Queue] SIGTERM received, closing queues...');
  await messageQueue.close();
  await blastQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Queue] SIGINT received, closing queues...');
  await messageQueue.close();
  await blastQueue.close();
  process.exit(0);
});

module.exports = {
  messageQueue,
  blastQueue,
};
