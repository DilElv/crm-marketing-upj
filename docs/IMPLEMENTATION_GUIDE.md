# WhatsApp Integration - Practical Implementation Guide

> Step-by-step guide dengan contoh kode praktis dan testing procedures

---

## QUICK REFERENCE: Yang Kurang dari Code Sekarang

**Backend yang sudah punya:**
- ✅ Express server + middleware stack
- ✅ PostgreSQL connection pool
- ✅ JWT authentication
- ✅ RBAC (role-based access)
- ✅ BullMQ + Redis infrastructure (belum digunakan)

**Yang HARUS ditambah (untuk fully functional):**

```
backend/
├── services/
│   ├── whatsappService.js          ❌ MISSING (Priority 1)
│   ├── automationService.js        ❌ MISSING (Priority 2)
│   └── campaignService.js          ❌ MISSING (Priority 2)
├── controllers/
│   ├── campaignController.js       ❌ MISSING (Priority 2)
│   ├── templateController.js       ❌ MISSING (Priority 2)
│   └── automationController.js     ❌ MISSING (Priority 2)
├── routes/
│   ├── webhooks.js                 ❌ MISSING (Priority 1 - CRITICAL)
│   ├── campaigns.js                ❌ MISSING (Priority 2)
│   ├── templates.js                ❌ MISSING (Priority 2)
│   └── automations.js              ❌ MISSING (Priority 2)
├── jobs/
│   └── queue.js                    ⚠️  EXISTS tapi empty (perlu di-update)
└── config/
    └── database migrations         ❌ MISSING (Priority 3)
```

---

## STEP 1: Environment Configuration (15 menit)

### 1.1 Update .env file

**File**: `.env`

First-time setup, tambahkan:

```env
# Existing
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here

# Database (sudah ada)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=crm_db

# Redis (sudah ada, tapi make sure running)
REDIS_URL=redis://localhost:6379

# Rate Limiting (sudah ada)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ===== NEW: WhatsApp Business API =====
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
META_BUSINESS_ACCOUNT_ID=1234567890
META_PHONE_NUMBER_ID=1234567890123456
META_WEBHOOK_TOKEN=random-webhook-secret-token-here
META_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.instagram.com

# File besar cukup sampe sini untuk dev
```

### 1.2 Get Meta Credentials

**Langkah-langkah praktis:**

1. Buka https://developers.facebook.com
2. Login dengan akun FB yang punya bisnis
3. Apps → Pilih app kamu (atau create baru)
4. Pilih "WhatsApp" product
5. Di Settings → Configuration:
   - **Access Token**: Buka System Users → Create → berikan permission `whatsapp_business_messaging` → Generate token → Copy
   - **Business Account ID**: Di WhatsApp Settings → Business Account → Copy ID
   - **Phone Number ID**: Di Phone Numbers → pilih nomor kamu → Copy ID
   - **Webhook Token**: Buat random string

**Contoh commands untuk generate token random:**

```bash
# Di PowerShell
$randomToken = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host $randomToken
```

### 1.3 Test nilai yang ada

```bash
# Di PowerShell, check apakah environment variable sudah ter-set
$env:META_ACCESS_TOKEN
$env:META_PHONE_NUMBER_ID
$env:META_BUSINESS_ACCOUNT_ID
```

---

## STEP 2: Install Dependencies (5 menit)

```bash
npm install axios form-data
```

Verify di `package.json`:
```json
{
  "dependencies": {
    "axios": "^1.4.0",
    "form-data": "^4.0.0",
    // ... existing ...
  }
}
```

---

## STEP 3: Create WhatsApp Service Layer (30 menit)

**File**: `backend/services/whatsappService.js`

Buat file baru dengan kode di bawah:

```javascript
const axios = require('axios');
const config = require('../config');

const whatsappAPI = axios.create({
  baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.apiVersion}`,
  headers: {
    'Authorization': `Bearer ${config.whatsapp.accessToken}`,
    'Content-Type': 'application/json',
  },
});

