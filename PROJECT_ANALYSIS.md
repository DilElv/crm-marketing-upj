# CRM Marketing UPJ - Comprehensive Project Analysis

**Project:** WhatsApp CRM Marketing Platform  
**Organization:** Universitas Pembangunan Jaya (UPJ)  
**Tech Stack:** Node.js/Express + React + PostgreSQL + Redis + BullMQ  
**Date:** March 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow & Integration](#data-flow--integration)
6. [Key Features Explained](#key-features-explained)
7. [Database Schema](#database-schema)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Configuration & Environment](#configuration--environment)
10. [Dependencies & Technology Stack](#dependencies--technology-stack)

---

## Project Overview

### Purpose

CRM Marketing UPJ is an enterprise-grade Customer Relationship Management (CRM) platform specifically designed for WhatsApp marketing campaigns targeting university prospects. It enables marketing teams to:

- Manage leads efficiently with rich attributes (contact info, program interest, education background)
- Create and execute WhatsApp marketing campaigns at scale
- Import leads from various sources (CSV, Google Forms, Google Sheets)
- Automate marketing workflows and follow-ups
- Track campaign performance with real-time analytics
- Generate reports on message delivery and engagement

### Core Value Proposition

- **Bulk WhatsApp Messaging:** Send templated WhatsApp messages to thousands of leads via Meta's Cloud API
- **Lead Management:** Store and organize university prospect information
- **Campaign Automation:** Schedule campaigns and set up automated workflows
- **Analytics:**Track message delivery rates, read status, and campaign ROI
- **Role-Based Access Control:** Support for ADMIN, MARKETING, CS (Customer Service), and SALES roles

---

## Architecture & Structure

### High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│                    External Services                         │
│                    ─────────────────                         │
│                  Meta WhatsApp Cloud API                    │
│                  (Send messages, webhooks)                  │
│                                                               │
┌───────────────────────────────────────────────────────────────┐
│                                                                │
│  Frontend (React SPA)              Backend (Express Node.js)  │
│  ─────────────────────────         ─────────────────────────  │
│  - Dashboard                       - API Routes               │
│  - Campaign Manager                - Controllers (MVC)        │
│  - Lead Manager                    - Services (Business Logic)│
│  - Analytics                       - Middleware               │
│  - Forms & Charts                  - Database Connection      │
│  - Authentication                  - Job Queue (BullMQ)       │
│                                                                │
└───────────────────────────────────────────────────────────────┘
         │                                          │
         │ REST API (HTTP/JSON)                  │
         │◄────────────────────────────────────►│
         │                                          │
    ┌────▼──────────────────────────────────────────▼────┐
    │                                                      │
    │  Storage & Queuing Layer                           │
    │  ──────────────────────────                         │
    │                                                      │
    │  ┌──────────────┐    ┌─────────────┐  ┌──────────┐ │
    │  │ PostgreSQL   │    │   Redis     │  │   Logs   │ │
    │  │ Database     │    │   Cache &   │  │          │ │
    │  │              │    │   Message   │  │  Winston │ │
    │  │ - Users      │    │   Queue     │  │          │ │
    │  │ - Leads      │    │             │  │          │ │
    │  │ - Campaigns  │    │  BullMQ Job │  │          │ │
    │  │ - Messages   │    │  Queue      │  │          │ │
    │  │ - Templates  │    │             │  │          │ │
    │  │ - Automations│    │             │  │          │ │
    │  └──────────────┘    └─────────────┘  └──────────┘ │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

### Folder Structure

```
crm-marketing-upj/
├── backend/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── config/
│   │   ├── index.js           # Environment configuration
│   │   └── database.js        # PostgreSQL pool & migrations
│   ├── controllers/           # Business logic handlers
│   │   ├── authController.js  # Login/Register
│   │   ├── campaignController.js    # Campaign CRUD
│   │   ├── leadsController.js       # Lead management
│   │   ├── blastController.js       # Campaign execution
│   │   ├── importController.js      # Lead CSV import
│   │   ├── templateController.js    # WhatsApp templates
│   │   ├── automationController.js  # Workflow automation
│   │   ├── dashboardController.js   # Analytics
│   │   └── reportController.js      # Report generation
│   ├── routes/                # API route definitions
│   │   ├── auth.js
│   │   ├── campaigns.js
│   │   ├── leads.js
│   │   ├── blast.js
│   │   ├── import.js
│   │   ├── templates.js
│   │   ├── automations.js
│   │   ├── dashboard.js
│   │   ├── reports.js
│   │   └── webhooks.js
│   ├── services/              # Utility & third-party services
│   │   ├── whatsappService.js       # Meta WhatsApp API wrapper
│   │   ├── campaignLeadImportService.js  # CSV parsing
│   │   └── seedTemplates.js         # Template initialization
│   ├── middlewares/           # Express middleware
│   │   ├── auth.js            # JWT authentication
│   │   ├── roles.js           # Role-based authorization
│   │   ├── errorHandler.js    # Global error handling
│   │   ├── logger.js          # Request logging
│   │   └── rateLimiter.js     # Rate limiting
│   ├── jobs/                  # Job queue handlers
│   │   └── queue.js           # BullMQ message queue setup
│   └── db/
│       └── migrations/        # SQL migration files
│           └── 001_init_crm_schema.sql
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router setup
│   │   ├── main.jsx           # React entry point
│   │   ├── pages/             # Page components
│   │   │   ├── Login.jsx      # Authentication page
│   │   │   ├── Register.jsx   # User registration
│   │   │   ├── Dashboard.jsx  # Main dashboard
│   │   │   ├── CampaignDetail.jsx
│   │   │   └── LeadDetail.jsx
│   │   ├── components/        # Reusable components
│   │   │   ├── CampaignForm.jsx
│   │   │   ├── CampaignList.jsx
│   │   │   ├── CampaignStats.jsx
│   │   │   ├── LeadForm.jsx
│   │   │   ├── LeadList.jsx
│   │   │   ├── LeadHistory.jsx
│   │   │   ├── LeadImportForm.jsx
│   │   │   └── CampaignLeadImportModal.jsx
│   │   ├── services/
│   │   │   └── api.js         # API client wrapper
│   │   └── styles/            # CSS stylesheets
│   ├── vite.config.js         # Vite build config
│   ├── package.json
│   └── index.html
│
├── docs/                      # Project documentation
│   ├── ARCHITECTURE_DIAGRAMS.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── QUICK_START.md
│   ├── SETUP_GUIDE.md
│   ├── WHATSAPP_INTEGRATION_ROADMAP.md
│   └── [other documentation...]
│
├── package.json               # Root project file
├── schema.sql                 # Database schema definition
└── README.md
```

---

## Backend Architecture

### 1. Entry Points & Configuration

#### [server.js](backend/server.js)
- Initializes Express application
- Runs database migrations on startup
- Seeds default templates
- Starts HTTP server on configured port

#### [app.js](backend/app.js)
- Express application setup
- Global middleware registration (helmet, CORS, body-parser)
- Route mounting
- 404 handler and error handler

#### [config/index.js](backend/config/index.js)
Environment variables configuration:
```javascript
{
  port: 3000,
  nodeEnv: 'development',
  jwtSecret: 'jwt-secret-key',
  db: { host, port, user, password, database },
  redis: { url },
  rateLimit: { windowMs, max },
  whatsapp: { businessAccountId, phoneNumberId, accessToken, 
              webhookToken, apiVersion, senderPhoneNumber }
}
```

### 2. Controllers (Business Logic)

#### **authController.js**
- `register(req, res)` - Create new user account with hashed password
- `login(req, res)` - Authenticate user and return JWT token (1h expiration)

**Validation:**
- Email uniqueness check
- Password min 8 characters
- Bcrypt hashing (10 rounds)

---

#### **campaignController.js**
Main campaign management controller with multiple functions:

**Key Functions:**
- `getAllCampaigns()` - Retrieve all campaigns with pagination
- `getCampaignById()` - Get single campaign details
- `createCampaign()` - Create new campaign linked to template and leads
- `updateCampaign()` - Update campaign status (DRAFT → SCHEDULED → RUNNING → COMPLETED)
- `deleteCampaign()` - Delete campaign (ADMIN only)
- `downloadCampaignLeadImportTemplate()` - Download CSV template
- `importCampaignLeadsFromCsv()` - Upload CSV and associate leads with campaign
- `getCampaignStats()` - Get delivery stats and performance metrics
- `updateCampaignLeadSelection()` - Replace selected leads for campaign
- `previewCampaignContacts()` - Preview which leads will receive message

---

#### **leadsController.js**
Lead management and CRM operations:

**Key Functions:**
- `getAllLeads(req, query)` - List leads with filters (search, city, program, status, date range)
- `getLeadById()` - Get single lead with full details
- `getLeadStatusHistory()` - Get history of status changes for a lead
- `createLead()` - Add new lead to system
- `updateLead()` - Update lead information (status, assignment, notes)
- `deleteLead()` - Delete lead (ADMIN only)

**Lead Statuses:**
- NEW (default)
- CONTACTED
- INTERESTED
- FOLLOW_UP
- REGISTERED
- REJECTED

---

#### **blastController.js**
Campaign execution and message sending:

**Key Functions:**
- `startBlast()` - Begin sending campaign messages
- `retryFailed()` - Retry failed messages
- `previewTargets()` - Preview recipients before sending
- `getBlastStatus()` - Get queue statistics (waiting, active, completed, failed)

**Features:**
- Configurable sending rate (1-50 msgs/second)
- Automatic retry with exponential backoff
- Message queuing with BullMQ
- Real-time status tracking

---

#### **importController.js**
CSV lead import with preview functionality:

**Key Functions:**
- `previewLeadsFromCSV()` - Parse and preview CSV before import
- `commitPreviewImport()` - Save previewed leads to database
- `importLeadsFromCSV()` - Direct CSV import without preview
- `getCSVTemplate()` - Download template CSV file

**Features:**
- Phone number normalization (handles +62, 0, etc.)
- Duplicate detection (phone number uniqueness)
- Flexible column mapping (auto-detect or manual)
- Validation with helpful error messages

---

#### **templateController.js**
WhatsApp message template management:

**Key Functions:**
- `getAllTemplates()` - Get cached templates from local database
- `getTemplateByName()` - Get specific template
- `createTemplate()` - Create template on Meta WhatsApp account
- `syncTemplatesFromMeta()` - Sync templates from Meta Cloud API

---

#### **automationController.js**
Workflow and automation rules:

**Key Functions:**
- `getAllAutomations()` - Get all automation rules
- `getAutomationById()` - Get single automation
- `createAutomation()` - Create new automation workflow
- `updateAutomation()` - Update automation settings
- `deleteAutomation()` - Delete automation

**Automation Features:**
- Trigger types: INCOMING_MESSAGE, LEAD_STATUS_CHANGE, SCHEDULED
- Flexible conditions (stored as JSONB)
- Actions: send_message, update_status, etc.

---

#### **dashboardController.js**
Analytics and reporting:

**Key Functions:**
- `getOverview()` - Get dashboard summary statistics including:
  - Total campaigns count
  - Messages sent, delivered, read, failed
  - Success vs failure rates
  - Recent campaign performance
  - Campaigns created today

---

#### **reportController.js**
Report generation (framework in place)

---

### 3. Services (Utility & External Integration)

#### **whatsappService.js**
Meta WhatsApp Cloud API integration:

```javascript
class WhatsAppService {
  // Send template message with placeholders
  static async sendTemplateMessage(phoneNumber, templateName, parameters)
  
  // Send plain text message
  static async sendTextMessage(phoneNumber, message)
  
  // Get templates from Meta
  static async getTemplates()
  
  // Create new template
  static async createTemplate(name, category, components, language)
  
  // Handle webhook events (status updates)
  static async handleWebhookEvent(event)
}
```

**Features:**
- Automatic phone number normalization
- Error handling with detailed messages
- Support for both template and text messages
- Component-based template support

---

#### **campaignLeadImportService.js**
CSV parsing and lead import utilities:

```javascript
// Main functions
parseCsvBuffer(fileBuffer, mapping)  // Parse CSV buffer
importRowsToCampaign(campaignId, rows)  // Save rows to campaign_leads
getCampaignImportTemplateCsv()  // Generate template CSV
```

**Features:**
- Column auto-mapping with aliases
- Phone number normalization
- Duplicate detection per phone number
- Validation error tracking
- Support for custom column mapping

---

#### **seedTemplates.js**
Initialize default WhatsApp templates on server startup

---

### 4. Middleware

#### **auth.js** - JWT Authentication
- Verifies Bearer token from Authorization header
- Validates JWT signature and expiration
- Attaches user info to `req.user`
- Returns 401 if missing/invalid

#### **roles.js** - Role-Based Authorization
```javascript
authorize(...allowedRoles)  // Check if user role is in allowed list
// Supports: ADMIN, MARKETING, CS, SALES
```

#### **errorHandler.js** - Global Error Handling
- Catches all uncaught errors
- Normalizes database errors
- Returns standardized error response with status code

#### **logger.js** - Request Logging
- Logs all incoming HTTP requests
- Uses Winston for structured logging
- Tracks request timing

#### **rateLimiter.js** - Rate Limiting
- Express-rate-limit integration
- Configurable per environment
- Prevents abuse

---

### 5. Routes

All routes require authentication except `/auth` endpoints and `/webhooks`.

#### **Auth Routes** (`/api/auth`)
```
POST   /register       Register new user
POST   /login          Login and get JWT token
```

#### **Campaign Routes** (`/api/campaigns`)
```
GET    /                Get all campaigns
POST   /                Create campaign
GET    /:id             Get campaign details
PUT    /:id             Update campaign status
DELETE /:id             Delete campaign (ADMIN)
GET    /:id/stats       Get campaign statistics
GET    /:id/preview-contacts   Preview recipients
PUT    /:id/leads       Update lead selection
GET    /import-template Download CSV template
POST   /:id/import-leads Upload lead CSV
```

#### **Lead Routes** (`/api/leads`)
```
GET    /                Get all leads (with filters)
POST   /                Create lead
GET    /:id             Get lead details
GET    /:id/history     Get lead status history
PUT    /:id             Update lead
DELETE /:id             Delete lead (ADMIN)
```

#### **Blast Routes** (`/api/blast`)
```
POST   /                Start campaign blast
POST   /:campaignId/start       Start blast for campaign
POST   /:campaignId/preview     Preview blast targets
POST   /:campaignId/retry-failed Retry failed messages
GET    /:campaignId/status      Get blast status
```

#### **Template Routes** (`/api/templates`)
```
GET    /                Get all templates
POST   /                Create template (ADMIN)
GET    /:name           Get template by name
GET    /meta/sync       Sync with Meta API
```

#### **Automation Routes** (`/api/automations`)
```
GET    /                Get all automations
POST   /                Create automation
GET    /:id             Get automation
PUT    /:id             Update automation
DELETE /:id             Delete automation
```

#### **Dashboard Routes** (`/api/dashboard`)
```
GET    /overview        Get dashboard statistics
```

#### **Import Routes** (`/api/import`)
```
GET    /template        Get CSV template
POST   /csv             Import CSV
POST   /csv/preview     Preview CSV import
POST   /csv/commit      Save preview import
```

#### **Webhooks** (`/api/webhooks`)
- `POST /whatsapp` - Receive message status updates from Meta

---

### 6. Job Queue (BullMQ)

#### [jobs/queue.js](backend/jobs/queue.js)

**Message Queue Setup:**
- Uses BullMQ for job queue (runs on Redis)
- Queue name: "send_whatsapp_message"
- Configured for reliable message delivery

**Job Structure:**
```javascript
{
  campaignId: UUID,
  leadId: UUID,
  phoneNumber: string,
  templateName: string,
  parameters: array
}
```

**Processing:**
- Jobs queued with calculated delays (rate limiting)
- Automatic retry with exponential backoff
- Worker processes messages asynchronously
- Status tracking in messages table

---

## Frontend Architecture

### Tech Stack
- **Framework:** React 19.2.4
- **Build Tool:** Vite 7.1.7
- **Router:** React Router 6.30.3
- **UI Enhancements:** React Icons, React Hot Toast
- **Charts:** Chart.js + react-chartjs-2
- **CSV Parsing:** PapaParse 5.5.3

### Component Structure

#### **Pages** (Container Components)

##### [pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)
Main application hub after login. Features:
- Tabbed interface (Campaigns / Leads / Import / Analytics)
- Real-time data fetching
- Create Campaign form
- Create Lead form
- Bulk Lead Import
- Campaign and Lead lists with actions
- Overview analytics dashboard
- User info and logout

**State Management:**
- Local state with `useState`
- `useEffect` for data loading
- `useNavigate` for routing

##### [pages/CampaignDetail.jsx](frontend/src/pages/CampaignDetail.jsx)
- Campaign details view
- Campaign stats
- Lead association management
- Message history

##### [pages/LeadDetail.jsx](frontend/src/pages/LeadDetail.jsx)
- Individual lead profile
- Lead status history
- Contact information
- Message history with lead

##### [pages/Login.jsx](frontend/src/pages/Login.jsx)
- Email/password form
- JWT token storage
- Error handling
- Redirect to dashboard on success

##### [pages/Register.jsx](frontend/src/pages/Register.jsx)
- New user registration
- Role selection
- Form validation

---

#### **Reusable Components**

##### [components/CampaignForm.jsx](frontend/src/components/CampaignForm.jsx)
- Create/Edit campaign form
- Template selection dropdown
- Lead status filtering
- Parameter input for template variables

##### [components/CampaignList.jsx](frontend/src/components/CampaignList.jsx)
- Display campaigns in table/grid
- Status badges
- Action buttons (view, edit, delete, launch)
- Pagination controls

##### [components/CampaignStats.jsx](frontend/src/components/CampaignStats.jsx)
- Display campaign performance metrics
- Delivery rate, read count, failure rate
- Charts and visualizations

##### [components/LeadForm.jsx](frontend/src/components/LeadForm.jsx)
- Create/Edit lead form
- Fields: name, phone, email, city, program interest, etc.
- Status assignment
- Notes field

##### [components/LeadList.jsx](frontend/src/components/LeadList.jsx)
- Display leads in searchable table
- Filter by status, city, program
- Pagination
- Action buttons

##### [components/LeadHistory.jsx](frontend/src/components/LeadHistory.jsx)
- Timeline of lead status changes
- Timestamps and user information

##### [components/LeadImportForm.jsx](frontend/src/components/LeadImportForm.jsx)
- CSV file upload
- Column mapping interface
- Preview before import
- Progress indication

##### [components/CampaignLeadImportModal.jsx](frontend/src/components/CampaignLeadImportModal.jsx)
- Modal for importing leads into specific campaign
- File upload with drag-and-drop
- Validation and error display

---

#### **Routing & Navigation**

```javascript
// App.jsx routes
/              → Dashboard (default)
/login         → Login page
/register      → Register page
/dashboard     → Main dashboard (protected)
/campaign/:id  → Campaign detail (protected)
/lead/:id      → Lead detail (protected)
```

**Route Protection:** PrivateRoute component checks for token in localStorage

---

### API Service Layer

#### [services/api.js](frontend/src/services/api.js)

**API Base URL:** Configurable via `VITE_API_URL` environment variable (default: `http://localhost:5000/api`)

**Helper Function:**
```javascript
apiCall(endpoint, options)
// - Automatically adds Authorization header with JWT token
// - Handles response parsing
// - Redirects to login on 401 (except /auth endpoints)
```

**Service Objects:**

1. **authService**
   - `register(name, email, password, role)`
   - `login(email, password)`

2. **campaignService**
   - `getAll(page, limit)`
   - `create(name, templateName, targetLeadStatus, parameters)`
   - `getById(id)`
   - `update(id, data)`
   - `delete(id)`
   - `getStats(id)`
   - `getContacts(id)` - Preview recipients
   - `startBlast(id, parameters, ratePerSecond)`
   - `retryFailed(id)`
   - `getImportTemplate()`
   - `importLeads(id, file, mapping)`

3. **leadService**
   - `getAll(page, limit, filters)`
   - `create(data)`
   - `getById(id)`
   - `update(id, data)`
   - `delete(id)`
   - `getHistory(id)` - Status change history

4. **importService**
   - `getTemplate()`
   - `uploadCsv(file, mapping)`
   - `previewCsv(file, mapping)`
   - `commitCsv(previewId)`

5. **dashboardService**
   - `getOverview()` - Analytics summary

---

## Database Schema

### PostgreSQL Database with 6 Core Tables

#### **users** Table
```sql
├─ id (UUID, PK)
├─ email (TEXT, UNIQUE, indexed)
├─ password_hash (TEXT, bcrypt)
├─ role (TEXT) - ADMIN | MARKETING | CS | SALES
├─ name (TEXT)
└─ created_at (TIMESTAMPTZ)
```

#### **leads** Table
```sql
├─ id (UUID, PK)
├─ name (TEXT) - auto-synced from full_name
├─ full_name (TEXT)
├─ phone_number (TEXT, UNIQUE, indexed) - normalized +62...
├─ email (TEXT)
├─ city (TEXT, indexed)
├─ program_interest (TEXT)
├─ school_origin (TEXT)
├─ entry_year (INTEGER)
├─ lead_source (TEXT)
├─ status (TEXT) - NEW | CONTACTED | INTERESTED | FOLLOW_UP | REGISTERED | REJECTED
├─ assigned_to (UUID, FK → users)
├─ notes (TEXT)
└─ created_at (TIMESTAMPTZ, indexed DESC)
```

**Trigger:** `sync_lead_name_columns` - Keeps name and full_name in sync

---

#### **templates** Table
```sql
├─ id (UUID, PK)
├─ name (TEXT, UNIQUE)
├─ message_body (TEXT)
├─ category (TEXT) - MARKETING | UTILITY | AUTHENTICATION
├─ language (TEXT) - default: 'id'
├─ status (TEXT) - ACTIVE | INACTIVE
├─ created_by (UUID, FK → users)
├─ created_at (TIMESTAMPTZ, indexed)
└─ updated_at (TIMESTAMPTZ)
```

---

#### **campaigns** Table
```sql
├─ id (UUID, PK)
├─ name (TEXT)
├─ template_id (UUID, FK → templates)
├─ template_name (TEXT) - denormalized for querying
├─ status (TEXT) - DRAFT | SCHEDULED | RUNNING | COMPLETED | CANCELLED
├─ scheduled_at (TIMESTAMPTZ, indexed)
├─ created_by (UUID, FK → users)
└─ created_at (TIMESTAMPTZ, indexed DESC)
```

---

#### **campaign_leads** Table (Junction/Bridge)
```sql
├─ id (UUID, PK)
├─ campaign_id (UUID, FK → campaigns, CASCADE delete)
├─ lead_id (UUID, FK → leads, CASCADE delete)
├─ status (TEXT) - pending | queued | sent | delivered | read | failed
├─ selected (BOOLEAN) - default: TRUE
├─ sent_at (TIMESTAMPTZ)
├─ created_at (TIMESTAMPTZ)
└─ UNIQUE(campaign_id, lead_id)
```

---

#### **messages** Table (Message Log)
```sql
├─ id (UUID, PK)
├─ campaign_lead_id (UUID, FK → campaign_leads)
├─ campaign_id (UUID, FK → campaigns)
├─ lead_id (UUID, FK → leads)
├─ whatsapp_message_id (TEXT, UNIQUE) - Meta message ID
├─ message_id (TEXT, UNIQUE) - Internal message ID
├─ phone_number (TEXT)
├─ status (TEXT) - sent | delivered | read | failed
├─ error_message (TEXT)
├─ automation_id (UUID) - for automated messages
└─ created_at (TIMESTAMPTZ, indexed DESC)
```

---

#### **automations** Table
```sql
├─ id (UUID, PK)
├─ name (TEXT)
├─ trigger_type (TEXT) - INCOMING_MESSAGE | LEAD_STATUS_CHANGE | SCHEDULED
├─ conditions (JSONB) - flexible conditions storage
├─ action (JSONB) - action definition (type, template, etc.)
├─ enabled (BOOLEAN)
├─ created_by (UUID, FK → users)
└─ created_at (TIMESTAMPTZ)
```

---

## Data Flow & Integration

### 1. Campaign Execution Flow

```
User Creates Campaign
    ↓
Campaign created in DB (status: DRAFT)
    ↓
User selects leads/target criteria
    ↓
Leads associated via campaign_leads junction table
    ↓
User clicks "Start Blast"
    ↓
blastController.startBlast() called
    ├─ Retrieve campaign details
    ├─ Get selected lead targets
    └─ Queue all target messages with BullMQ
        ↓
    For each target (with rate limiting):
    ├─ Create job in Redis queue
    ├─ Calculate delay based on rate (e.g., 100ms per message)
    └─ Mark as "queued"
        ↓
    Message Worker (BullMQ) processes jobs:
    ├─ Call WhatsAppService.sendTemplateMessage()
    ├─ WhatsApp API sends message to Meta servers
    ├─ Receives message_id from Meta
    ├─ Store in messages table with status "sent"
    └─ Create message record linked to campaign & lead
        ↓
    Meta sends webhook for status updates:
    ├─ "delivered" webhook → Update message status
    ├─ "read" webhook → Update message status
    └─ "failed" webhook → Mark with error_message
        ↓
    Campaign completion:
    ├─ User sees real-time stats in dashboard
    └─ Can retry failed messages or download report
```

---

### 2. Lead Import Flow

```
User Uploads CSV File
    ↓
Upload received by importController
    ↓
parseCsvUpload() reads file:
├─ Parse with csv-parser
├─ Auto-map columns (smart detection)
├─ Normalize phone numbers
├─ Validate format
└─ Collect errors
    ↓
Return preview with:
├─ Valid rows count
├─ Invalid rows with errors
└─ Preview first 5 rows
    ↓
User reviews & confirms
    ↓
commitPreviewImport() processes:
├─ For each row:
│  ├─ Normalize phone number
│  ├─ Check if already exists (UNIQUE phone_number)
│  ├─ INSERT if new (ON CONFLICT DO NOTHING)
│  └─ Track imported count
└─ Return summary (imported, skipped duplicates)
    ↓
Leads now available for campaigns
```

---

### 3. Authentication Flow

```
User submits login form
    ↓
Frontend: authService.login(email, password)
    ↓
Backend: authController.login()
├─ Query user by email
├─ Compare password with bcrypt
├─ Generate JWT token (expires 1h)
└─ Return { token, user }
    ↓
Frontend: localStorage.setItem('token', token)
          localStorage.setItem('user', userInfo)
    ↓
All subsequent API calls:
├─ Extract token from localStorage
├─ Add to Authorization header: "Bearer <token>"
└─ Backend authenticates via JWT
    ↓
401 response → Redirect to /login
200 response → Continue normally
```

---

### 4. Data Flow: Frontend → Backend → Database

```
┌─────────────────┐
│   React UI      │ User fills campaign form
└────────┬────────┘
         │ JSON payload
         ▼
┌─────────────────┐
│  API Service    │ POST /api/campaigns - with JWT token
└────────┬────────┘
         │ HTTP Request + Token
         ▼
┌─────────────────┐
│ Express Router  │ Route to campaignController
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  auth.js        │ Verify JWT token
│  roles.js       │ Check user role (MARKETING/ADMIN)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ campaignController.create() │ Validate with Joi
│ - Validate input            │ - Prepare SQL
│ - Query leads               │ - Insert campaign
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │ campaigns table
│  campaign_leads │ junction table
└────────┬────────┘
         │ Query result
         ▼
┌─────────────────┐
│ Response JSON   │ { data: {...}, message: "..." }
└────────┬────────┘
         │ HTTP 201
         ▼
┌─────────────────┐
│  React State    │ Update campaigns list
│  Update UI      │ Show success toast
└─────────────────┘
```

---

## Key Features Explained

### 1. Campaign Management

**What it does:**
- Create marketing campaigns linked to WhatsApp templates
- Associate leads with campaigns
- Target specific lead segments (by status, city, program)
- Schedule campaigns or execute immediately

**How it works:**
1. Choose WhatsApp template (from Meta)
2. Select target leads (manual or filtered)
3. Configure parameters (template variables)
4. Set schedule (optional) or launch immediately
5. System queues and sends messages via WhatsApp API

**Key Tables:** campaigns, campaign_leads, messages

---

### 2. Lead Management

**What it does:**
- Store and organize university prospect information
- Track lead progression through sales funnel
- Assign leads to team members
- Maintain lead history and notes

**Lead Statuses:**
- **NEW:** Recently added lead (initial state)
- **CONTACTED:** Has been contacted before
- **INTERESTED:** Shown interest in programs
- **FOLLOW_UP:** Needs follow-up communication
- **REGISTERED:** Completed registration
- **REJECTED:** Not qualified (opt-out, etc.)

**Key Tables:** leads

---

### 3. CSV Lead Import

**What it does:**
- Bulk import leads from CSV files (Google Forms, spreadsheets)
- Auto-detect column mappings
- Normalize phone numbers to standardized format
- Preview before committing to database
- Prevent duplicate phone numbers

**Supported Formats:**
```csv
name,phone_number,email,city,program_interest
Full Name,081234567890,email@domain.com,Jakarta,Informatika
```

**Phone Normalization:**
- Accepts: "+62...", "62...", "0...", "62..." formats
- Converts all to standardized: "62..." format
- Validates format: "62" + 8-14 digits

**Key Tables:** leads, campaign_leads (if importing to campaign)

---

### 4. WhatsApp Integration (Meta Cloud API)

**What it does:**
- Send templated messages at massive scale
- Track delivery status (sent → delivered → read)
- Handle webhook notifications from Meta
- Support variables in templates

**Message Template Format:**
```javascript
{
  name: "welcome_university",
  parameters: ["Budi", "https://registration.url"],
  language: "id"  // Indonesian
}
```

**Delivery Lifecycle:**
- **Sent:** Message accepted by Meta servers
- **Delivered:** Reached recipient's WhatsApp
- **Read:** Recipient opened and read message
- **Failed:** Delivery failed (invalid number, opt-out, etc.)

**Rate Limiting:**
- Configurable sending rate (msgs/second)
- Prevents WhatsApp API throttling
- Queue-based with calculated delays

---

### 5. Automation & Workflows

**What it does:**
- Trigger automated actions based on conditions
- Support multiple trigger types

**Trigger Types:**
1. **INCOMING_MESSAGE** - When WhatsApp message received
2. **LEAD_STATUS_CHANGE** - When lead status updated
3. **SCHEDULED** - Based on time/date

**Possible Actions:**
- Send response message
- Update lead status
- Notify team members
- Execute custom workflows

**Example:**
```javascript
Trigger: LEAD_STATUS_CHANGE (status = "INTERESTED")
Action: Send template "interested_follow_up" 
        with lead details as parameters
```

---

### 6. Dashboard Analytics

**Metrics Tracked:**
- Total campaigns created
- Messages sent today/all-time
- Delivery success rate (%)
- Read rate (%)
- Failed message count
- Recent campaign performance

**Data Sources:**
- Aggregated from messages, campaigns, campaign_leads tables
- Real-time calculation for dashboard view

---

### 7. Role-Based Access Control

**User Roles:**

| Role | Permissions |
|------|-------------|
| **ADMIN** | All operations (create, edit, delete users/campaigns/leads/templates), sync templates from Meta |
| **MARKETING** | Create/manage campaigns, import leads, view analytics |
| **CS** | View and update leads, manage communications |
| **SALES** | Create leads, track assigned leads |

**Implementation:**
- JWT token includes user role
- Middleware checks role on protected endpoints
- Frontend can conditionally show/hide features

---

## API Endpoints Reference

### Authentication

```http
POST /api/auth/register
Content-Type: application/json
{ "name": "John", "email": "john@upj.ac.id", "password": "pass123", "role": "MARKETING" }
Response: { "user": { "id", "email", "role" } }

POST /api/auth/login
Content-Type: application/json
{ "email": "john@upj.ac.id", "password": "pass123" }
Response: { "token": "jwt_token", "user": {...} }
```

### Campaigns

```http
GET /api/campaigns
Authorization: Bearer <token>
Query: ?page=1&limit=20
Response: { "data": [{...campaigns...}] }

POST /api/campaigns
Authorization: Bearer <token>
{ "name": "Campaign", "templateName": "template", "targetLeadStatus": "NEW" }

GET /api/campaigns/:id

PUT /api/campaigns/:id
{ "status": "RUNNING" }

DELETE /api/campaigns/:id

GET /api/campaigns/:id/stats
Response: { "data": { "success_rate", "read_count", "failed_count" } }

GET /api/campaigns/:id/preview-contacts
Response: { "data": [{contacts...}] }

PUT /api/campaigns/:id/leads
{ "leadIds": ["uuid1", "uuid2"] }

GET /api/campaigns/import-template
Response: CSV file download

POST /api/campaigns/:id/import-leads
Content-Type: multipart/form-data
{ file: File, mapping?: {...} }
Response: { "imported": 10, "skipped": 2 }
```

### Leads

```http
GET /api/leads
Query: ?page=1&limit=20&status=NEW&city=Jakarta&search=name
Response: { "data": [{...leads...}] }

POST /api/leads
{ "full_name": "Name", "phone_number": "628123456789", "email": "..." }

GET /api/leads/:id

PUT /api/leads/:id
{ "status": "CONTACTED", "notes": "..." }

DELETE /api/leads/:id

GET /api/leads/:id/history
Response: { "data": [{status_changes...}] }
```

### Blast/Sending

```http
POST /api/blast
{ "campaignId": "uuid", "parameters": [], "ratePerSecond": 10 }
Response: { "jobId", "totalQueued" }

GET /api/blast/:campaignId/status
Response: { "data": { "waiting", "active", "completed", "failed" } }

POST /api/blast/:campaignId/preview
Response: { "data": [{phoneNumbers...}] }

POST /api/blast/:campaignId/retry-failed
Response: { "data": { "retried" } }
```

### Templates

```http
GET /api/templates
Response: { "data": [{...templates...}] }

GET /api/templates/:name

POST /api/templates (ADMIN only)
{ "name": "template", "category": "MARKETING", "language": "id", "components": [] }

GET /api/templates/meta/sync (ADMIN only)
Response: { "data": [...synced templates] }
```

### Automations

```http
GET /api/automations
Response: { "data": [{...automations...}] }

POST /api/automations
{ "name": "rule", "triggerType": "LEAD_STATUS_CHANGE", "conditions": {}, "action": {} }

GET /api/automations/:id

PUT /api/automations/:id
{ "enabled": false }

DELETE /api/automations/:id
```

### Dashboard

```http
GET /api/dashboard/overview
Response: { "data": { "totals": {...}, "charts": {...} } }
```

### Import

```http
GET /api/import/template
Response: CSV file download

POST /api/import/csv/preview
Content-Type: multipart/form-data
{ file: File, mapping?: {...} }
Response: { "preview": [...rows], "errors": [...] }

POST /api/import/csv/commit
{ "previewId": "uuid" }
Response: { "imported": 10, "skipped": 2 }
```

---

## Configuration & Environment

### Environment Variables (Backend)

Create `.env` file in backend root:

```env
# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=1h

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=crm_marketing

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX=100               # 100 requests per window

# Meta WhatsApp Cloud API
META_BUSINESS_ACCOUNT_ID=xxxxx
META_PHONE_NUMBER_ID=xxxxx
META_ACCESS_TOKEN=xxxxx
META_WEBHOOK_TOKEN=xxxxx
META_API_VERSION=v18.0
META_SENDER_PHONE_NUMBER=6281234567890
META_WEBHOOK_TIMEOUT=5000
```

### Environment Variables (Frontend)

Create `.env.local` in frontend root:

```env
VITE_API_URL=http://localhost:3000/api
```

---

## Dependencies & Technology Stack

### Backend Dependencies

```json
{
  "express": "^4.18.2",            // Web framework
  "pg": "^8.10.0",                 // PostgreSQL client
  "jsonwebtoken": "^9.0.0",        // JWT authentication
  "bcryptjs": "^3.0.3",            // Password hashing
  "axios": "^1.13.6",              // HTTP client (for Meta API)
  "bull": "^4.16.5",               // Job queue (deprecated, use bullmq)
  "bullmq": "^3.14.0",             // Job queue system (Redis)
  "redis": "^4.6.5",               // Redis client
  "joi": "^17.8.3",                // Input validation
  "helmet": "^6.0.1",              // Security headers
  "cors": "^2.8.5",                // CORS middleware
  "express-rate-limit": "^6.8.0",  // Rate limiting
  "morgan": "^1.10.0",             // HTTP logging
  "multer": "^2.1.1",              // File upload handling
  "busboy": "^1.6.0",              // Streaming multipart parser
  "csv-parser": "^3.0.0",          // CSV parsing
  "form-data": "^4.0.5",           // Form data for requests
  "dotenv": "^16.0.3",             // Environment variables
  "winston": "^3.9.0"              // Structured logging
}
```

**DevDependencies:**
```json
{
  "nodemon": "^3.1.14"             // Auto-reload on file changes
}
```

---

### Frontend Dependencies

```json
{
  "react": "^19.2.4",              // UI library
  "react-dom": "^19.2.4",          // React DOM binding
  "react-router-dom": "^6.30.3",   // Client-side routing
  "chart.js": "^4.5.1",            // Charting library
  "react-chartjs-2": "^5.3.1",     // React chart wrapper
  "react-icons": "^5.6.0",         // Icon library
  "react-hot-toast": "^2.6.0",     // Toast notifications
  "papaparse": "^5.5.3"            // CSV parsing
}
```

**DevDependencies:**
```json
{
  "vite": "^7.1.7",                // Build tool
  "@vitejs/plugin-react": "^5.1.0",// React plugin for Vite
  "vitest": "^3.2.4",              // Testing framework
  "jsdom": "^26.1.0"               // DOM implementation for testing
}
```

---

### System Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | Node.js | ≥16.0.0 |
| **Runtime** | Node.js/V8 | Latest |
| **Web Server** | Express.js | ^4.18.2 |
| **Database** | PostgreSQL | 12+ |
| **Cache/Queue** | Redis | 6+ |
| **Job Queue** | BullMQ | ^3.14.0 |
| **Frontend** | React | ^19.2.4 |
| **Build** | Vite | ^7.1.7 |
| **API** | REST/JSON | - |
| **Auth** | JWT | HS256 |
| **External** | Meta WhatsApp Cloud API | v18.0 |

---

## System Diagrams

### 1. Message Sending Flow

```
Campaign Created
    ↓
User Reviews Setup +
Plan Targets
    ↓
Click "Start Blast"
    ↓
┌─────────────────────────┐
│ Rate Limiter Setup      │
│ (e.g., 10 msgs/sec)     │
│ = 100ms delay per msg   │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ BullMQ Queue            │
│ Add jobs with delays    │
│ Job[0] → 0ms delay      │
│ Job[1] → 100ms delay    │
│ Job[2] → 200ms delay    │
└────────┬────────────────┘
         ↓
    Saved to Redis
         ↓
┌────────────────────────────────┐
│ Message Worker (async)         │
│ Processes from queue:          │
│ - Wait for delay               │
│ - Send via WhatsApp API        │
│ - Store message_id            │
│ - Update status "sent"         │
└────────┬─────────────────────┘
         ↓
┌─────────────────────────┐
│ Webhook from Meta       │
│ (status updates)        │
│ delivered, read, failed │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Update messages table   │
│ Update campaign stats   │
└────────┬────────────────┘
         ↓
Dashboard shows real-time progress
```

---

### 2. Data Model Relationships

```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ role        │
└──────┬──────┘
       │
       │ 1:N ──creates──→ campaigns (created_by)
       │            │→ leads (assigned_to)
       │            │→ templates (created_by)
       │            └→ automations (created_by)
       │
       └─ (N) ─ owns ─ (1) ─────┐
                                 │
┌───────────────────────┐        │
│   campaigns           │        │
├───────────────────────┤        │
│ id (PK)               │        │
│ name                  │        │
│ template_id (FK) ────────┐    │
│ status                │  │    │
│ created_by ──────────────┴────┘
└──────────┬──────────────┘
           │
           │ (N) ─ contains ─ (N)
           │      via campaign_leads
           │
           ├──╮
           │  │
     ┌─────┴──┴──────────┐
     │ campaign_leads    │
     ├───────────────────┤
     │ campaign_id (FK)  │
     │ lead_id (FK)      │
     │ status            │
     │ selected          │
     └────────┬──────────┘
              │
              │ (1) ─ links ─ (N)
              │
              ├──╮
              │  │
    ┌─────────┴──┴──────────┐
    │   leads              │
    ├──────────────────────┤
    │ id (PK)              │
    │ phone_number (uniq)  │
    │ name, email, city    │
    │ program_interest     │
    │ status               │
    │ assigned_to (FK usr) │
    └──────────┬───────────┘
               │
               │ (N) ─ receives ─ (N)
               │      via messages
               │
    ┌──────────┴──────────┐
    │   messages         │
    ├────────────────────┤
    │ id (PK)            │
    │ campaign_id (FK)   │
    │ lead_id (FK)       │
    │ whatsapp_msg_id    │
    │ status             │
    │ error_message      │
    └────────────────────┘

┌──────────────┐
│  templates   │
├──────────────┤
│ id (PK)      │
│ name (uniq)  │
│ category     │
│ language     │
│ status       │
│ message_body │
└──────────────┘

┌──────────────┐
│ automations  │
├──────────────┤
│ id (PK)      │
│ name         │
│ trigger_type │
│ conditions   │
│ action       │
│ enabled      │
└──────────────┘
```

---

## Summary

This is a **production-ready, enterprise-grade CRM system** built with modern technologies. It combines:

1. **Scalability** - BullMQ for async job processing, Redis caching
2. **Security** - JWT auth, bcrypt password hashing, role-based access
3. **Reliability** - Database migrations, error handling, transaction support
4. **Usability** - Intuitive React UI with real-time updates
5. **Integration** - WhatsApp Cloud API for massive-scale messaging
6. **Maintainability** - MVC architecture, middleware pattern, organized code structure

The platform enables UPJ to run sophisticated marketing campaigns targeting prospective students at scale while maintaining detailed records and analytics.
