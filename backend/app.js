const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { requestLogger } = require('./middlewares/logger');
const rateLimiter = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');

// router imports
const authRouter = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const campaignsRouter = require('./routes/campaigns');
const automationsRouter = require('./routes/automations');
const templatesRouter = require('./routes/templates');
const webhooksRouter = require('./routes/webhooks');

const app = express();

// global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// mount api routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/templates', templatesRouter);
// Webhooks tidak perlu auth middleware (sudah di-verify via webhook token)
app.use('/api/webhooks', webhooksRouter);

// basic health routes for browser/manual checks
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'UPJ WhatsApp CRM Backend is running',
    status: 'ok',
  });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// error handler last
app.use(errorHandler);

module.exports = app;