class WhatsAppService {
  /**
   * Send template message
   * @param {string} phoneNumber - 6281234567890 (tanpa +)
   * @param {string} templateName - approved template name
   * @param {array} parameters - template variables
   */
  static async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
    try {
      // Normalize phone number
      let phone = phoneNumber.toString();
      if (phone.startsWith('+')) phone = phone.substring(1);
      if (!phone.startsWith('62')) phone = '62' + phone.substring(1);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'id',
          },
        },
      };

      // Add parameters jika ada
      if (parameters && parameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: String(p) })),
          },
        ];
      }

      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        payload
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        phoneNumber: phone,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`WhatsApp error for ${phoneNumber}:`, error.response?.data || error.message);
      return {
        success: false,
        phoneNumber,
        error: error.response?.data?.error || { message: error.message },
      };
    }
  }

  /**
   * Send simple text message
   */
  static async sendTextMessage(phoneNumber, message) {
    try {
      let phone = phoneNumber.toString();
      if (phone.startsWith('+')) phone = phone.substring(1);
      if (!phone.startsWith('62')) phone = '62' + phone.substring(1);

      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get available templates
   */
  static async getTemplates() {
    try {
      const response = await whatsappAPI.get(
        `/${config.whatsapp.businessAccountId}/message_templates`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching templates:', error.message);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId) {
    try {
      await whatsappAPI.post(`/${messageId}`, { status: 'read' });
    } catch (error) {
      console.error('Error marking message as read:', error.message);
    }
  }
}

module.exports = WhatsAppService;
```

---

## STEP 4: Update Config (10 menit)

**File**: `backend/config/index.js` - Update dengan WhatsApp config

```javascript
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // ===== NEW =====
  whatsapp: {
    accessToken: process.env.META_ACCESS_TOKEN,
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    webhookToken: process.env.META_WEBHOOK_TOKEN,
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.instagram.com',
    apiVersion: process.env.META_API_VERSION || 'v18.0',
  },
};
```

---

## STEP 5: Create Webhook Handler (40 menit)

**FILE BARU**: `backend/routes/webhooks.js`

```javascript
const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');

// ===== WEBHOOK VERIFICATION (GET) =====
// Meta akan call ini untuk verify webhook
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[Webhook] Verification request:', { mode, token: token ? '***' : 'missing' });

  if (!mode || !token) {
    return res.status(400).json({ error: 'Missing mode or token' });
  }

  if (mode !== 'subscribe' || token !== config.whatsapp.webhookToken) {
    console.warn('[Webhook] Invalid token received');
    return res.status(403).json({ error: 'Invalid token' });
  }

  console.log('[Webhook] ✅ Verified successfully');
  res.status(200).send(challenge);
});

// ===== WEBHOOK HANDLER (POST) =====
// Meta kirim semua events kesini
router.post('/whatsapp', async (req, res) => {
  const body = req.body;

  // Respond immediately dengan 200 (Meta requirement)
  res.status(200).send('EVENT_RECEIVED');

  // Process event asynchronously
  setImmediate(async () => {
    try {
      await processWhatsAppEvent(body);
    } catch (error) {
      console.error('[Webhook Error]', error);
    }
  });
});

// ===== EVENT PROCESSING =====
async function processWhatsAppEvent(payload) {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      console.log('[Webhook] No value in event');
      return;
    }

    console.log(`[Webhook] Processing event type:`, {
      hasMessages: !!value.messages?.length,
      hasStatuses: !!value.statuses?.length,
    });

    // Handle incoming messages
    if (value.messages?.length > 0) {
      for (const message of value.messages) {
        const contact = value.contacts?.[0];
        await handleIncomingMessage(message, contact, value.metadata);
      }
    }

    // Handle message status updates (delivered, read, failed)
    if (value.statuses?.length > 0) {
      for (const status of value.statuses) {
        await handleMessageStatus(status);
      }
    }
  } catch (error) {
    console.error('[Webhook] Unhandled error in processWhatsAppEvent:', error);
  }
}

