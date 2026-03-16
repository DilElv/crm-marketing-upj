const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./index');

const pool = new Pool(config.db);
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
const requiredTables = ['users', 'leads', 'campaigns', 'templates', 'campaign_leads', 'messages'];

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

function normalizeDatabaseError(err) {
  if (!err) return new Error('Unknown database error');

  if (err.code === '42P01') {
    const relationMatch = /relation\s+"([^"]+)"/i.exec(err.message || '');
    const tableName = relationMatch ? relationMatch[1] : 'unknown_table';
    const wrapped = new Error(
      `Database table missing: ${tableName}. Run migrations or restart the server to auto-initialize schema.`
    );
    wrapped.status = 500;
    wrapped.code = err.code;
    wrapped.detail = err.detail;
    wrapped.original = err;
    return wrapped;
  }

  if (err.code === '28P01') {
    const wrapped = new Error('Database authentication failed. Check DB_USER and DB_PASSWORD.');
    wrapped.status = 503;
    wrapped.code = err.code;
    wrapped.original = err;
    return wrapped;
  }

  if (err.code === '3D000') {
    const wrapped = new Error('Configured database does not exist. Check DB_NAME and create the database.');
    wrapped.status = 503;
    wrapped.code = err.code;
    wrapped.original = err;
    return wrapped;
  }

  if (err.code === 'ECONNREFUSED') {
    const wrapped = new Error('Database connection refused. Ensure PostgreSQL service is running.');
    wrapped.status = 503;
    wrapped.code = err.code;
    wrapped.original = err;
    return wrapped;
  }

  return err;
}

async function ensureMigrationTable(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

async function runMigrations(client) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort();

  const applied = [];

  for (const file of files) {
    const alreadyApplied = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
      [file]
    );

    if (alreadyApplied.rowCount > 0) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  return applied;
}

async function getMissingRequiredTables(client) {
  const result = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [requiredTables]
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  return requiredTables.filter((tableName) => !found.has(tableName));
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    await ensureMigrationTable(client);
    const appliedMigrations = await runMigrations(client);
    const missingTables = await getMissingRequiredTables(client);

    if (missingTables.length > 0) {
      const err = new Error(
        `Database initialization incomplete. Missing tables: ${missingTables.join(', ')}`
      );
      err.status = 500;
      err.code = 'DB_INIT_MISSING_TABLES';
      throw err;
    }

    return {
      appliedMigrations,
      missingTables,
    };
  } catch (err) {
    throw normalizeDatabaseError(err);
  } finally {
    client.release();
  }
}

module.exports = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  },
  initializeDatabase,
  normalizeDatabaseError,
  pool,
};
