const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const csv = require('csv-parser');
const Joi = require('joi');
const crypto = require('crypto');
const db = require('../config/database');

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const previewStore = new Map();

const commitSchema = Joi.object({
  previewId: Joi.string().required(),
});

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  const digitsOnly = String(phoneNumber).replace(/[^\d+]/g, '').trim();

  if (digitsOnly.startsWith('+62')) {
    return digitsOnly.substring(1);
  }

  if (digitsOnly.startsWith('62')) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith('0')) {
    return `62${digitsOnly.substring(1)}`;
  }

  if (digitsOnly.startsWith('+')) {
    return digitsOnly.substring(1);
  }

  return digitsOnly;
}

function isValidPhoneNumber(phoneNumber) {
  return /^62\d{8,14}$/.test(phoneNumber);
}

function cleanupExpiredPreviews() {
  const now = Date.now();
  for (const [previewId, item] of previewStore.entries()) {
    if (now - item.createdAt > PREVIEW_TTL_MS) {
      previewStore.delete(previewId);
    }
  }
}

async function saveLeads(leads) {
  let importedLeads = 0;
  let duplicateSkipped = 0;

  for (const lead of leads) {
    const result = await db.query(
      `INSERT INTO leads
        (full_name, phone_number, email, city, school_origin, program_interest, entry_year, lead_source, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (phone_number) DO NOTHING
       RETURNING id`,
      [
        lead.full_name,
        lead.phone_number,
        lead.email,
        lead.city,
        lead.school_origin,
        lead.program_interest,
        lead.entry_year,
        lead.lead_source,
        'NEW',
        lead.notes,
      ]
    );

    if (result.rowCount > 0) {
      importedLeads += 1;
    } else {
      duplicateSkipped += 1;
    }
  }

  return { importedLeads, duplicateSkipped };
}

async function parseCsvUpload(req) {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const invalidRows = [];
    const leads = [];
    const seenPhoneNumbers = new Set();

    let uploadedFile = null;
    let fileFound = false;

    bb.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') {
        file.resume();
        return;
      }

      fileFound = true;

      const originalName = info?.filename || 'upload.csv';
      if (!originalName.toLowerCase().endsWith('.csv')) {
        file.resume();
        return reject(new Error('Only CSV files are allowed'));
      }

      const fileName = `leads_${Date.now()}_${Math.floor(Math.random() * 10000)}.csv`;
      uploadedFile = path.join(uploadDir, fileName);
      file.pipe(fs.createWriteStream(uploadedFile));
    });

    bb.on('close', async () => {
      if (!fileFound || !uploadedFile) {
        return reject(new Error('No file uploaded'));
      }

      try {
        let lineCount = 0;

        await new Promise((innerResolve, innerReject) => {
          fs.createReadStream(uploadedFile)
            .pipe(csv())
            .on('data', (row) => {
              lineCount += 1;

              const fullName = (row.full_name || row.name || '').trim();
              const rawPhone = (row.phone_number || row.phone || '').trim();
              const normalizedPhone = normalizePhoneNumber(rawPhone);

              if (!fullName) {
                invalidRows.push({ line: lineCount, reason: 'Missing full_name' });
                return;
              }

              if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
                invalidRows.push({ line: lineCount, reason: 'Invalid phone_number format' });
                return;
              }

              if (seenPhoneNumbers.has(normalizedPhone)) {
                invalidRows.push({ line: lineCount, reason: 'Duplicate phone_number in file' });
                return;
              }

              seenPhoneNumbers.add(normalizedPhone);

              const entryYear = row.entry_year ? Number.parseInt(row.entry_year, 10) : null;

              leads.push({
                full_name: fullName,
                phone_number: normalizedPhone,
                email: row.email ? row.email.trim() : null,
                city: row.city ? row.city.trim() : null,
                school_origin: row.school_origin ? row.school_origin.trim() : null,
                program_interest: row.program_interest ? row.program_interest.trim() : null,
                entry_year: Number.isInteger(entryYear) ? entryYear : null,
                lead_source: row.lead_source ? row.lead_source.trim() : 'CSV Import',
                notes: `Imported from CSV on ${new Date().toISOString()}`,
              });
            })
            .on('end', innerResolve)
            .on('error', innerReject);
        });

        try {
          fs.unlinkSync(uploadedFile);
        } catch (unlinkErr) {
          // Ignore temporary file cleanup errors.
        }

        resolve({
          leads,
          invalidRows,
          totalLines: lineCount,
        });
      } catch (err) {
        try {
          if (uploadedFile && fs.existsSync(uploadedFile)) {
            fs.unlinkSync(uploadedFile);
          }
        } catch (unlinkErr) {
          // Ignore temporary file cleanup errors.
        }

        reject(err);
      }
    });

    bb.on('error', (err) => {
      reject(err);
    });

    req.pipe(bb);
  });
}

