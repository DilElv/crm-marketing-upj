# WhatsApp CRM Complete Implementation Setup Guide

## Overview
Your WhatsApp CRM backend is now **fully implemented** with all features from Phase 1-4. This guide walks you through setup, configuration, and testing.

## What's Been Built

### Core Components ✅
1. **WhatsApp Service Layer** (`backend/services/whatsappService.js`)
   - Sends template messages
   - Manages templates on Meta
   - Handles media uploads
   - Phone number normalization

2. **Webhook Handler** (`backend/routes/webhooks.js`)
   - Receives incoming messages from WhatsApp
   - Tracks message status (sent, delivered, read)
   - Auto-creates leads from incoming messages
   - Integrates with automation engine

3. **Campaign System** (`backend/controllers/campaignController.js`)
   - Create blast campaigns
   - Schedule campaigns for later
   - Track delivery statistics
   - Target leads by status

4. **Message Queue** (`backend/jobs/queue.js`)
   - Async message sending via BullMQ
   - Bulk campaign processing with rate limiting
   - Automatic retry logic
   - Event logging for debugging

5. **Automation Engine** (`backend/controllers/automationController.js`)
   - Trigger-based message sending
   - Keyword detection
   - Lead status auto-update
   - Multi-action workflows

6. **Template Management** (`backend/controllers/templateController.js`)
   - Sync templates from Meta
   - Create new templates
   - Test templates before sending

## Prerequisites

### System Requirements
- Node.js 14+ and npm
- PostgreSQL 12+ (running locally)
- Redis (running locally)

### Environment Setup

1. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb whatsapp_crm
   
   # Apply schema
   psql whatsapp_crm < schema.sql
   ```

2. **Redis Setup**
   ```bash
   # If using Docker
   docker run -d -p 6379:6379 redis
   
   # Or if installed locally
   redis-server
   ```

3. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Create .env file** (copy from .env.example)
   ```bash
   cp .env.example .env
   ```

## Configuration

### 1. Fill .env File

```ini
# Basic config
PORT=3000
NODE_ENV=development

# Database (choose your credentials)
DB_HOST=localhost
DB_PORT=5432
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_NAME=whatsapp_crm

# JWT
JWT_SECRET=your-very-long-random-secret-key-here
JWT_EXPIRATION=1h

# Redis (local default)
REDIS_URL=redis://localhost:6379

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ============================================
# META WHATSAPP API (MUST FILL BEFORE TESTING)
# ============================================
META_BUSINESS_ACCOUNT_ID=123456789012345
META_PHONE_NUMBER_ID=9876543210123
META_ACCESS_TOKEN=Bearer_token_from_meta_api
META_WEBHOOK_TOKEN=your-custom-webhook-token-random-string

META_API_VERSION=v18.0
META_SENDER_PHONE_NUMBER=6281234567890
META_WEBHOOK_TIMEOUT=5000
```

### 2. Get Meta WhatsApp API Credentials

**Step 1: Create Meta Business Account**
- Go to https://business.facebook.com
- Create a Business Account if you don't have one

**Step 2: Create WhatsApp Business Account**
- In Business Account settings → Apps
- Create or select your app
- Add WhatsApp product
- Create WhatsApp Business Account

**Step 3: Get Required IDs**
- **Business Account ID**: Dashboard → Settings → Business Account
- **Phone Number ID**: WhatsApp product → Phone numbers (register or link number)
- **Access Token**: Dashboard → API tokens → Generate (needs whatsapp_business_messaging permission)
- **Webhook Token**: Create random token yourself (e.g., `openssl rand -base64 32`)

**Step 4: Configure Webhook in Meta**
- WhatsApp → Configuration → Webhooks
- Set callback URL: `https://yourdomain.com/api/webhooks/whatsapp`
- Verify token: `META_WEBHOOK_TOKEN` from your .env
- Subscribe to events: messages, message_status, message_template_status_update

## Starting the Application

### Development Mode
```bash
cd backend
npm start
```

