const db = require('../config/database');

exports.getOverview = async (req, res, next) => {
  try {
    const [campaignStats, messageStats, campaignsToday, campaignPerformance] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total_campaigns FROM campaigns'),
      db.query(
        `SELECT
          COUNT(*)::int AS messages_sent,
          SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END)::int AS successful_messages,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed_messages,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END)::int AS read_messages
         FROM messages`
      ),
      db.query(
        `SELECT COUNT(*)::int AS campaigns_created_today
         FROM campaigns
         WHERE created_at >= date_trunc('day', now())`
      ),
      db.query(
        `SELECT
          c.id,
          c.name,
          COUNT(m.id)::int AS total_messages,
          SUM(CASE WHEN m.status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END)::int AS success_messages,
          SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END)::int AS failed_messages,
          SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END)::int AS read_messages
         FROM campaigns c
         LEFT JOIN messages m ON m.campaign_id = c.id
         GROUP BY c.id, c.name
         ORDER BY c.created_at DESC
         LIMIT 10`
      ),
    ]);

    const messageRow = messageStats.rows[0] || {};

    res.json({
      data: {
        totals: {
          total_campaigns: campaignStats.rows[0]?.total_campaigns || 0,
          messages_sent: messageRow.messages_sent || 0,
          successful_messages: messageRow.successful_messages || 0,
          failed_messages: messageRow.failed_messages || 0,
          read_messages: messageRow.read_messages || 0,
          campaigns_created_today: campaignsToday.rows[0]?.campaigns_created_today || 0,
        },
        charts: {
          success_vs_failed: {
            success: messageRow.successful_messages || 0,
            failed: messageRow.failed_messages || 0,
          },
          campaign_performance: campaignPerformance.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
