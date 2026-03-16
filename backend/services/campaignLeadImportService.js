const csvParser = require('csv-parser');
const { Readable } = require('stream');
const db = require('../config/database');

const EXPECTED_COLUMNS = ['name', 'phone_number', 'email', 'city', 'program_interest'];
const REQUIRED_COLUMNS = ['name', 'phone_number'];

const COLUMN_ALIASES = {
  name: ['name', 'full_name', 'nama', 'nama_lengkap'],
  phone_number: ['phone_number', 'phone', 'no_hp', 'nomor_hp', 'nomor_telepon', 'whatsapp', 'no_wa'],
  email: ['email', 'email_address', 'alamat_email'],
  city: ['city', 'kota', 'domisili'],
  program_interest: ['program_interest', 'program', 'minat_program', 'jurusan', 'prodi'],
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizePhoneNumber(rawValue) {
  if (!rawValue) return null;

  const digitsOnly = String(rawValue).replace(/[^\d+]/g, '').trim();
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith('+62')) return digitsOnly.substring(1);
  if (digitsOnly.startsWith('62')) return digitsOnly;
  if (digitsOnly.startsWith('0')) return `62${digitsOnly.substring(1)}`;
  if (digitsOnly.startsWith('+')) return digitsOnly.substring(1);

  return digitsOnly;
}

function isValidPhoneNumber(phoneNumber) {
  return /^62\d{8,14}$/.test(phoneNumber || '');
}

function autoMapColumns(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const mapping = {};

  for (const expected of EXPECTED_COLUMNS) {
    const aliases = [expected, ...(COLUMN_ALIASES[expected] || [])].map(normalizeHeader);
    const match = normalizedHeaders.find((item) => aliases.includes(item.normalized));
    mapping[expected] = match ? match.original : '';
  }

  return mapping;
}

function resolveColumnMapping(headers, rawMapping) {
  const autoMapping = autoMapColumns(headers);
  if (!rawMapping || typeof rawMapping !== 'object') {
    return autoMapping;
  }

  const headerSet = new Set(headers);
  const finalMapping = { ...autoMapping };

  EXPECTED_COLUMNS.forEach((field) => {
    const candidate = typeof rawMapping[field] === 'string' ? rawMapping[field].trim() : '';
    if (candidate && headerSet.has(candidate)) {
      finalMapping[field] = candidate;
    }
  });

  return finalMapping;
}

function validateRequiredMapping(mapping) {
  const missing = REQUIRED_COLUMNS.filter((field) => !mapping[field]);
  if (missing.length > 0) {
    const err = new Error(`Missing required column mapping: ${missing.join(', ')}`);
    err.status = 400;
    err.code = 'INVALID_COLUMN_MAPPING';
    throw err;
  }
}

function parseCsvBuffer(buffer, rawMapping) {
  return new Promise((resolve, reject) => {
    const headers = [];
    const rows = [];
    const invalidRows = [];
    const seenPhoneNumbers = new Set();
    let rowIndex = 0;
    let resolvedMapping = null;
    const parser = csvParser({
      mapHeaders: ({ header }) => String(header || '').trim(),
      skipLines: 0,
    });

    Readable.from(buffer)
      .pipe(parser)
      .on('headers', (csvHeaders) => {
        csvHeaders.forEach((header) => headers.push(header));
        resolvedMapping = resolveColumnMapping(headers, rawMapping);

        try {
          validateRequiredMapping(resolvedMapping);
        } catch (err) {
          parser.destroy(err);
        }
      })
      .on('data', (rawRow) => {
        rowIndex += 1;

        if (!resolvedMapping) {
          return;
        }

        const mapped = {
          name: (rawRow[resolvedMapping.name] || '').toString().trim(),
          phone_number: (rawRow[resolvedMapping.phone_number] || '').toString().trim(),
          email: resolvedMapping.email ? (rawRow[resolvedMapping.email] || '').toString().trim() : '',
          city: resolvedMapping.city ? (rawRow[resolvedMapping.city] || '').toString().trim() : '',
          program_interest: resolvedMapping.program_interest
            ? (rawRow[resolvedMapping.program_interest] || '').toString().trim()
            : '',
        };

        if (!mapped.name) {
          invalidRows.push({ line: rowIndex, reason: 'Missing name value' });
          return;
        }

        const normalizedPhone = normalizePhoneNumber(mapped.phone_number);
        if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
          invalidRows.push({ line: rowIndex, reason: 'Invalid phone_number value' });
          return;
        }

        if (seenPhoneNumbers.has(normalizedPhone)) {
          invalidRows.push({ line: rowIndex, reason: 'Duplicate phone_number in CSV' });
          return;
        }

        seenPhoneNumbers.add(normalizedPhone);

        rows.push({
          name: mapped.name,
          full_name: mapped.name,
          phone_number: normalizedPhone,
          email: mapped.email || null,
          city: mapped.city || null,
          program_interest: mapped.program_interest || null,
        });
      })
      .on('end', () => {
        resolve({
          headers,
          rows,
          invalidRows,
          mapping: resolvedMapping || resolveColumnMapping(headers, rawMapping),
        });
      })
      .on('error', (err) => reject(err));
  });
}

