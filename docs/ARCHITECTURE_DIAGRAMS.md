# Architecture & Data Flow Diagrams

> Visual representation dari WhatsApp CRM integration architecture

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                        WhatsApp CRM Integration Architecture             │
│                                                                           │
│  External Services              Node.js Backend                Database   │
│  ──────────────────              ──────────────                ────────   │
│                                                                           │
│  ┌──────────────┐               ┌─────────────────────┐               │
│  │              │               │                     │               │
│  │    Meta      │◄─────────────►│ Express Server      │               │
│  │  WhatsApp    │     https     │  (Port 3000)        │               │
│  │ Cloud API    │               │                     │               │
│  │              │               └──────────┬──────────┘               │
│  └──────────────┘                          │                          │
│                                            │                          │
│   ┌──────────────┐              ┌─────────▼────────┐               │
│   │              │              │                  │               │
│   │   Webhook    │◄────────────►│  Webhook Route   │               │
│   │  (incoming   │   POST       │ /webhooks/       │               │
│   │  messages)   │              │ whatsapp         │               │
│   │              │              │                  │               │
│   └──────────────┘              └─────────┬────────┘               │
│                                            │                       │
│                                  ┌─────────▼──────────┐           │
│                                  │                    │           │
│                                  │  Service Layer     │           │
│                                  │                    │           │
│                                  │ • WhatsApp Service │           │
│                                  │ • Campaign Service │           │
│                                  │ • Automation       │           │
│                                  │   Service          │           │
│                                  │                    │           │
│                                  └─────────┬──────────┘           │
│                                            │                     │
│                        ┌───────────────────┼───────────────┐    │
│                        │                   │               │    │
│                  ┌─────▼────┐      ┌──────▼────┐    ┌─────▼──┐ │
│                  │           │      │           │    │        │ │
│                  │  Redis    │      │  BullMQ   │    │  Logs  │ │
│                  │  Cache &  │      │  Job      │    │        │ │
│                  │  Broker   │      │  Queue    │    │        │ │
│                  │           │      │           │    │        │ │
│                  └─────┬────┘      └──┬───┬────┘    └────────┘ │
│                        │              │   │                      │
│                  ┌─────▼──────────────▼───▼────┐                 │
│                  │                              │                 │
│                  │  Message Worker              │                 │
│                  │  (send-whatsapp-message)    │                 │
│                  │                              │                 │
│                  └─────┬───────────────────────┘                 │
│                        │                                          │
│                        │                          ┌──────────┐   │
│                        └─────────►PostgreSQL ◄───►│  Lead    │   │
│                                   Database        │ Status   │   │
│                                                    │ History  │   │
│                                   ┌─────────────┐  │          │   │
│                                   │             │  │ Messages │   │
│                                   │    Tables   │  │          │   │
│                                   │             │  │ Campaigns│   │
│                                   │ • users     │  └──────────┘   │
│                                   │ • leads     │                  │
│                                   │ • messages  │      ┌────────┐  │
│                                   │ • campaigns │      │Frontend│  │
│                                   │ • automations       │API    │  │
│                                   │             │      │Calls  │  │
│                                   └─────────────┘      └────────┘  │
│                                                                     │
│  Frontend (React/Vue)                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━                                           │
│                                                                     │
│  User Dashboard ──[HTTP/REST]──► Express Server (Port 3000)      │
│                                                                     │
│  • Campaign Management                                              │
│  • Lead Management                                                  │
│  • Analytics Dashboard                                              │
│  • Template Editor                                                  │
│  • Automation Builder                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📤 Message Send Flow