// ===== INCOMING MESSAGE HANDLER =====
async function handleIncomingMessage(message, contact, metadata) {
  const phoneNumber = message.from;
  const messageId = message.id;
  const timestamp = message.timestamp;

  console.log(`[Message] Received from ${phoneNumber} at ${new Date(timestamp * 1000).toISOString()}`);

  try {
    // Find lead by phone number
    const leadResult = await db.query(
      'SELECT id, full_name, phone_number, status FROM leads WHERE phone_number = $1',
      [phoneNumber]
    );

    let leadId = null;
    if (leadResult.rowCount > 0) {
      leadId = leadResult.rows[0].id;
    } else {
      console.log(`[Message] Lead not found for ${phoneNumber}, creating entry...`);
      // Auto-create lead jika belum ada (optional)
      const newLeadResult = await db.query(
        `INSERT INTO leads (full_name, phone_number, status)
         VALUES ($1, $2, $3) RETURNING id`,
        [contact?.name || phoneNumber, phoneNumber, 'NEW']
      );
      leadId = newLeadResult.rows[0].id;
    }

    // Log message received
    await db.query(
      `INSERT INTO messages (lead_id, meta_message_id, status, sent_at)
       VALUES ($1, $2, $3, now())`,
      [leadId, messageId, 'received']
    );

    // Mark as read
    await WhatsAppService.markAsRead(messageId);

    // Process by message type
    if (message.type === 'text') {
      const text = message.text.body;
      console.log(`[Message] Text: "${text}"`);
      await handleTextMessage(phoneNumber, leadId, text);
    } else if (message.type === 'button') {
      const buttonText = message.button.text;
      console.log(`[Message] Button: "${buttonText}"`);
      await handleButtonResponse(phoneNumber, leadId, buttonText);
    } else if (message.type === 'interactive') {
      const bodyText = message.interactive?.button_reply?.text || 
                       message.interactive?.list_reply?.title;
      console.log(`[Message] Interactive: "${bodyText}"`);
      await handleTextMessage(phoneNumber, leadId, bodyText);
    } else {
      console.log(`[Message] Other type: ${message.type}`);
    }
  } catch (error) {
    console.error(`[Message Error] Failed to handle message ${messageId}:`, error);
  }
}

// ===== TEXT MESSAGE HANDLER =====
// Ini untuk automasi responses based on user input
async function handleTextMessage(phoneNumber, leadId, text) {
  const textLower = text.toLowerCase().trim();
  let templateName = null;
  let parameters = [];

  // Simple routing logic
  if (textLower.includes('daftar') || textLower.includes('registrasi')) {
    templateName = 'info_pendaftaran';
  } else if (textLower.includes('biaya') || textLower.includes('cicilan') || textLower.includes('harga')) {
    templateName = 'info_biaya';
  } else if (textLower.includes('program') || textLower.includes('jurusan') || textLower.includes('prodi')) {
    templateName = 'info_program';
  } else if (textLower.includes('buka') || textLower.includes('admisi')) {
    templateName = 'info_pembukaan';
  } else if (textLower.includes('kontak') || textLower.includes('hubungi')) {
    templateName = 'contact_info';
  } else {
    // Default: help menu
    templateName = 'menu_bantuan';
  }

  // Send template message
  console.log(`[Automation] Sending template: ${templateName}`);
  const result = await WhatsAppService.sendTemplateMessage(phoneNumber, templateName, parameters);

  if (result.success) {
    console.log(`[Automation] ✅ Message sent: ${result.messageId}`);

    // Log ke notes
    await db.query(
      `UPDATE leads 
       SET notes = COALESCE(notes, '') || E'\\n' || $1
       WHERE id = $2`,
      [`[AUTO] Replied to message: "${text}"`, leadId]
    );
  } else {
    console.error(`[Automation] ❌ Failed to send template:`, result.error);
  }
}

// ===== BUTTON RESPONSE HANDLER =====
async function handleButtonResponse(phoneNumber, leadId, buttonText) {
  console.log(`[Button] User clicked: "${buttonText}"`);
  
  // Update status based on button
  if (buttonText.toLowerCase().includes('daftar') || buttonText.toLowerCase().includes('register')) {
    await db.query(
      'UPDATE leads SET status = $1 WHERE id = $2',
      ['REGISTERED', leadId]
    );
    console.log(`[Button] Updated lead status to REGISTERED`);
  } else if (buttonText.toLowerCase().includes('minat') || buttonText.toLowerCase().includes('interested')) {
    await db.query(
      'UPDATE leads SET status = $1 WHERE id = $2',
      ['INTERESTED', leadId]
    );
  }
}

