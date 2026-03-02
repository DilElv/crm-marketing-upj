const Queue = require('bull');
const config = require('../config');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');

// Initialize queues
const messageQueue = new Queue('send-whatsapp-message', {
  redis: {
    url: config.redis.url || 'redis://localhost:6379',
  },
});

const blastQueue = new Queue('blast-campaign', {
  redis: {
    url: config.redis.url || 'redis://localhost:6379',
  },
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

    // Save message record to database
    const msgResult = await db.query(
      `INSERT INTO messages (lead_id, campaign_id, phone_number, message_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [leadId, campaignId, normalizedPhone, result.messageId, 'sent']
    );

    console.log(`[Queue] Message sent successfully - Campaign: ${campaignId}, Lead: ${leadId}, MessageId: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      leadId,
      phoneNumber: normalizedPhone,
    };
  } catch (error) {
    console.error(`[Queue] Error sending message job ${job.id}:`, error.message);

    // Save failed message record
    try {
      await db.query(
        `INSERT INTO messages (lead_id, campaign_id, phone_number, status)
         VALUES ($1, $2, $3, $4)`,
        [leadId, campaignId, phoneNumber, 'failed']
      );
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
  console.error(`[Queue] Message queue error:`, err);
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
  console.error(`[Queue] Blast queue error:`, err);
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
