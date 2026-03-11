# WhatsApp Business API Integration Roadmap

> Panduan lengkap integrasi Meta WhatsApp Business API dengan CRM Marketing UPJ  
> Mencakup setup, konfigurasi, dan implementasi Blast & Automation features

---

## 📋 ASSESSMENT: Gap Analysis Dari Code Saat Ini

### ✅ Yang Sudah Ada (Foundation Solid)
1. **Authentication & Authorization** - JWT + RBAC siap
2. **Lead Management** - CRUD lengkap + status tracking
3. **Database Schema** - Sudah termasuk tables untuk messages & campaigns
4. **Job Queue Infrastructure** - BullMQ + Redis setup (tapi belum digunakan)
5. **Error Handling & Logging** - Winston + Morgan siap
6. **Rate Limiting & Security** - Helmet, CORS, bcrypt

### ❌ Yang Kurang (Required untuk WhatsApp Integration)

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| WhatsApp Webhook Handler | ❌ Missing | CRITICAL | 🔴 High |
| Message Templates Management | ❌ Missing | CRITICAL | 🔴 High |
| Message Sending Service | ❌ Missing | CRITICAL | 🔴 High |
| Webhook Verification (Meta) | ❌ Missing | CRITICAL | 🟠 Medium |
| Conversation/Chat Management | ❌ Missing | HIGH | 🟠 Medium |
| Blast Campaign Processor | ❌ Missing | HIGH | 🟠 Medium |
| Message Status Callback Handler | ❌ Missing | HIGH | 🔵 Low |
| Automation Rules Engine | ❌ Missing | MEDIUM | 🔴 High |
| Message Statistics/Analytics | ❌ Missing | MEDIUM | 🔵 Low |
| WhatsApp Configuration Service | ❌ Missing | CRITICAL | 🔵 Low |
| Frontend (React/Vue) | ❌ Missing | HIGH | 🔴 Very High |
| Message Template Validator | ❌ Missing | MEDIUM | 🔵 Low |
| Conversation State Management | ❌ Missing | MEDIUM | 🟠 Medium |

---

## 🎯 STEP-BY-STEP IMPLEMENTATION ROADMAP

### **PHASE 1: Meta WhatsApp Business API Setup**
**Duration**: ~2-3 jam  
**Responsibility**: Developer + Meta Account Owner

#### Step 1.1: Prepare Meta/Facebook Account
- [ ] Business Account sudah punya? Jika tidak, buat di https://business.facebook.com
- [ ] Buat App di Meta Developers (https://developers.facebook.com)
  - Go to Apps → Create App → Select "Business" type
  - Name: "UPJ WhatsApp CRM"
- [ ] Add WhatsApp product
  - In App Dashboard → Add Products → Search "WhatsApp" → Add

#### Step 1.2: Get Required Credentials
```
Kamu butuh catat ini di .env nanti:

META_ACCESS_TOKEN          = Dari Business Account Settings
META_BUSINESS_ACCOUNT_ID   = ID dari business account
META_PHONE_NUMBER_ID       = ID dari nomor WhatsApp bisnis
META_WEBHOOK_TOKEN         = Kamu buat sendiri (random string)
```

**Cara dapetin:**

1. **Access Token**: 
   - Buka App Settings → Users and Apps → Generate System User Access Token
   - Jangan lupa tambahkan permission: whatsapp_business_messaging, whatsapp_business_account_access

2. **Phone Number ID**:
   - Di WhatsApp Product Settings → Phone Numbers → Akan ada nomor bisnis
   - Copy ID-nya (format: 1234567890123456)

3. **Webhook Token** (buat sendiri):
   ```bash
   # Di PowerShell atau bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

#### Step 1.3: Setup WhatsApp Webhook
- Di WhatsApp Product Settings → Configuration
- Set Callback URL: `https://yourdomain.com/api/webhooks/whatsapp`
  - Untuk dev local, gunakan **ngrok** atau **tunneling service**
  
    ```bash
    # Install ngrok (https://ngrok.com)
    ngrok http 3000
    # Output: https://abc123.ngrok.io → gunakan ini sebagai callback URL
    ```

- Set Verify Token: Copy dari `META_WEBHOOK_TOKEN` yang kamu buat
- Subscribe to Webhooks:
  - ✅ messages
  - ✅ message_status
  - ✅ message_template_status_update
  - ✅ phone_number_quality_update

---

### **PHASE 2: Backend Infrastructure (Backend Modifications)**
**Duration**: ~4-5 jam

#### Step 2.1: Add WhatsApp Dependencies
```bash
npm install axios form-data
```

**Penjelasan**:
- `axios`: HTTP client untuk call Meta API
- `form-data`: Untuk upload template dengan attachment

#### Step 2.2: Update Environment Variables
**File**: `.env`

```env
# WhatsApp Business API
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_BUSINESS_ACCOUNT_ID=1234567890
META_PHONE_NUMBER_ID=1234567890123456
META_WEBHOOK_TOKEN=your-random-webhook-secret-here
META_API_VERSION=v18.0

# WhatsApp Config
WHATSAPP_WEBHOOK_PATH=/api/webhooks/whatsapp
WHATSAPP_API_URL=https://graph.instagram.com

# Feature Flags
ENABLE_WHATSAPP_AUTOMATION=true
ENABLE_BLAST_CAMPAIGNS=true
```

**File**: `.env.example`
```env
# Repeat semua di atas
```

#### Step 2.3: Create WhatsApp Service Layer
**New File**: `backend/services/whatsappService.js`

```javascript
const axios = require('axios');
const config = require('../config');

const whatsappAPI = axios.create({
  baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.apiVersion}`,
  headers: {
    'Authorization': `Bearer ${config.whatsapp.accessToken}`,
  },
});