```
User Creates Campaign
       │
       ▼
┌──────────────────────────┐
│  POST /api/campaigns     │
│  {                       │
│    name: "Test Blast"    │
│    templateName: "hello" │
│    targetStatus: "NEW"   │
│  }                       │
└──────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  campaignController.createCampaign()     │
│                                          │
│  1. Validate request (Joi)               │
│  2. Create campaign record in DB         │
│  3. Get target leads from DB             │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Queue Individual Messages               │
│                                          │
│  for each lead {                         │
│    messageQueue.add({                    │
│      campaignId: xxx,                    │
│      phoneNumber: "628xxx",              │
│      templateName: "hello"               │
│    })                                    │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  BullMQ Job Queue (Redis)                │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Queue: send-whatsapp-message    │   │
│  │ waiting: 50 jobs                │   │
│  │ processing: 5 jobs              │   │
│  │ completed: 1000 jobs            │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  messageWorker (processing)              │
│                                          │
│  for each job {                          │
│    1. Extract phoneNumber, template      │
│    2. Call WhatsAppService.send()        │
│    3. Get messageId from Meta response   │
│    4. Save to DB: messages table         │
│    5. Mark job complete or retry         │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Meta WhatsApp API                       │
│                                          │
│  POST /v18.0/{phoneNumberId}/messages    │
│  Authorization: Bearer {token}           │
│  {                                       │
│    to: "628xxx",                         │
│    type: "template",                     │
│    template: {                           │
│      name: "hello_world",                │
│      language: { code: "en_US" }         │
│    }                                     │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  WhatsApp Servers                        │
│                                          │
│  1. Validate message                     │
│  2. Queue for delivery                   │
│  3. Return messageId to Backend          │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  User's WhatsApp App                     │
│  (if online)                             │
│                                          │
│  Message appears in chat                 │
│  Status: "sent"                          │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  User Interaction                        │
│                                          │
│  User opens message:                     │
│  Status update: "delivered"              │
│                                          │
│  User reads message:                     │
│  Status update: "read"                   │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Meta Webhook Callback                   │
│                                          │
│  POST /api/webhooks/whatsapp             │
│  {                                       │
│    entry: [{                             │
│      changes: [{                         │
│        value: {                          │
│          statuses: [{                    │
│            id: "messageId",              │
│            status: "delivered"           │
│          }]                              │
│        }                                 │
│      }]                                  │
│    }]                                    │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  handleMessageStatus()                   │
│                                          │
│  UPDATE messages                         │
│  SET status = 'delivered'                │
│  WHERE meta_message_id = 'xxx'           │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Dashboard Updated                       │
│                                          │
│  Campaign Stats:                         │
│  - Sent: 50                              │
│  - Delivered: 45                         │
│  - Read: 30                              │
│  - Failed: 0                             │
│  - Delivery Rate: 90%                    │
└──────────────────────────────────────────┘
```

---

## 📥 Incoming Message & Automation Flow

```
User Sends Message to Business Number
       │
       ▼
┌──────────────────────────────────────────┐
│  WhatsApp Servers                        │
│  (user's message arrives)                │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Meta Webhook POST                       │
│  /api/webhooks/whatsapp                  │
│  {                                       │
│    messages: [{                          │
│      from: "628xxx",                     │
│      id: "wamid.xxx",                    │
│      timestamp: 1234567890,              │
│      type: "text",                       │
│      text: { body: "DAFTAR" }            │
│    }],                                   │
│    contacts: [{ name: "Ahmad" }]         │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼ (Response 200 immediately)
┌──────────────────────────────────────────┐
│  webhookRouter.post('/whatsapp')         │
│  1. Validate webhook token               │
│  2. Return 200 EVENT_RECEIVED            │
│  3. Process async in background          │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  handleIncomingMessage()                 │
│                                          │
│  1. Extract phoneNumber & message text   │
│  2. Look up lead in database             │
│  3. Create/update message record         │
│  4. Mark as read (Meta API)              │
│  5. Route to handler based on type       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  handleTextMessage()                     │
│                                          │
│  message = "DAFTAR"                      │
│                                          │
│  if message.includes('daftar')           │
│    templateName = "info_pendaftaran"     │
│  else if message.includes('biaya')       │
│    templateName = "info_biaya"           │
│  else                                    │
│    templateName = "menu_bantuan"         │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  triggerAutomations()                    │
│                                          │
│  1. Query automations table               │
│  2. Match condition: incoming_message    │
│  3. Execute action: send_message         │
│  4. Send template: info_pendaftaran      │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  WhatsAppService.sendTemplateMessage()   │
│                                          │
│  POST https://graph.instagram.com/...    │
│                                          │
│  Response: {                             │
│    messages: [{                          │
│      id: "wamid.response.xxx"            │
│    }]                                    │
│  }                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Save to Database                        │
│                                          │
│  INSERT INTO messages (                  │
│    lead_id, campaign_id,                 │
│    meta_message_id,                      │
│    status                                │
│  )                                       │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  User Receives Auto-Response             │
│                                          │
│  Template message appears                │
│  with registration information           │
│  and action buttons                      │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  User Clicks Button / Takes Action       │
│                                          │
│  Status Change: NEW → REGISTERED         │
│  (via separate API call or webhook)      │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Status Change Triggers New Automation   │
│                                          │
│  IF status changed to REGISTERED         │
│    → Send confirmation template          │
│    → Assign to sales team                │
│    → Create follow-up task               │
└──────────────────────────────────────────┘
```