Should see:
```
Server running on port 3000
Connected to PostgreSQL
Redis connected
```

### Check Health
```bash
curl http://localhost:3000/
# Should return: { message: "UPJ WhatsApp CRM Backend is running", status: "ok" }
```

## API Testing

### 1. User Authentication

```bash
# Register new user
POST /api/auth/register
{
  "name": "John Marketing",
  "email": "john@upj.ac.id",
  "password": "SecurePassword123!",
  "role": "MARKETING"
}

# Login (get JWT token)
POST /api/auth/login
{
  "email": "john@upj.ac.id",
  "password": "SecurePassword123!"
}
# Response: { token: "eyJhbGc..." }

# Use token in all requests
Header: Authorization: Bearer <token>
```

### 2. Create First Lead

```bash
POST /api/leads
Content-Type: application/json
Authorization: Bearer <token>

{
  "full_name": "Budi Santoso",
  "phone_number": "6281234567890",
  "email": "budi@example.com",
  "school_origin": "SMA Negeri 1 Jakarta",
  "city": "Jakarta",
  "program_interest": "Teknik Informatika",
  "lead_source": "Instagram Ad"
}
# Response: { id: "uuid...", status: "NEW", ... }
```

### 3. Create Automation Rule

```bash
POST /api/automations
Authorization: Bearer <token>

{
  "name": "Auto-reply Pendaftaran",
  "triggerType": "INCOMING_MESSAGE",
  "conditions": {
    "keywords": ["daftar", "registrasi", "register"]
  },
  "action": {
    "type": "send_message",
    "templateName": "info_pendaftaran",
    "parameters": []
  },
  "enabled": true
}
```

### 4. Create Blast Campaign

```bash
POST /api/campaigns
Authorization: Bearer <token>

{
  "name": "Spring Intake Program",
  "templateName": "welcome_message",
  "targetLeadStatus": "CONTACTED",
  "parameters": [],
  "scheduleAt": "2024-02-15T09:00:00Z"
}

# Or immediately (no scheduleAt):
{
  "name": "Urgent Update",
  "templateName": "urgent_notification",
  "parameters": [],
  "scheduleAt": null
}
```

Check campaign status:
```bash
GET /api/campaigns
GET /api/campaigns/{id}/stats
```

### 5. Sync Templates from Meta

```bash
GET /api/templates/meta/sync
Authorization: Bearer <token>

# Returns all templates from Meta account
```

### 6. Create New Template

```bash
POST /api/templates
Authorization: Bearer <token>

{
  "name": "custom_promotion",
  "category": "MARKETING",
  "language": "id",
  "components": [
    {
      "type": "BODY",
      "text": "Dapatkan diskon {{1}}% untuk program {{2}}!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Lihat Penawaran",
          "url": "https://upj.ac.id/promo"
        }
      ]
    }
  ]
}
```

### 7. Test Template

```bash
POST /api/templates/{templateName}/test
Authorization: Bearer <token>

{
  "phoneNumber": "6281234567890",
  "parameters": ["20", "Teknik Informatika"]
}
```

## Testing Flow

### Complete End-to-End Test

1. **Setup** (5 min)
   - [ ] Database schema applied
   - [ ] Redis running
   - [ ] .env file filled with Meta credentials
   - [ ] Backend server running

2. **Create Test Data** (5 min)
   ```bash
   # Terminal 1: Create leads and automations
   curl -X POST http://localhost:3000/api/leads ...
   curl -X POST http://localhost:3000/api/automations ...
   ```

3. **Test Incoming Message** (10 min)
   - Send message to your WhatsApp number from another phone
   - Watch logs: automation triggers automatically
   - Check database: lead auto-created and messages logged

4. **Test Blast Campaign** (15 min)
   ```bash
   # Terminal 1: Create campaign
   curl -X POST http://localhost:3000/api/campaigns ...
   
   # Terminal 2: Watch queue processing
   npm run queue  # Shows jobs being processed
   
   # Verify: Check dashboard for delivery stats
   ```