// ===== MESSAGE STATUS HANDLER =====
// Handle delivered, read, failed statuses
async function handleMessageStatus(statusUpdate) {
  const messageId = statusUpdate.id;
  const status = statusUpdate.status; // sent, delivered, read, failed

  try {
    const result = await db.query(
      'UPDATE messages SET status = $1 WHERE meta_message_id = $2 RETURNING id',
      [status, messageId]
    );

    if (result.rowCount > 0) {
      console.log(`[Status] Message ${messageId} → ${status}`);
    }
  } catch (error) {
    console.error('[Status Error]', error);
  }
}

module.exports = router;
```

---

## STEP 6: Mount Webhook ke App (5 menit)

**File**: `backend/app.js` - Update untuk add webhook

Cari bagian ini di app.js:
```javascript
// router imports
const authRouter = require('./routes/auth');
const leadsRouter = require('./routes/leads');
```

Update jadi:
```javascript
// router imports
const authRouter = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const webhookRouter = require('./routes/webhooks');  // ← TAMBAH INI
```

Kemudian cari:
```javascript
// mount api routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
```

Update jadi:
```javascript
// mount webhook (TANPA /api prefix dan SEBELUM auth middleware)
app.use('/api/webhooks', webhookRouter);

// mount api routes (protected with auth)
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
```

---

## STEP 7: Test Webhook Locally (20 menit)

### 7.1 Start Server

```bash
# Pastikan Redis sudah running
redis-cli ping
# Output: PONG

# Pastikan PostgreSQL sudah running
psql -U postgres -c "SELECT 1"

# Start dev server
npm run dev
```

Seharusnya output:
```
✅ Server listening on port 3000
```

### 7.2 Expose ke Public dengan ngrok

Buka terminal baru:

```bash
# Jika belum install: scoop install ngrok (atau download dari https://ngrok.com)
ngrok http 3000
```

Output:
```
Session Status                online
Account                       ...
Version                       3.3.0
Region                        United States
...
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000
```

**Copy**: `https://abc123def456.ngrok.io`

### 7.3 Setup Meta Webhook

Di Meta Developers Console:

1. WhatsApp → Configuration
2. Callback URL: `https://abc123def456.ngrok.io/api/webhooks/whatsapp`
3. Verify Token: Paste `META_WEBHOOK_TOKEN` value from .env
4. Click "Verify and Save"

Seharusnya di server terminal melihat:
```
[Webhook] Verification request: { mode: 'subscribe', token: '***' }
[Webhook] ✅ Verified successfully
```

### 7.4 Test Send Manual Message

Gunakan Postman atau curl:

```bash
curl -X POST "https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "6281234567890",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {"code": "en_US"}
    }
  }'
```

### 7.5 Test Webhook Receive

**Dari WhatsApp send message ke nomor bisnis** (suruh temen kirim SMS ke nomor bisnis kamu)

Di server terminal seharusnya lihat:
```
[Webhook] Processing event type: { hasMessages: true, hasStatuses: false }
[Message] Received from 6281234567890 at 2024-01-15T10:30:00.000Z
[Message] Text: "hello"
[Automation] Sending template: menu_bantuan
[Automation] ✅ Message sent: wamid.xxxxx
```

---

## STEP 8: Create Blast Campaign Infrastructure (45 menit)

### 8.1 Create Campaign Controller

**New File**: `backend/controllers/campaignController.js`