---

## 🔄 Campaign Status Flow

```
┌─────────────────┐
│  DRAFT STATUS   │ (initial creation)
└────────┬────────┘
         │
    Can edit, schedule, or cancel
         │
    ┌────▼──────────────┐
    │ scheduleAt given?  │
    └────┬───────────┬──┘
         │           │
    NO  │           │ YES
        │           │
    ┌───▼───┐    ┌──▼────────────────┐
    │ DRAFT │    │ SCHEDULED STATUS   │
    │ (send │    │ (wait for time)    │
    │ now)  │    └──┬────────────────┘
    └───┬───┘       │
        │       When time arrives
        │           │
        │       ┌───▼──────────────┐
        │       │ Trigger blast job│
        │       └──┬───────────────┘
        │           │
    ┌───▼───────────▼──┐
    │ RUNNING STATUS   │
    │ (sending msgs)   │
    └────┬─────────────┘
         │
    All messages sent (or failed)
         │
    ┌────▼──────────────────┐
    │ COMPLETED STATUS       │
    │ (100% processed)       │
    └────────────────────────┘
    
Alternative paths:
- User can CANCEL at any time → status = CANCELLED
- If error occurs → status = FAILED (but can retry)
```

---

## 🗄️ Database Relationships

```
┌──────────────────┐
│      users       │
│──────────────────│
│ id (PK)          │
│ name             │
│ email (UNIQUE)   │
│ password_hash    │
│ role (FK→enum)   │
│ created_at       │
└────┬─────────────┘
     │ (1:N)
     │ assigned_to
     │
┌────▼────────────────────┐
│       leads              │
│────────────────────────  │
│ id (PK)                  │
│ full_name                │
│ phone_number (UNIQUE)    │
│ email                    │
│ status (FK→enum)         │
│ assigned_to (FK→users)   │
│ created_at               │
└────┬──────┬──────────┬───┘
     │      │          │
   (1:N)  (1:N)      (1:N)
     │      │          │
     │      │      ┌────▼──────────────────┐
     │      │      │ lead_status_history   │
     │      │      │──────────────────────  │
     │      │      │ id (PK)               │
     │      │      │ lead_id (FK→leads)    │
     │      │      │ old_status            │
     │      │      │ new_status            │
     │      │      │ changed_by (FK→users) │
     │      │      │ changed_at            │
     │      │      └──────────────────────┘
     │      │
     │      │   ┌─────────────────────┐
     │      └──►│    campaigns        │
     │          │─────────────────────│
     │          │ id (PK)             │
     │          │ name                │
     │          │ template_name       │
     │          │ status              │
     │          │ created_by (FK)     │
     │          │ scheduled_at        │
     │          │ created_at          │
     │          └──────┬──────────────┘
     │                 │ (1:N)
     │                 │
     └────────┬────────┴────────┐
              │                 │
              │             campaign_id
              │                 │
          ┌───▼─────────────────▼──────┐
          │      messages               │
          │─────────────────────────── │
          │ id (PK)                    │
          │ lead_id (FK→leads)         │
          │ campaign_id (FK→campaigns) │
          │ meta_message_id (UNIQUE)   │
          │ status                     │
          │ sent_at                    │
          └────────────────────────────┘

Other tables:
┌──────────────────┐
│   automations    │
│──────────────────│
│ id (PK)          │
│ trigger_type     │
│ condition_json   │
│ action_json      │
│ is_active        │
└──────────────────┘

┌──────────────────┐
│   audit_logs     │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ action           │
│ entity_type      │
│ entity_id        │
│ created_at       │
└──────────────────┘
```

---

## 🔐 Authentication & Authorization Flow