async function importRowsToCampaign({ campaignId, rows }) {
  const client = await db.pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const campaignResult = await client.query('SELECT id FROM campaigns WHERE id = $1 LIMIT 1', [campaignId]);
    if (campaignResult.rowCount === 0) {
      const err = new Error('Campaign not found');
      err.status = 404;
      throw err;
    }

    let imported = 0;
    let skipped = 0;
    let createdLeads = 0;

    for (const row of rows) {
      let leadId = null;

      const existingLead = await client.query(
        'SELECT id FROM leads WHERE phone_number = $1 LIMIT 1',
        [row.phone_number]
      );

      if (existingLead.rowCount > 0) {
        leadId = existingLead.rows[0].id;
      } else {
        try {
          const insertedLead = await client.query(
            `INSERT INTO leads (name, full_name, phone_number, email, city, program_interest, lead_source, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'NEW', $8)
             RETURNING id`,
            [
              row.name,
              row.full_name,
              row.phone_number,
              row.email,
              row.city,
              row.program_interest,
              'Google Form CSV',
              'Imported from campaign CSV upload',
            ]
          );

          leadId = insertedLead.rows[0].id;
          createdLeads += 1;
        } catch (err) {
          if (err.code === '23505') {
            const retryLead = await client.query(
              'SELECT id FROM leads WHERE phone_number = $1 LIMIT 1',
              [row.phone_number]
            );
            if (retryLead.rowCount > 0) {
              leadId = retryLead.rows[0].id;
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }

      const existingCampaignLead = await client.query(
        'SELECT selected FROM campaign_leads WHERE campaign_id = $1 AND lead_id = $2 LIMIT 1',
        [campaignId, leadId]
      );

      if (existingCampaignLead.rowCount === 0) {
        await client.query(
          `INSERT INTO campaign_leads (campaign_id, lead_id, selected)
           VALUES ($1, $2, TRUE)`,
          [campaignId, leadId]
        );
        imported += 1;
      } else if (!existingCampaignLead.rows[0].selected) {
        await client.query(
          `UPDATE campaign_leads
           SET selected = TRUE
           WHERE campaign_id = $1 AND lead_id = $2`,
          [campaignId, leadId]
        );
        imported += 1;
      } else {
        skipped += 1;
      }
    }

    await client.query('COMMIT');

    return {
      imported,
      skipped,
      createdLeads,
    };
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    throw err;
  } finally {
    client.release();
  }
}

function getCampaignImportTemplateCsv() {
  return [
    'name,phone_number,email,city,program_interest',
    'Budi Santoso,081234567890,budi@email.com,Tangerang,Informatika',
    'Siti Aisyah,081298765432,siti@email.com,Jakarta,Manajemen',
    'Rizky Pratama,628111223344,rizky@email.com,Depok,Akuntansi',
  ].join('\n');
}

module.exports = {
  EXPECTED_COLUMNS,
  parseCsvBuffer,
  importRowsToCampaign,
  getCampaignImportTemplateCsv,
};