async function appendDatabaseDuplicates(leads, invalidRows) {
  if (leads.length === 0) return [];

  const phoneNumbers = leads.map((lead) => lead.phone_number);
  const existingResult = await db.query(
    `SELECT phone_number FROM leads WHERE phone_number = ANY($1::text[])`,
    [phoneNumbers]
  );

  const existingSet = new Set(existingResult.rows.map((row) => row.phone_number));
  const filteredLeads = [];

  leads.forEach((lead, index) => {
    if (existingSet.has(lead.phone_number)) {
      invalidRows.push({
        line: index + 1,
        reason: `phone_number already exists (${lead.phone_number})`,
      });
      return;
    }
    filteredLeads.push(lead);
  });

  return filteredLeads;
}

/**
 * POST /api/leads/import/csv
 * Import leads from CSV file
 * 
 * CSV Format:
 * full_name,phone_number,email,city,school_origin,program_interest,entry_year,lead_source
 * Budi Santoso,+6281234567,budi@email.com,Jakarta,SMA Jakarta,TI,2024,Google
 * Siti Nurhayati,+6287654321,siti@email.com,Bandung,SMA Bandung,Bisnis,2024,Facebook
 */
exports.importLeadsFromCSV = async (req, res, next) => {
  try {
    const parsed = await parseCsvUpload(req);
    const validLeads = await appendDatabaseDuplicates(parsed.leads, parsed.invalidRows);

    if (validLeads.length === 0) {
      return res.status(400).json({
        message: 'No valid leads found in CSV',
        stats: {
          totalLines: parsed.totalLines,
          validLines: 0,
          importedLeads: 0,
          duplicateSkipped: 0,
          errorLines: parsed.invalidRows.length,
        },
        invalidRows: parsed.invalidRows,
      });
    }

    const { importedLeads, duplicateSkipped } = await saveLeads(validLeads);

    res.status(201).json({
      message: 'CSV import completed',
      stats: {
        totalLines: parsed.totalLines,
        validLines: validLeads.length,
        importedLeads,
        duplicateSkipped,
        errorLines: parsed.invalidRows.length,
      },
      invalidRows: parsed.invalidRows,
    });
  } catch (err) {
    next(err);
  }
};

exports.previewLeadsFromCSV = async (req, res, next) => {
  try {
    cleanupExpiredPreviews();

    const parsed = await parseCsvUpload(req);
    const validLeads = await appendDatabaseDuplicates(parsed.leads, parsed.invalidRows);

    const previewId = crypto.randomUUID();
    previewStore.set(previewId, {
      createdAt: Date.now(),
      leads: validLeads,
      createdBy: req.user?.id || null,
    });

    res.json({
      message: 'CSV preview generated',
      data: {
        previewId,
        expiresInSeconds: Math.floor(PREVIEW_TTL_MS / 1000),
        summary: {
          totalLines: parsed.totalLines,
          validLines: validLeads.length,
          invalidLines: parsed.invalidRows.length,
        },
        preview: validLeads.slice(0, 100),
        invalidRows: parsed.invalidRows.slice(0, 100),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.commitPreviewImport = async (req, res, next) => {
  try {
    cleanupExpiredPreviews();

    const { error, value } = commitSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const previewData = previewStore.get(value.previewId);
    if (!previewData) {
      return res.status(404).json({ message: 'Preview not found or expired' });
    }

    if (previewData.createdBy && req.user?.id && previewData.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Preview does not belong to current user' });
    }

    const { importedLeads, duplicateSkipped } = await saveLeads(previewData.leads);
    previewStore.delete(value.previewId);

    res.status(201).json({
      message: 'Preview import committed',
      stats: {
        validLines: previewData.leads.length,
        importedLeads,
        duplicateSkipped,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leads/import/template
 * Download CSV template for user reference
 */
exports.getCSVTemplate = (req, res) => {
  const csvTemplate = `full_name,phone_number,email,city,school_origin,program_interest,entry_year,lead_source
Budi Santoso,08123456789,budi@email.com,Jakarta,SMA Jakarta,Teknik Informatika,2024,Google
Siti Nurhayati,08123456780,siti@email.com,Bandung,SMA Bandung,Bisnis,2024,Facebook
Ahmad Rizki,08123456781,ahmad@email.com,Surabaya,SMA Surabaya,Akuntansi,2024,Instagram
Dewi Kusuma,08123456782,dewi@email.com,Medan,SMA Medan,Manajemen,2024,TikTok`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads_template.csv');
  res.send(csvTemplate);
};