```
Client (Frontend)
    │
    ├──► POST /api/auth/login
    │    {
    │      "email": "user@upj.ac.id",
    │      "password": "xxxxx"
    │    }
    │
    ▼
┌──────────────────────────────┐
│  authController.login()      │
│                              │
│  1. Validate input (Joi)     │
│  2. Query user by email      │
│  3. Compare password hash    │
│  4. If valid:                │
│    - Create JWT              │
│    - Return token + user     │
│  5. If invalid:              │
│    - Return 401              │
└──────────────────────────────┘
    │
    ├──► Return {
    │      token: "eyJhbGc..."
    │      user: { id, email, role }
    │    }
    │
    ▼
Client stores token in localStorage/sessionStorage
    │
    │
    ├──► Protected request:
    │    GET /api/leads
    │    Authorization: Bearer eyJhbGc...
    │
    ▼
┌──────────────────────────────┐
│  Express Request Pipeline    │
│                              │
│  authenticate middleware     │◄─ Check Authorization header
│  ├─ Extract Bearer token    │
│  ├─ Verify JWT signature    │
│  ├─ Decode payload          │
│  ├─ Set req.user = payload  │
│  └─ Call next()             │
└──────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│  authorize middleware        │
│  (if route protected)        │
│                              │
│  Check req.user.role        │
│  ├─ If role allowed:        │
│  │  └─ Call next()          │
│  └─ If not allowed:         │
│     └─ Return 403           │
└──────────────────────────────┘
    │
    ▼
Route handler can now:
- Access req.user.id
- Access req.user.role
- Query DB on behalf of user
- Return data
```

---

## 📈 Scaling Architecture (Future)

```
Current:
┌─────────────┐
│ Single Node │
│  Express    │
│   Server    │
└─────────────┘
   (Good for <10k leads)

Medium Scale (10k-100k leads):
┌──────────────┐
│   Load       │
│  Balancer    │
│  (NGINX)     │
└──────┬───────┘
       │
    ┌──┴──┬──────┐
    │     │      │
 ┌──▼─┐┌──▼──┐┌──▼──┐
 │Node││Node ││Node │
 │ 1  ││ 2   ││ 3   │
 └────┘└─────┘└─────┘
    (All shared DB & Redis)

Large Scale (100k+ leads):
┌──────────────┐
│   Load       │
│  Balancer    │
└──────┬───────┘
       │
    ┌──┴──┬──────┐
    │     │      │
 ┌──▼──┐┌──▼──┐┌──▼──┐
 │API  ││API  ││API  │ (3 instances)
 │Node ││Node ││Node │
 └─┬──┘└──┬──┘└──┬──┘
   │      │      │
   └──────┼──────┘
          │
    ┌─────▼──────┐
    │  Database  │        Separate:
    │ Replica    │        - Read replicas
    │ (Master)   │        - Dedicated Worker Pool
    └────────────┘        - Separate Cache Layer
          ▲                - Message Queue Cluster
          │
    ┌─────▼──────────────┐
    │  Redis Cluster     │
    │  (3+ instances)    │
    └────────────────────┘
```

---

## 🎯 Workflow: Complete Customer Journey

```
┌──────────────────────────────────────────────────────────────────┐
│                   LEAD JOURNEY MAP                               │
└──────────────────────────────────────────────────────────────────┘

PHASE 1: AWARENESS
    │
    ├─► Campaign blast: "Info Pendaftaran"
    │   (sent to all NEW leads)
    │
    ├─► User receives message
    │
    └─► Status change: NEW → CONTACTED

PHASE 2: INTEREST
    │
    ├─► Automation triggers: Lead status = CONTACTED
    │
    ├─► Auto-send: "Info Biaya" template
    │
    ├─► User can click button "Lihat Detail Biaya"
    │
    └─► Status change: CONTACTED → INTERESTED

PHASE 3: ENGAGEMENT
    │
    ├─► User sends message: "Mau daftar"
    │
    ├─► Webhook receives incoming message
    │
    ├─► Automation matches keyword "daftar"
    │
    ├─► Auto-reply: "Info Pendaftaran" template
    │
    ├─► Admin notified about lead interest
    │
    └─► Admin can manually take over chat

PHASE 4: CONVERSION
    │
    ├─► User fills registration form
    │
    ├─► Status change: INTERESTED → REGISTERED
    │
    ├─► Automation triggers: Send "Konfirmasi Pendaftaran"
    │
    ├─► Team assigns follow-up task
    │
    └─► User receives payment instructions

PHASE 5: RETENTION
    │
    ├─► Automation triggers: Send updates
    │
    ├─► Team can send periodic information
    │
    └─► Track all interactions in conversation history

┌──────────────────────────────────────────────────────────────────┐
│ SUCCESS METRICS                                                   │
│                                                                   │
│ • Messages sent: 1000                                            │
│ • Delivery rate: 95%                                            │
│ • Open rate: 60%                                                │
│ • Conversion rate: 15%                                          │
│ • Response time: < 2 seconds (auto-reply)                      │
│ • Support ticket reduction: 40%                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Data Flow: From User Input to Database

```
┌──────────────────────────────────────────────────────────────────┐
│ Example: User creates campaign to send "info_biaya" template    │
└──────────────────────────────────────────────────────────────────┘

