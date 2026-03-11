const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const csv = require('csv-parser');
const db = require('../config/database');

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
    // Parse multipart form data
    const bb = busboy({ headers: req.headers });
    let csvFile = null;
    let uploadedFile = null;

    bb.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') return;

      const fileName = `leads_${Date.now()}.csv`;
      const uploadDir = path.join(__dirname, '../../uploads');
      
      // Create uploads directory if not exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      uploadedFile = filePath;

      // Pipe file to disk temporarily
      file.pipe(fs.createWriteStream(filePath));
    });

    bb.on('close', async () => {
      try {
        if (!uploadedFile) {
          return res.status(400).json({ message: 'No file uploaded' });
        }

        // Read and parse CSV
        const leads = [];
        let lineCount = 0;
        let errorCount = 0;

        await new Promise((resolve, reject) => {
          fs.createReadStream(uploadedFile)
            .pipe(csv())
            .on('data', (row) => {
              lineCount++;

              try {
                // Validate required fields
                if (!row.full_name || !row.phone_number) {
                  console.warn(`[CSV] Line ${lineCount}: Missing required fields`);
                  errorCount++;
                  return;
                }

                // Clean and normalize data
                const lead = {
                  full_name: row.full_name.trim(),
                  phone_number: row.phone_number.trim(),
                  // Keep imported leads' email empty by request.
                  email: null,
                  city: row.city ? row.city.trim() : null,
                  school_origin: row.school_origin ? row.school_origin.trim() : null,
                  program_interest: row.program_interest ? row.program_interest.trim() : null,
                  entry_year: row.entry_year ? parseInt(row.entry_year) : null,
                  lead_source: row.lead_source ? row.lead_source.trim() : 'CSV Import',
                  status: 'NEW',
                  notes: `Imported from CSV on ${new Date().toLocaleDateString()}`,
                };

                leads.push(lead);
              } catch (err) {
                console.warn(`[CSV] Line ${lineCount}: ${err.message}`);
                errorCount++;
              }
            })
            .on('end', resolve)
            .on('error', reject);
        });

        // Delete temporary file
        fs.unlinkSync(uploadedFile);

        if (leads.length === 0) {
          return res.status(400).json({
            message: 'No valid leads found in CSV',
            stats: { lineCount, errorCount },
          });
        }

        // Bulk insert to database
        console.log(`[CSV] Inserting ${leads.length} leads...`);
        let successCount = 0;
        let duplicateCount = 0;

        for (const lead of leads) {
          try {
            await db.query(
              `INSERT INTO leads 
               (full_name, phone_number, email, city, school_origin, program_interest, entry_year, lead_source, status, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (phone_number) DO NOTHING`,
              [
                lead.full_name,
                lead.phone_number,
                lead.email,
                lead.city,
                lead.school_origin,
                lead.program_interest,
                lead.entry_year,
                lead.lead_source,
                lead.status,
                lead.notes,
              ]
            );
            successCount++;
          } catch (err) {
            // Duplicate phone number
            if (err.code === '23505') {
              duplicateCount++;
            } else {
              throw err;
            }
          }
        }

        res.status(201).json({
          message: 'CSV import completed',
          stats: {
            totalLines: lineCount,
            validLines: leads.length,
            importedLeads: successCount,
            duplicateSkipped: duplicateCount,
            errorLines: errorCount,
          },
        });

        console.log(
          `[CSV] Import complete: ${successCount} imported, ${duplicateCount} duplicates skipped, ${errorCount} errors`
        );
      } catch (err) {
        if (uploadedFile && fs.existsSync(uploadedFile)) {
          fs.unlinkSync(uploadedFile);
        }
        next(err);
      }
    });

    bb.on('error', (err) => {
      if (uploadedFile && fs.existsSync(uploadedFile)) {
        fs.unlinkSync(uploadedFile);
      }
      next(err);
    });

    req.pipe(bb);
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
Budi Santoso,+6281234567,,Jakarta,SMA Jakarta,Teknik Informatika,2024,Google
Siti Nurhayati,+6287654321,,Bandung,SMA Bandung,Bisnis,2024,Facebook
Ahmad Rizki,+6289876543,,Surabaya,SMA Surabaya,Akuntansi,2024,Instagram
Dewi Kusuma,+6282468135,,Medan,SMA Medan,Manajemen,2024,TikTok`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads_template.csv');
  res.send(csvTemplate);
};
