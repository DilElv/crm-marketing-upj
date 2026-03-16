const Joi = require('joi');
const db = require('../config/database');

const campaignIdSchema = Joi.object({
  campaignId: Joi.string().uuid().required(),
});

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildSimplePdf(lines) {
  const safeLines = lines.map((line) => line.replace(/[()\\]/g, ' '));
  let y = 780;
  const contentLines = ['BT', '/F1 12 Tf'];

  safeLines.forEach((line) => {
    contentLines.push(`1 0 0 1 50 ${y} Tm (${line}) Tj`);
    y -= 18;
    if (y < 60) {
      y = 780;
    }
  });

  contentLines.push('ET');
  const streamContent = contentLines.join('\n');

  const objects = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj');
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  objects.push(`5 0 obj << /Length ${Buffer.byteLength(streamContent, 'utf8')} >> stream\n${streamContent}\nendstream endobj`);

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  });

  const xrefPosition = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPosition}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

async function getCampaignReportData(campaignId) {
  const campaignResult = await db.query(
    `SELECT id, name, status, created_at
     FROM campaigns
     WHERE id = $1`,
    [campaignId]
  );

  if (campaignResult.rowCount === 0) {
    return null;
  }

  const rowsResult = await db.query(
    `SELECT
      m.id,
      m.phone_number,
      m.status,
      m.error_message,
      m.created_at,
      l.full_name,
      l.email,
      l.city
     FROM messages m
     LEFT JOIN leads l ON l.id = m.lead_id
     WHERE m.campaign_id = $1
     ORDER BY m.created_at DESC`,
    [campaignId]
  );

  const statsResult = await db.query(
    `SELECT
      COUNT(*)::int AS total_messages,
      SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END)::int AS success_messages,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed_messages,
      SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END)::int AS read_messages
     FROM messages
     WHERE campaign_id = $1`,
    [campaignId]
  );

  return {
    campaign: campaignResult.rows[0],
    stats: statsResult.rows[0],
    rows: rowsResult.rows,
  };
}

async function getCampaignSummaryData(campaignId) {
  const [campaignResult, statsResult] = await Promise.all([
    db.query(
      `SELECT id, name, status, created_at
       FROM campaigns
       WHERE id = $1`,
      [campaignId]
    ),
    db.query(
      `SELECT
        COUNT(*)::int AS total_messages,
        SUM(CASE WHEN status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END)::int AS success_messages,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed_messages,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END)::int AS read_messages
       FROM messages
       WHERE campaign_id = $1`,
      [campaignId]
    ),
  ]);

  if (campaignResult.rowCount === 0) {
    return null;
  }

  return {
    campaign: campaignResult.rows[0],
    stats: statsResult.rows[0],
  };
}

exports.exportCampaignCsv = async (req, res, next) => {
  try {
    const { error, value } = campaignIdSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const reportData = await getCampaignReportData(value.campaignId);
    if (!reportData) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const header = [
      'message_id',
      'full_name',
      'phone_number',
      'email',
      'city',
      'status',
      'error_message',
      'created_at',
    ];

    const lines = [header.join(',')];
    reportData.rows.forEach((row) => {
      lines.push([
        row.id,
        row.full_name,
        row.phone_number,
        row.email,
        row.city,
        row.status,
        row.error_message,
        row.created_at,
      ].map(escapeCsv).join(','));
    });

    const filename = `campaign_${reportData.campaign.id}_report.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
};

exports.exportCampaignPdf = async (req, res, next) => {
  try {
    const { error, value } = campaignIdSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const reportData = await getCampaignReportData(value.campaignId);
    if (!reportData) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const total = reportData.stats.total_messages || 0;
    const success = reportData.stats.success_messages || 0;
    const failed = reportData.stats.failed_messages || 0;
    const read = reportData.stats.read_messages || 0;
    const deliveryRate = total > 0 ? ((success / total) * 100).toFixed(2) : '0.00';

    const lines = [
      `Campaign Report: ${reportData.campaign.name}`,
      `Campaign ID: ${reportData.campaign.id}`,
      `Status: ${reportData.campaign.status}`,
      `Generated At: ${new Date().toISOString()}`,
      '',
      `Total Messages: ${total}`,
      `Success Messages: ${success}`,
      `Failed Messages: ${failed}`,
      `Read Messages: ${read}`,
      `Delivery Rate: ${deliveryRate}%`,
      '',
      'Top 20 Latest Message Records:',
    ];

    reportData.rows.slice(0, 20).forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.full_name || '-'} | ${row.phone_number} | ${row.status} | ${new Date(row.created_at).toISOString()}`
      );
    });

    const pdfBuffer = buildSimplePdf(lines);
    const filename = `campaign_${reportData.campaign.id}_report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

exports.getCampaignResult = async (req, res, next) => {
  try {
    const { error, value } = campaignIdSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const reportData = await getCampaignSummaryData(value.campaignId);
    if (!reportData) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const total = reportData.stats.total_messages || 0;
    const success = reportData.stats.success_messages || 0;

    res.json({
      data: {
        campaign: reportData.campaign,
        totals: {
          total_messages: total,
          success_messages: success,
          failed_messages: reportData.stats.failed_messages || 0,
          read_messages: reportData.stats.read_messages || 0,
          delivery_rate: total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
