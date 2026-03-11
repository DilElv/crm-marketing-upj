const app = require('./app');
const config = require('./config');
const { seedTemplates } = require('./services/seedTemplates');

app.listen(config.port, async () => {
  console.log(`Server listening on port ${config.port}`);
  
  // Seed templates on startup
  await seedTemplates();
});
