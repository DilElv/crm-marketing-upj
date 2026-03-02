const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiration: process.env.JWT_EXPIRATION || '1h',
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  whatsapp: {
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    accessToken: process.env.META_ACCESS_TOKEN,
    webhookToken: process.env.META_WEBHOOK_TOKEN,
    apiVersion: process.env.META_API_VERSION || 'v18.0',
    senderPhoneNumber: process.env.META_SENDER_PHONE_NUMBER,
    webhookTimeout: parseInt(process.env.META_WEBHOOK_TIMEOUT, 10) || 5000,
  },
};