5. **Monitor Webhooks** (5 min)
   - Send message from WhatsApp
   - Check logs for: message received, automation triggered, response sent
   - Verify status updates (sent→delivered→read)

## Database Monitoring

```bash
# Connect to database
psql whatsapp_crm

# Useful queries
SELECT * FROM leads;
SELECT * FROM messages WHERE lead_id = 'uuid';
SELECT * FROM automations;
SELECT * FROM campaigns;
SELECT COUNT(*) as total_sent FROM messages WHERE status = 'delivered';
```

## Troubleshooting

### Issue: "Cannot connect to Redis"
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### Issue: "Cannot connect to PostgreSQL"
```bash
# Verify database exists
psql -l | grep whatsapp_crm

# Create if missing
createdb whatsapp_crm
psql whatsapp_crm < schema.sql
```

### Issue: "Invalid Meta Access Token"
- Go to Meta Business Dashboard
- Check token hasn't expired
- Verify permissions include: whatsapp_business_messaging, whatsapp_business_account_access
- Generate new token if needed

### Issue: "Webhook verification failed"
- Check `META_WEBHOOK_TOKEN` matches in Meta settings
- Verify domain is publicly accessible (use ngrok for local testing)
- Check logs: `[Webhook] Invalid token received`

### Issue: "Messages not sending"
```bash
# Check queue jobs
curl http://localhost:3000/api/campaigns  # View queue status
# Check Redis queue
redis-cli -n 0 LLEN bull:send-whatsapp-message:jobs
```

## Next Steps

1. **Frontend Dashboard** (Phase 5)
   - Create React dashboard to display leads and campaigns
   - Real-time message tracking with WebSockets
   - Campaign analytics

2. **Advanced Automations**
   - Time-based triggers
   - Conditional workflows
   - Lead scoring

3. **Integration**
   - CRM data syncing
   - Payment gateway integration
   - Email fallback notifications

4. **Production Deployment**
   - SSL certificates
   - Rate limiting tuning
   - Database backups
   - Redis persistence

## Key Features Summary

| Feature | Status | Endpoint |
|---------|--------|----------|
| User Auth | ✅ | `/api/auth/register`, `/api/auth/login` |
| Lead Management | ✅ | `/api/leads` (CRUD + history) |
| Blast Campaigns | ✅ | `/api/campaigns` (create, schedule, stats) |
| Message Queue | ✅ | BullMQ async processing |
| Automations | ✅ | `/api/automations` (trigger-based) |
| Webhooks | ✅ | `/api/webhooks/whatsapp` (incoming messages) |
| Template Management | ✅ | `/api/templates` (sync, create, test) |
| Message Tracking | ✅ | Status: sent/delivered/read/failed |

## Support

For issues or questions:
1. Check logs: `npm start` shows detailed error messages
2. Verify .env configuration (especially Meta credentials)
3. Check PostgreSQL schema applied correctly
4. Ensure Redis is running
5. Check database connection with `psql whatsapp_crm`

## File Structure

```
backend/
├── app.js (main Express app with route mounting)
├── server.js (HTTP server entry point)
├── config/
│   ├── database.js (PostgreSQL pool)
│   └── index.js (environment config)
├── controllers/
│   ├── authController.js (authentication)
│   ├── leadsController.js (lead CRUD)
│   ├── campaignController.js (campaign management)
│   ├── automationController.js (automation engine)
│   └── templateController.js (template management)
├── routes/
│   ├── auth.js
│   ├── leads.js
│   ├── campaigns.js
│   ├── automations.js
│   ├── templates.js
│   └── webhooks.js
├── services/
│   └── whatsappService.js (Meta API wrapper)
├── middlewares/
│   ├── auth.js (JWT verification)
│   ├── roles.js (RBAC)
│   ├── logger.js (request logging)
│   ├── rateLimiter.js (rate limiting)
│   └── errorHandler.js (error handling)
├── jobs/
│   └── queue.js (BullMQ workers)
└── package.json
```

---

**Last Updated**: 2024
**Version**: 1.0 - All Features Implemented