class WhatsAppService {
  /**
   * Send WhatsApp message to single recipient
   * @param {string} phoneNumber - Recipient phone with country code (e.g., 6281234567890)
   * @param {string} templateName - Template name from Meta
   * @param {object} parameters - Template variables
   * @returns {Promise<object>} Message response with message ID
   */
  static async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
    try {
      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'id',
            },
            components: parameters.length > 0 ? [
              {
                type: 'body',
                parameters: parameters.map(p => ({ type: 'text', text: p })),
              },
            ] : undefined,
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        phoneNumber,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        phoneNumber,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Send text message (hanya untuk template message yang sudah approved)
   */
  static async sendTextMessage(phoneNumber, message) {
    try {
      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
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
   * Get template list
   */
  static async getTemplates() {
    try {
      const response = await whatsappAPI.get(
        `/${config.whatsapp.businessAccountId}/message_templates`
      );
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
  }

  /**
   * Create message template
   */
  static async createTemplate(name, category, components) {
    try {
      const response = await whatsappAPI.post(
        `/${config.whatsapp.businessAccountId}/message_templates`,
        {
          name,
          category, // MARKETING, UTILITY, AUTHENTICATION
          components,
          language: 'id', // Indonesia
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Mark message as read (for received messages)
   */
  static async markAsRead(messageId) {
    try {
      await whatsappAPI.post(`/${messageId}`, {
        status: 'read',
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error.message);
    }
  }

  /**
   * Get message media (untuk received media)
   */
  static async getMedia(mediaId) {
    try {
      const response = await whatsappAPI.get(`/${mediaId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch media: ${error.message}`);
    }
  }
}

module.exports = WhatsAppService;
```

#### Step 2.4: Create Webhook Handler
**New File**: `backend/routes/webhooks.js`

```javascript
const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../config/database');
const WhatsAppService = require('../services/whatsappService');

/**
 * Webhook verification dari Meta
 * GET /api/webhooks/whatsapp
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) {
    return res.status(400).json({ error: 'Missing mode or token' });
  }

  if (mode !== 'subscribe' || token !== config.whatsapp.webhookToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  res.status(200).send(challenge);
});

/**
 * Webhook untuk menerima messages dan status updates
 * POST /api/webhooks/whatsapp
 */
router.post('/whatsapp', async (req, res) => {
  const body = req.body;

  // Meta requirement: respond dengan 200 immediately
  res.status(200).send('EVENT_RECEIVED');

  // Process asynchronously
  setImmediate(async () => {
    try {
      await processWhatsAppEvent(body);
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
    }
  });
});

async function processWhatsAppEvent(payload) {
  const entry = payload.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value) return;

  // Handle incoming messages
  if (value.messages?.length > 0) {
    for (const message of value.messages) {
      await handleIncomingMessage(message, value.contacts?.[0]);
    }
  }

  // Handle message status updates
  if (value.statuses?.length > 0) {
    for (const status of value.statuses) {
      await handleMessageStatus(status);
    }
  }
}

async function handleIncomingMessage(message, contact) {
  const phoneNumber = message.from;
  const messageId = message.id;

  try {
    // Catat message di database
    await db.query(
      `INSERT INTO messages (lead_id, meta_message_id, status, sent_at)
       SELECT id, $1, $2, now() FROM leads WHERE phone_number = $3
       ON CONFLICT DO NOTHING`,
      [messageId, 'received', phoneNumber]
    );

    // Process berdasarkan type message
    if (message.type === 'text') {
      const text = message.text.body;
      await handleTextMessage(phoneNumber, text);
    } else if (message.type === 'button') {
      const buttonText = message.button.text;
      await handleButtonResponse(phoneNumber, buttonText);
    }

    // Mark sebagai read
    await WhatsAppService.markAsRead(messageId);
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

async function handleTextMessage(phoneNumber, text) {
  // Implementasi automasi berbasis text
  // Contoh: Jika user kirim "INFO" → kirim template "info_pembukaan"
  
  const textLower = text.toLowerCase().trim();

  let templateName = null;
  let parameters = [];

  // Mapping text ke template
  if (textLower.includes('pendaftaran') || textLower.includes('registrasi')) {
    templateName = 'info_pendaftaran';
  } else if (textLower.includes('biaya') || textLower.includes('cicilan')) {
    templateName = 'info_biaya';
  } else if (textLower.includes('program') || textLower.includes('jurusan')) {
    templateName = 'info_program';
  } else if (textLower.includes('buka')) {
    templateName = 'info_pembukaan';
  } else {
    // Default: send help text
    templateName = 'menu_bantuan';
  }

  if (templateName) {
    const result = await WhatsAppService.sendTemplateMessage(
      phoneNumber,
      templateName,
      parameters
    );

    // Log interaction
    await db.query(
      `UPDATE leads SET notes = concat(COALESCE(notes, ''), '\\n', $1)
       WHERE phone_number = $2`,
      [`[${new Date().toISOString()}] Chat received: "${text}"`, phoneNumber]
    );
  }
}

async function handleButtonResponse(phoneNumber, buttonText) {
  // Handle template button responses
  // Contoh: Lead klik button "Daftar Sekarang" → update status ke REGISTERED
  
  if (buttonText.includes('Daftar')) {
    await db.query(
      `UPDATE leads SET status = 'REGISTERED' WHERE phone_number = $1`,
      [phoneNumber]
    );
  }
}

async function handleMessageStatus(statusUpdate) {
  const messageId = statusUpdate.id;
  const status = statusUpdate.status; // sent, delivered, read, failed

  try {
    await db.query(
      `UPDATE messages SET status = $1 WHERE meta_message_id = $2`,
      [status, messageId]
    );
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

module.exports = router;
```

#### Step 2.5: Mount Webhook Route
**File**: `backend/app.js` - Update untuk include webhook

```javascript
// ... existing imports ...
const webhookRouter = require('./routes/webhooks');

// ... existing middleware ...

// Mount webhook route (BEFORE auth middleware)
app.use('/api/webhooks', webhookRouter);

// Mount API routes (protected)
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);

// ... rest of app.js ...
```

#### Step 2.6: Update Config
**File**: `backend/config/index.js`

```javascript
module.exports = {
  // ... existing config ...
  
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

### **PHASE 3: Blast Campaign Feature**
**Duration**: ~3-4 jam

#### Step 3.1: Create Blast Campaign Controller
**New File**: `backend/controllers/campaignController.js`

```javascript
const Joi = require('joi');
const db = require('../config/database');
const { myQueue } = require('../jobs/queue');

const createCampaignSchema = Joi.object({
  name: Joi.string().required(),
  templateName: Joi.string().required(),
  targetLeadStatus: Joi.string().valid('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP'),
  parameters: Joi.array().items(Joi.string()),
  scheduleAt: Joi.date().optional(),
});

/**
 * GET /api/campaigns - List semua campaigns
 */
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.template_name, c.status, c.scheduled_at,
              c.created_by, u.name as created_by_name, c.created_at,
              COUNT(m.id) as sent_count
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN messages m ON m.campaign_id = c.id
       GROUP BY c.id, u.id
       ORDER BY c.created_at DESC`
    );

    res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns - Create campaign baru
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, templateName, targetLeadStatus, parameters, scheduleAt } = value;

    // Create campaign record
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

    // Get target leads
    let query = `SELECT id, phone_number FROM leads WHERE status = $1`;
    const params = [targetLeadStatus];

    if (scheduleAt) {
      // Schedule untuk dikirim kemudian (via BullMQ)
      await myQueue.add(
        'blast-campaign',
        {
          campaignId: campaign.id,
          templateName,
          parameters,
          targetLeadStatus,
        },
        {
          delay: new Date(scheduleAt).getTime() - Date.now(),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );
    } else {
      // Send immediately
      const leadsResult = await db.query(query, params);
      const leads = leadsResult.rows;

      for (const lead of leads) {
        await myQueue.add('send-whatsapp', {
          campaignId: campaign.id,
          phoneNumber: lead.phone_number,
          leadId: lead.id,
          templateName,
          parameters,
        });
      }
    }

    res.status(201).json({
      data: campaign,
      message: 'Campaign created',
      queued: scheduleAt ? 'scheduled' : 'queued for sending',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/campaigns/:id - Update campaign
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ data: result.rows[0], message: 'Campaign updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/campaigns/:id/stats - Get campaign statistics
 */
exports.getCampaignStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stats = await db.query(
      `SELECT
        c.name,
        c.status,
        COUNT(m.id) as total_sent,
        SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(100.0 * SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) / 
              NULLIF(COUNT(m.id), 0), 2) as delivery_rate
       FROM campaigns c
       LEFT JOIN messages m ON m.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, c.name, c.status`,
      [id]
    );

    if (stats.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ data: stats.rows[0] });
  } catch (err) {
    next(err);
  }
};
```

#### Step 3.2: Create Campaign Routes
**New File**: `backend/routes/campaigns.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  getCampaignStats,
} = require('../controllers/campaignController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/roles');

// GET all campaigns
router.get('/', authenticate, getAllCampaigns);

// GET campaign stats
router.get('/:id/stats', authenticate, getCampaignStats);

// POST create campaign (ADMIN, MARKETING)
router.post('/', authenticate, authorize('ADMIN', 'MARKETING'), createCampaign);

// PUT update campaign (ADMIN, MARKETING)
router.put('/:id', authenticate, authorize('ADMIN', 'MARKETING'), updateCampaign);

module.exports = router;
```

#### Step 3.3: Update app.js untuk mount campaign routes
```javascript
const campaignRouter = require('./routes/campaigns');

app.use('/api/campaigns', campaignRouter);
```

---

### **PHASE 4: BullMQ Worker Configuration**
**Duration**: ~2 jam

#### Step 4.1: Create Workers
**Update File**: `backend/jobs/queue.js`

```javascript
const { Queue, Worker } = require('bullmq');
const config = require('../config');
const WhatsAppService = require('../services/whatsappService');
const db = require('../config/database');

const myQueue = new Queue('default', {
  connection: { url: config.redisUrl },
});

// ===== WORKER: Send Single WhatsApp Message =====
const sendMessageWorker = new Worker('send-whatsapp', async (job) => {
  const { phoneNumber, campaignId, leadId, templateName, parameters } = job.data;

  try {
    const result = await WhatsAppService.sendTemplateMessage(
      phoneNumber,
      templateName,
      parameters || []
    );

    if (result.success) {
      // Insert into messages table
      await db.query(
        `INSERT INTO messages (lead_id, campaign_id, meta_message_id, status, sent_at)
         VALUES ($1, $2, $3, $4, now())`,
        [leadId, campaignId, result.messageId, 'sent']
      );

      return { success: true, messageId: result.messageId };
    } else {
      // Jika gagal, akan di-retry otomatis oleh BullMQ
      throw new Error(JSON.stringify(result.error));
    }
  } catch (error) {
    console.error(`Failed to send message to ${phoneNumber}:`, error.message);
    throw error; // Trigger retry
  }
},
{ connection: { url: config.redisUrl } });

// ===== WORKER: Blast Campaign Processor =====
const blastWorker = new Worker('blast-campaign', async (job) => {
  const { campaignId, templateName, parameters, targetLeadStatus } = job.data;

  try {
    // Update campaign status
    await db.query(
      `UPDATE campaigns SET status = 'RUNNING' WHERE id = $1`,
      [campaignId]
    );

    // Get all target leads
    const leadsResult = await db.query(
      `SELECT id, phone_number FROM leads WHERE status = $1`,
      [targetLeadStatus]
    );

    const leads = leadsResult.rows;
    console.log(`Starting blast to ${leads.length} leads for campaign ${campaignId}`);

    // Queue message untuk setiap lead
    for (const lead of leads) {
      await myQueue.add(
        'send-whatsapp',
        {
          campaignId,
          phoneNumber: lead.phone_number,
          leadId: lead.id,
          templateName,
          parameters,
        },
        {
          delay: Math.random() * 2000, // Randomize untuk avoid rate limit
        }
      );
    }

    // Update campaign status
    await db.query(
      `UPDATE campaigns SET status = 'COMPLETED' WHERE id = $1`,
      [campaignId]
    );

    return { success: true, totalQueued: leads.length };
  } catch (error) {
    await db.query(
      `UPDATE campaigns SET status = 'CANCELLED' WHERE id = $1`,
      [campaignId]
    );
    throw error;
  }
},
{ connection: { url: config.redisUrl } });

// ===== EVENT LISTENERS =====
sendMessageWorker.on('completed', (job) => {
  console.log(`✅ Message sent: ${job.id}`);
});

sendMessageWorker.on('failed', (job, err) => {
  console.error(`❌ Message failed: ${job.id} - ${err.message}`);
});

blastWorker.on('completed', (job) => {
  console.log(`✅ Blast campaign completed: ${job.id}`);
});

module.exports = { myQueue, sendMessageWorker, blastWorker };
```

#### Step 4.2: Update server.js untuk initialize workers
```javascript
const app = require('./app');
const config = require('./config');
require('./jobs/queue'); // Initialize workers

const server = app.listen(config.port, () => {
  console.log(`✅ Server listening on port ${config.port}`);
  console.log(`✅ BullMQ workers initialized and listening...`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  server.close();
  process.exit(0);
});
```

---

### **PHASE 5: Automation Rules Engine**
**Duration**: ~3 jam

#### Step 5.1: Create Automation Controller
**New File**: `backend/controllers/automationController.js`

```javascript
const Joi = require('joi');
const db = require('../config/database');
const { myQueue } = require('../jobs/queue');
const WhatsAppService = require('../services/whatsappService');

/**
 * Trigger automations untuk given event
 * Dijalankan oleh event handlers atau scheduler
 */
exports.triggerAutomations = async (triggerType, eventData) => {
  try {
    // Get all active automations untuk trigger type ini
    const automations = await db.query(
      `SELECT * FROM automations 
       WHERE trigger_type = $1 AND is_active = true`,
      [triggerType]
    );

    for (const automation of automations.rows) {
      const condition = automation.condition_json;
      const action = automation.action_json;

      // Check if condition matches
      if (matchesCondition(condition, eventData)) {
        // Execute action
        await executeAction(action, eventData);
      }
    }
  } catch (error) {
    console.error('Error triggering automations:', error);
  }
};

function matchesCondition(condition, eventData) {
  // Simple condition matching logic
  // Bisa dikembang dengan logic lebih kompleks nanti
  
  for (const [key, expectedValue] of Object.entries(condition)) {
    if (eventData[key] !== expectedValue) {
      return false;
    }
  }
  return true;
}

async function executeAction(action, eventData) {
  const { action: type, ...params } = action;

  switch (type) {
    case 'send_message':
      // Send template message to lead
      await WhatsAppService.sendTemplateMessage(
        eventData.phoneNumber,
        params.templateName,
        params.parameters || []
      );
      break;

    case 'update_status':
      // Update lead status
      await db.query(
        `UPDATE leads SET status = $1 WHERE phone_number = $2`,
        [params.newStatus, eventData.phoneNumber]
      );
      break;

    case 'assign_to_user':
      // Assign lead to user
      await db.query(
        `UPDATE leads SET assigned_to = $1 WHERE phone_number = $2`,
        [params.userId, eventData.phoneNumber]
      );
      break;

    case 'queue_task':
      // Queue background task
      await myQueue.add(params.taskName, params.taskData);
      break;

    case 'send_notification':
      // Send internal notification (untuk implementasi nanti)
      console.log('Notification:', params.message);
      break;

    default:
      console.warn(`Unknown action type: ${type}`);
  }
}

/**
 * POST /api/automations - Create automation rule
 */
exports.createAutomation = async (req, res, next) => {
  try {
    const { triggerType, condition, action, isActive } = req.body;

    const result = await db.query(
      `INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [triggerType, condition, action, isActive !== false]
    );

    res.status(201).json({
      data: result.rows[0],
      message: 'Automation rule created',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/automations - List automations
 */
exports.listAutomations = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM automations ORDER BY created_at DESC`
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/automations/:id - Update automation
 */
exports.updateAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { triggerType, condition, action, isActive } = req.body;

    const result = await db.query(
      `UPDATE automations 
       SET trigger_type = $1, condition_json = $2, action_json = $3, is_active = $4
       WHERE id = $5
       RETURNING *`,
      [triggerType, condition, action, isActive, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/automations/:id
 */
exports.deleteAutomation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM automations WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json({ message: 'Automation deleted' });
  } catch (err) {
    next(err);
  }
};
```

#### Step 5.2: Integrate Automations ke Webhook
**Update File**: `backend/routes/webhooks.js`

Tambahkan di function `handleTextMessage`:

```javascript
const { triggerAutomations } = require('../controllers/automationController');

async function handleTextMessage(phoneNumber, text) {
  // ... existing code ...
  
  // Trigger automations based on incoming message
  await triggerAutomations('incoming_message', {
    phoneNumber,
    messageText: text,
  });
  
  // ... rest of code ...
}
```

#### Step 5.3: Integrasi dengan Lead Status Update
**Update File**: `backend/controllers/leadsController.js`

Di function `updateLead`, setelah status berubah:

```javascript
const { triggerAutomations } = require('./automationController');

// ... dalam updateLead(), setelah status update ...

if (statusChanged) {
  // Insert history
  await client.query(
    `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [updatedLead.id, oldStatus, updatedLead.status, req.user?.id || null]
  );

  // Trigger automations
  const leadData = await client.query(
    'SELECT phone_number FROM leads WHERE id = $1',
    [updatedLead.id]
  );
  
  await triggerAutomations('lead_status_changed', {
    leadId: updatedLead.id,
    phoneNumber: leadData.rows[0].phone_number,
    oldStatus,
    newStatus: updatedLead.status,
  });
}
```

---

### **PHASE 6: Message Templates Management**
**Duration**: ~2 jam

#### Step 6.1: Create Templates Controller
**New File**: `backend/controllers/templateController.js`

```javascript
const Joi = require('joi');
const WhatsAppService = require('../services/whatsappService');
const db = require('../config/database');

/**
 * GET /api/templates - Sync templates dari Meta
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await WhatsAppService.getTemplates();

    // Bisa di-cache di database untuk reference
    res.json({
      data: templates,
      message: 'Templates fetched from Meta',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/templates - Create template di Meta
 * 
 * Template structure untuk MARKETING campaign:
 * {
 *   "name": "info_pendaftaran",
 *   "category": "MARKETING",
 *   "components": [
 *     {
 *       "type": "HEADER",
 *       "format": "TEXT",
 *       "text": "Informasi Pendaftaran"
 *     },
 *     {
 *       "type": "BODY",
 *       "text": "Halo {{1}},\n\nKami ingin memberitahu bahwa pendaftaran {{2}} telah dibuka.\n\nLink pendaftaran: {{3}}"
 *     },
 *     {
 *       "type": "FOOTER",
 *       "text": "Universitas Pembangunan Jaya"
 *     },
 *     {
 *       "type": "BUTTONS",
 *       "buttons": [
 *         {
 *           "type": "URL",
 *           "text": "Daftar Sekarang",
 *           "url": "https://upj.ac.id/daftar"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { name, category, components } = req.body;

    const result = await WhatsAppService.createTemplate(name, category, components);

    res.status(201).json({
      data: result,
      message: 'Template created on Meta',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/templates/test - Test send template
 * Digunakan untuk testing sebelum blast
 */
exports.testTemplate = async (req, res, next) => {
  try {
    const { templateName, phoneNumber, parameters } = req.body;

    if (!templateName || !phoneNumber) {
      return res.status(400).json({
        message: 'templateName and phoneNumber required',
      });
    }

    const result = await WhatsAppService.sendTemplateMessage(
      phoneNumber,
      templateName,
      parameters || []
    );

    if (!result.success) {
      return res.status(400).json({
        message: 'Test send failed',
        error: result.error,
      });
    }

    res.json({
      message: 'Template test sent successfully',
      messageId: result.messageId,
    });
  } catch (err) {
    next(err);
  }
};
```

#### Step 6.2: Create Templates Routes
**New File**: `backend/routes/templates.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  getTemplates,
  createTemplate,
  testTemplate,
} = require('../controllers/templateController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/roles');

// GET templates (ADMIN, MARKETING)
router.get('/', authenticate, authorize('ADMIN', 'MARKETING'), getTemplates);

// POST create template (ADMIN only)
router.post('/', authenticate, authorize('ADMIN'), createTemplate);

// POST test send template (ADMIN, MARKETING)
router.post('/test', authenticate, authorize('ADMIN', 'MARKETING'), testTemplate);

module.exports = router;
```

#### Step 6.3: Mount Templates Routes
**File**: `backend/app.js`

```javascript
const templateRouter = require('./routes/templates');

app.use('/api/templates', templateRouter);
```

---

### **PHASE 7: Database Enhancements**
**Duration**: ~1 jam

#### Step 7.1: Add columns untuk tracking
**New SQL migrations** - `migrations/007_enhance_messages.sql`:

```sql
-- Add columns untuk richer tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS
  template_name TEXT;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS
  parameters JSONB;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS
  error_details JSONB;

-- Add table untuk conversation context
CREATE TABLE IF NOT EXISTS conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_context_lead_id 
  ON conversation_context(lead_id);

-- Add table untuk message templates cache
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- MARKETING, UTILITY, AUTHENTICATION
  meta_status TEXT, -- APPROVED, PENDING_REVIEW, REJECTED
  components JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_name 
  ON message_templates(name);
CREATE INDEX IF NOT EXISTS idx_message_templates_category 
  ON message_templates(category);
```

---

## 📅 TIMELINE IMPLEMENTASI LENGKAP

| Phase | Task | Duration | Total |
|-------|------|----------|-------|
| **1** | Meta API Setup | 2-3 jam | **2-3 jam** |
| **2** | Backend Infrastructure | 4-5 jam | **6-8 jam** |
| **3** | Blast Campaigns | 3-4 jam | **9-12 jam** |
| **4** | BullMQ Workers | 2 jam | **11-14 jam** |
| **5** | Automations Engine | 3 jam | **14-17 jam** |
| **6** | Templates Management | 2 jam | **16-19 jam** |
| **7** | Database Enhancements | 1 jam | **17-20 jam** |
| **8** | Testing & Debug | 3-4 jam | **20-24 jam** |
| **9** | Frontend Development | 8-10 jam | **28-34 jam** |
| **10** | Deployment | 2-3 jam | **30-37 jam** |

**Total Estimated Time**: ~30-37 jam (~4-5 hari kerja intensive)

---

## 🚀 QUICK START CHECKLIST

**Sebelum mulai implementasi:**

- [ ] Sudah punya Meta Business Account
- [ ] Sudah ada WhatsApp Business Number teregistrasi
- [ ] Redis server sudah running
- [ ] PostgreSQL sudah running dengan schema.sql
- [ ] Node.js v16+ terinstall
- [ ] npm packages sudah install

**Implementasi order:**

1. ✅ Phase 1 & 2: Webhook + Service Layer (hari 1)
2. ✅ Phase 3 & 4: Campaigns + Workers (hari 2)
3. ✅ Phase 5 & 6: Automations + Templates (hari 2-3)
4. ✅ Phase 7: Database updates (hari 3)
5. ✅ Testing: Comprehensive testing (hari 4)
6. ✅ Frontend: Dashboard untuk manage campaigns (hari 5+)

---

## 🔑 KEY POINTS

### Security Considerations
✅ Validate semua webhook requests dari Meta
✅ Use HTTPS untuk production
✅ Keep Meta Access Token di environment variables
✅ Rate limiting untuk prevent abuse
✅ Validate phone numbers sebelum send

### Performance Optimization
✅ BullMQ batching untuk efficient sending
✅ Connection pooling di PostgreSQL
✅ Caching templates di database
✅ Proper indexing untuk queries
✅ Async processing dengan workers

### Best Practices
✅ Test templates sebelum blast
✅ Monitor message delivery rates
✅ Keep conversation history
✅ Implement proper error handling
✅ Log semua activities untuk audit trail

---

## 📚 USEFUL LINKS

- **Meta WhatsApp API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **BullMQ Docs**: https://docs.bullmq.io/
- **Redis Documentation**: https://redis.io/documentation
- **Webhooks Best Practices**: https://webhook.cool/

---

**Status**: Ready untuk implementasi  
**Last Updated**: March 3, 2026  
**Next Step**: Start Phase 1 - Setup Meta WhatsApp Business API