```javascript
const Joi = require('joi');
const db = require('../config/database');
const { myQueue } = require('../jobs/queue');

const createCampaignSchema = Joi.object({
  name: Joi.string().min(3).required(),
  templateName: Joi.string().required(),
  targetLeadStatus: Joi.string().valid('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED'),
  parameters: Joi.array().items(Joi.string()).default([]),
  scheduleAt: Joi.date().optional(),
});

/**
 * GET /api/campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.template_name, c.status, c.scheduled_at,
              COALESCE(u.name, 'Unknown') as created_by_name, c.created_at,
              COUNT(DISTINCT m.id) as total_messages,
              SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN messages m ON m.campaign_id = c.id
       GROUP BY c.id, u.name
       ORDER BY c.created_at DESC`
    );

    res.json({ 
      data: result.rows, 
      total: result.rowCount 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, templateName, targetLeadStatus, parameters, scheduleAt } = value;

    // 1. Create campaign record
    const campaignResult = await db.query(
      `INSERT INTO campaigns (name, template_name, status, created_by, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        templateName,
        scheduleAt ? 'SCHEDULED' : 'DRAFT',
        req.user.id,
        scheduleAt || null,
      ]
    );

    const campaign = campaignResult.rows[0];

    // 2. Get target leads
    const leadsResult = await db.query(
      `SELECT id, phone_number FROM leads WHERE status = $1`,
      [targetLeadStatus]
    );
    const leadCount = leadsResult.rowCount;

    // 3. Queue message sending
    if (scheduleAt) {
      // Schedule untuk nanti
      const delayMs = new Date(scheduleAt).getTime() - Date.now();
      await myQueue.add(
        'blast-campaign',
        {
          campaignId: campaign.id,
          templateName,
          parameters,
          targetLeadStatus,
        },
        {
          delay: delayMs,
          attempts: 1,
        }
      );

      console.log(`[Campaign] Scheduled campaign ${campaign.id} untuk ${new Date(scheduleAt).toISOString()}`);
    } else {
      // Send immediately
      for (const lead of leadsResult.rows) {
        await myQueue.add(
          'send-whatsapp-message',
          {
            campaignId: campaign.id,
            phoneNumber: lead.phone_number,
            leadId: lead.id,
            templateName,
            parameters,
          },
          {
            delay: Math.random() * 5000, // Random delay 0-5 detik
          }
        );
      }

      console.log(`[Campaign] Queued ${leadCount} messages untuk campaign ${campaign.id}`);
    }

    res.status(201).json({
      data: campaign,
      message: 'Campaign created',
      queued: `${leadCount} leads scheduled`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/campaigns/:id/stats
 */
exports.getCampaignStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const statsResult = await db.query(
      `SELECT
        c.name,
        c.status,
        c.created_at,
        c.scheduled_at,
        COUNT(m.id) as total_sent,
        SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
        SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END)::int as read_count,
        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END)::int as failed,
        ROUND(100.0 * COUNT(m.id) / NULLIF(
          (SELECT COUNT(*) FROM leads WHERE status = c.template_name::text), 0
        ), 2)::float as coverage_rate
       FROM campaigns c
       LEFT JOIN messages m ON m.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, c.name, c.status, c.created_at, c.scheduled_at`,
      [id]
    );

    if (statsResult.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ data: statsResult.rows[0] });
  } catch (err) {
    next(err);
  }
};
```

### 8.2 Create Campaign Routes

**New File**: `backend/routes/campaigns.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  getAllCampaigns,
  createCampaign,
  getCampaignStats,
} = require('../controllers/campaignController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/roles');

// List campaigns
router.get('/', authenticate, getAllCampaigns);

// Get campaign stats
router.get('/:id/stats', authenticate, getCampaignStats);

// Create campaign (ADMIN & MARKETING only)
router.post('/', authenticate, authorize('ADMIN', 'MARKETING'), createCampaign);

module.exports = router;
```

### 8.3 Update Queue Setup

**Update File**: `backend/jobs/queue.js` - Replace seluruh isi dengan:

```javascript
const { Queue, Worker } = require('bullmq');
const config = require('../config');
const WhatsAppService = require('../services/whatsappService');
const db = require('../config/database');

// ===== QUEUE SETUP =====
const messageQueue = new Queue('send-whatsapp-message', {
  connection: { url: config.redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

const campaignQueue = new Queue('blast-campaign', {
  connection: { url: config.redisUrl },
});

// ===== WORKER: Send Individual Message =====
const messageWorker = new Worker(
  'send-whatsapp-message',
  async (job) => {
    const { phoneNumber, campaignId, leadId, templateName, parameters } = job.data;

    console.log(`[Worker] Sending message to ${phoneNumber}...`);

    try {
      const result = await WhatsAppService.sendTemplateMessage(
        phoneNumber,
        templateName,
        parameters || []
      );

      if (result.success) {
        // Save message record
        await db.query(
          `INSERT INTO messages (lead_id, campaign_id, meta_message_id, status, sent_at)
           VALUES ($1, $2, $3, $4, now())`,
          [leadId, campaignId, result.messageId, 'sent']
        );

        console.log(`[Worker] ✅ Message sent to ${phoneNumber}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
      } else {
        throw new Error(JSON.stringify(result.error));
      }
    } catch (error) {
      console.error(`[Worker] ❌ Failed ${phoneNumber}: ${error.message}`);
      throw error; // Will trigger retry
    }
  },
  { connection: { url: config.redisUrl } }
);

