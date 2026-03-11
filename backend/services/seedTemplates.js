const db = require('../config/database');

/**
 * Seed templates untuk development/testing
 * Bisa dijalankan saat startup atau manual
 */

const defaultTemplates = [
  {
    name: 'welcome',
    category: 'MARKETING',
    language: 'id',
    status: 'ACTIVE',
  },
  {
    name: 'info_pendaftaran',
    category: 'MARKETING',
    language: 'id',
    status: 'ACTIVE',
  },
  {
    name: 'follow_up',
    category: 'MARKETING',
    language: 'id',
    status: 'ACTIVE',
  },
  {
    name: 'confirmation',
    category: 'UTILITY',
    language: 'id',
    status: 'ACTIVE',
  },
  {
    name: 'reminder',
    category: 'UTILITY',
    language: 'id',
    status: 'ACTIVE',
  },
];

async function seedTemplates() {
  try {
    console.log('[Seed] Starting template seed...');

    // Check if templates already exist
    const checkResult = await db.query('SELECT COUNT(*) as count FROM templates');
    const count = checkResult.rows[0].count;

    if (count > 0) {
      console.log(`[Seed] Templates already exist (${count}). Skipping seed.`);
      return;
    }

    // Insert templates
    for (const template of defaultTemplates) {
      await db.query(
        `INSERT INTO templates (name, category, language, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [template.name, template.category, template.language, template.status]
      );
    }

    console.log(`[Seed] Successfully seeded ${defaultTemplates.length} templates`);
  } catch (err) {
    console.error('[Seed] Error seeding templates:', err.message);
  }
}

module.exports = { seedTemplates };