STEP 1: User fills form
  ┌────────────────────────────────────────────┐
  │  Campaign Dashboard (Frontend)              │
  │                                            │
  │  Name: "Biaya Penawaran Maret"            │
  │  Template: "info_biaya"                    │
  │  Target Status: "INTERESTED"               │
  │  Send: [Now]                               │
  │                                            │
  │  [SEND CAMPAIGN] button                    │
  └────────────────────────────────────────────┘

STEP 2: Frontend validation & API call
  ┌────────────────────────────────────────────┐
  │ POST /api/campaigns                         │
  │ Content-Type: application/json             │
  │ Authorization: Bearer {JWT}                │
  │                                            │
  │ Body:                                      │
  │ {                                          │
  │   "name": "Biaya Penawaran Maret",       │
  │   "templateName": "info_biaya",           │
  │   "targetLeadStatus": "INTERESTED",     │
  │   "parameters": [],                       │
  │   "scheduleAt": null                      │
  │ }                                          │
  └────────────────────────────────────────────┘

STEP 3: Backend receives & validates
  ┌────────────────────────────────────────────┐
  │ campaignController.createCampaign()        │
  │                                            │
  │ 1. Joi schema validation                   │
  │ 2. Auth check (user authenticated)         │
  │ 3. RBAC check (ADMIN or MARKETING role)   │
  └────────────────────────────────────────────┘

STEP 4: Database transactions
  ┌────────────────────────────────────────────┐
  │ INSERT INTO campaigns                      │
  │ (name, template_name, status, created_by) │
  │ VALUES (...)                               │
  │ RETURNING *                                │
  │                                            │
  │ Result: campaignId = "abc-123-def"        │
  └────────────────────────────────────────────┘

STEP 5: Query target leads
  ┌────────────────────────────────────────────┐
  │ SELECT id, phone_number FROM leads         │
  │ WHERE status = 'INTERESTED'                │
  │                                            │
  │ Result: 45 leads found                    │
  └────────────────────────────────────────────┘

STEP 6: Queue jobs
  ┌────────────────────────────────────────────┐
  │ for each lead {                            │
  │   messageQueue.add({                       │
  │     campaignId: "abc-123-def",            │
  │     phoneNumber: lead.phone_number,       │
  │     leadId: lead.id,                      │
  │     templateName: "info_biaya",           │
  │     parameters: []                        │
  │   })                                       │
  │ }                                          │
  │                                            │
  │ Result: 45 jobs queued in Redis           │
  └────────────────────────────────────────────┘

STEP 7: Return response to frontend
  ┌────────────────────────────────────────────┐
  │ 201 Created                                │
  │ {                                          │
  │   "data": {                                │
  │     "id": "abc-123-def",                  │
  │     "name": "Biaya Penawaran Maret",    │
  │     "status": "DRAFT",                    │
  │     ...                                   │
  │   },                                       │
  │   "message": "Campaign created",          │
  │   "queued": "45 leads scheduled"          │
  │ }                                          │
  └────────────────────────────────────────────┘

STEP 8: Frontend shows success
  ┌────────────────────────────────────────────┐
  │ ✅ Campaign "Biaya Penawaran Maret" sent  │
  │                                            │
  │ Stats:                                     │
  │ • Total: 45                                │
  │ • Queued: 45                               │
  │ • Sent: 0 (still processing)               │
  │ • Status: DRAFT/RUNNING                   │
  └────────────────────────────────────────────┘

STEP 9-N: Worker processes jobs
  [Happens in background, over several seconds/minutes]
  
  Job 1 of 45:
    → WhatsAppService.sendTemplateMessage()
    → Meta API returns messageId
    → INSERT INTO messages (meta_message_id, status='sent')
    → ✅ Complete
  
  Job 2 of 45:
    → (same process)
  
  ... Jobs 3-45 ...

STEP N+1: Dashboard updates live
  (via polling or WebSocket)
  
  Campaign Stats Updated:
  • Total: 45
  • Sent: 45 ✅
  • Delivered: 35
  • Read: 21
  • Failed: 0
  • Delivery Rate: 97.8%
```

---

**Last Updated**: March 3, 2026  
**Version**: 1.0  
**Status**: Complete Architecture Documentation ✅
