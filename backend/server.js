const app = require('./app');
const config = require('./config');
const { seedTemplates } = require('./services/seedTemplates');
const db = require('./config/database');

async function startServer() {
  try {
    const initResult = await db.initializeDatabase();

    if (initResult.appliedMigrations.length > 0) {
      console.log(`[DB] Applied migrations: ${initResult.appliedMigrations.join(', ')}`);
    } else {
      console.log('[DB] No pending migrations');
    }

    await seedTemplates();

    const server = app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });

    server.on('error', (err) => {
      console.error('[Startup] HTTP server error:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('[Startup] Failed to initialize server:', err.message);
    process.exit(1);
  }
}

startServer();