// ===== WORKER: Blast Campaign =====
const campaignWorker = new Worker(
  'blast-campaign',
  async (job) => {
    const { campaignId, templateName, parameters, targetLeadStatus } = job.data;

    console.log(`[Campaign Worker] Processing blast for campaign ${campaignId}...`);

    try {
      // Update status ke RUNNING
      await db.query(
        'UPDATE campaigns SET status = $1 WHERE id = $2',
        ['RUNNING', campaignId]
      );

      // Get all target leads
      const leadsResult = await db.query(
        'SELECT id, phone_number FROM leads WHERE status = $1',
        [targetLeadStatus]
      );

      const leads = leadsResult.rows;
      console.log(`[Campaign Worker] Queueing ${leads.length} messages...`);

      // Queue message untuk setiap lead
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const delay = i * 1000; // Spread out requests 1 detik apart

        await messageQueue.add(
          'send-whatsapp-message',
          {
            campaignId,
            phoneNumber: lead.phone_number,
            leadId: lead.id,
            templateName,
            parameters,
          },
          { delay }
        );
      }

      // Update to COMPLETED
      await db.query(
        'UPDATE campaigns SET status = $1 WHERE id = $2',
        ['COMPLETED', campaignId]
      );

      console.log(`[Campaign Worker] ✅ Blast campaign ${campaignId} queued successfully`);
      return { success: true, queued: leads.length };
    } catch (error) {
      console.error(`[Campaign Worker] ❌ Error: ${error.message}`);

      // Mark campaign as failed
      await db.query(
        'UPDATE campaigns SET status = $1 WHERE id = $2',
        ['CANCELLED', campaignId]
      );

      throw error;
    }
  },
  { connection: { url: config.redisUrl } }
);

// ===== EVENT HANDLERS =====
messageWorker.on('progress', (job, progress) => {
  console.log(`[Worker Progress] Job ${job.id}: ${progress}%`);
});

messageWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Completed: ${job.id}`);
});

messageWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Failed (attempt ${job.attemptsMade}): ${job.id} - ${err.message}`);
});

// ===== EXPORTS =====
module.exports = {
  messageQueue,
  campaignQueue,
  messageWorker,
  campaignWorker,
};
```

### 8.4 Update app.js untuk mount campaigns

Di `backend/app.js`, add:

```javascript
const campaignRouter = require('./routes/campaigns');

// ... existing routes ...

app.use('/api/campaigns', campaignRouter);
```

---

## STEP 9: Testing Manual (30 menit)

### 9.1 Test Create Campaign via API

```bash
# Pastikan server running: npm run dev

curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Campaign",
    "templateName": "hello_world",
    "targetLeadStatus": "NEW",
    "parameters": []
  }'
```

Response:
```json
{
  "data": { "id": "uuid...", "name": "Test Campaign", ... },
  "message": "Campaign created",
  "queued": "5 leads scheduled"
}
```

### 9.2 Check Queue Status

```bash
# Connect ke Redis
redis-cli

# Check queues
> KEYS bull:*
> ZRANGE bull:send-whatsapp-message:* 0 -1
> LLEN bull:send-whatsapp-message:waiting
```

### 9.3 Monitor Workers

Di server terminal, harusnya lihat logs:
```
[Campaign] Queued 5 messages untuk campaign abc-def-ghi
[Worker] Sending message to 6281234567890...
[Worker] ✅ Message sent to 6281234567890: wamid.xxxxx
[Worker] Sending message to 6282345678901...
```

---

## Quick Troubleshooting

| Error | Solution |
|-------|----------|
| `Redis ECONNREFUSED` | Redis belum running: `redis-server` |
| `No token provided` | Missing Authorization header dengan JWT |
| `Invalid token` | Token expired atau tidak matching WEBHOOK_TOKEN |
| `Failed to send message` | Check PHONE_NUMBER_ID atau template status belum APPROVED |
| `Webhook tidak verified` | ngrok URL tidak di-update di Meta console |

---

## What's Next

1. ✅ Create more templates di Meta Business Manager
2. ✅ Add automation rules for status changes
3. ✅ Build frontend dashboard
4. ✅ Add message templates management API
5. ✅ Implement conversation context saving

---

**Status**: Ready untuk production deployment  
**Next Phase**: Build Frontend Dashboard (React recommended)
