# CRM Marketing UPJ - Complete Setup Guide

Panduan lengkap setup WhatsApp CRM Marketing system dari awal sampai running.

## Quick Start (Untuk yang sudah setup sebelumnya)

### Terminal 1: Backend
```bash
cd backend
npm start
# Server running on http://localhost:3000
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
# App running on http://localhost:3001
```

**Akses Dashboard**: http://localhost:3001
**Test User**: `reigan@upj.ac.id` / `Reigan123`

---

## Complete Setup Guide

### Prerequisites
- PostgreSQL 12+
- Node.js 14+ 
- npm atau yarn
- Git (optional)

### Step 1: Database Setup

#### Create Database
```bash
psql -U postgres
CREATE DATABASE upj_crm;
\q
```

#### Apply Schema
```bash
psql -U postgres -d upj_crm -f schema.sql
```

**Result**: 8 tables created
- `users` - User accounts dengan roles
- `leads` - Lead data dengan status tracking
- `lead_status_history` - Audit trail untuk lead status changes
- `campaigns` - Campaign management
- `messages` - Message records
- `automations` - Automation rules
- `templates` - WhatsApp message templates
- `audit_logs` - System audit logs

### Step 2: Backend Setup

#### Environment Configuration
Create `.env` file di root project:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/upj_crm
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=1h
PORT=3000

# Meta WhatsApp API (optional, setup nanti)
META_BUSINESS_ACCOUNT_ID=your-business-account-id
META_PHONE_NUMBER_ID=your-phone-number-id
META_ACCESS_TOKEN=your-access-token
WEBHOOK_TOKEN=your-webhook-token
```

#### Install Dependencies
```bash
cd backend
npm install
```

#### Start Server
```bash
npm start
```

**Output**:
```
Server listening on 3000
Database connected
```

#### Test Backend
```bash
# Test register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@upj.ac.id",
    "password": "Admin123!",
    "role": "ADMIN"
  }'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upj.ac.id",
    "password": "Admin123!"
  }'
```

### Step 3: Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure API URL (optional)
Create `.env.local`:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

#### Start Development Server
```bash
npm start
```

**Output**:
```
Compiled successfully!
You can now view app in the browser at http://localhost:3001
```

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Dashboard (3001)          │  ← User Interface
├─────────────────────────────────────────┤
│        React Router Navigation          │
├─────────────────────────────────────────┤
│    API Service Layer (JWT Auth)         │
├─────────────────────────────────────────┤
│        Express.js API (3000)            │  ← REST API
├─────────────────────────────────────────┤
│  Auth | Campaigns | Leads | Templates   │  ← Routes & Controllers
├─────────────────────────────────────────┤
│    PostgreSQL Database (upj_crm)        │  ← Data Layer
└─────────────────────────────────────────┘
```

## Features Implemented

### ✅ Authentication (Complete)
- User registration dengan role selection (ADMIN/MARKETING)
- Login dengan JWT token
- Password hashing (bcrypt)
- Token validation di semua protected routes
- Auto-logout on 401 response

### ✅ Campaign Management (Complete)
- Create campaign dengan template selection
- List campaigns dengan stats (messages, delivered, read)
- View campaign details
- Edit campaign (backend ready, UI soon)
- Delete campaign (backend ready, UI soon)
- Campaign status tracking (DRAFT, ACTIVE, PAUSED, COMPLETED)

### ✅ Lead Management (Complete)
- Create lead dengan validation
- View semua leads dalam table
- Status tracking (NEW, CONTACTED, QUALIFIED, CONVERTED)
- Lead history audit
- Update lead status
- Delete lead

### ✅ User Management (Complete)
- User registration dengan role control
- User listing (admin only)
- Update user info
- Delete user

### ✅ Template Management (Backend)
- Create message template
- Template versioning
- Template testing
- WhatsApp parameter support
- Delete template

### ⏳ Automation Rules (Backend Ready, UI Pending)
- Create automation rules
- Trigger-based automation
- Action execution
- Rule scheduling
- Rule management

### ⏸️ WhatsApp Integration (Pending Meta Credentials)
- Message queue dengan BullMQ
- Webhook receiver untuk incoming messages
- Message status tracking
- Template sync dari Meta
- Automation triggers

## Folder Structure

```
crm-marketing-upj/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── campaignController.js
│   │   ├── leadsController.js
│   │   ├── automationController.js
│   │   └── ...
│   ├── routes/
│   │   ├── auth.js
│   │   ├── campaigns.js
│   │   ├── leads.js
│   │   └── ...
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── roles.js
│   │   ├── errorHandler.js
│   │   └── ...
│   ├── config/
│   │   ├── database.js
│   │   └── index.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env.local
├── schema.sql
├── package.json
└── README.md
```

## Database Schema

### users table
```sql
- id (UUID, primary key)
- email (VARCHAR, unique, lowercase)
- password_hash (VARCHAR)
- name (VARCHAR)
- role (ENUM: ADMIN, MARKETING, VIEWER)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### leads table
```sql
- id (UUID, primary key)
- full_name (VARCHAR)
- phone_number (VARCHAR, unique)
- email (VARCHAR, nullable)
- city (VARCHAR)
- status (ENUM: NEW, CONTACTED, QUALIFIED, CONVERTED)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### campaigns table
```sql
- id (UUID, primary key)
- name (VARCHAR)
- template_name (VARCHAR)
- status (ENUM: DRAFT, ACTIVE, PAUSED, COMPLETED)
- target_lead_status (VARCHAR)
- scheduled_at (TIMESTAMP, nullable)
- created_by (UUID, FK to users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

Lihat `schema.sql` untuk detail lengkap semua tabel.

## API Documentation

### Authentication Endpoints
```
POST   /api/auth/register      - Register akun baru
POST   /api/auth/login         - Login & get JWT token
```

### Campaign Endpoints (ADMIN/MARKETING only)
```
GET    /api/campaigns          - List all campaigns
GET    /api/campaigns/:id      - Get campaign details
GET    /api/campaigns/:id/stats - Get campaign statistics
POST   /api/campaigns          - Create new campaign
PUT    /api/campaigns/:id      - Update campaign
DELETE /api/campaigns/:id      - Delete campaign
```

### Lead Endpoints
```
GET    /api/leads              - List all leads
GET    /api/leads/:id          - Get lead details
POST   /api/leads              - Create new lead
PUT    /api/leads/:id          - Update lead
DELETE /api/leads/:id          - Delete lead
```

### Template Endpoints
```
GET    /api/templates          - List all templates
GET    /api/templates/:name    - Get template
POST   /api/templates          - Create template
DELETE /api/templates/:name    - Delete template
```

### Automation Endpoints
```
GET    /api/automations        - List all automations
GET    /api/automations/:id    - Get automation
POST   /api/automations        - Create automation
PUT    /api/automations/:id    - Update automation
DELETE /api/automations/:id    - Delete automation
```

**Note**: Semua requests (kecuali auth) memerlukan `Authorization: Bearer <token>` header

## Testing Workflow

### 1. Register Test User
```bash
POST http://localhost:3000/api/auth/register
{
  "name": "Test User",
  "email": "test@upj.ac.id",
  "password": "Test123!",
  "role": "MARKETING"
}
```

### 2. Login & Get Token
```bash
POST http://localhost:3000/api/auth/login
{
  "email": "test@upj.ac.id",
  "password": "Test123!"
}
# Response: { "token": "eyJ...", "user": {...} }
```

### 3. Create Lead
```bash
POST http://localhost:3000/api/leads
Authorization: Bearer <token>
{
  "full_name": "John Doe",
  "phone_number": "6281234567890",
  "email": "john@example.com",
  "city": "Jakarta"
}
```

### 4. Create Campaign
```bash
POST http://localhost:3000/api/campaigns
Authorization: Bearer <token>
{
  "name": "Summer Promo",
  "templateName": "welcome_message",
  "targetLeadStatus": "NEW",
  "parameters": []
}
```

### 5. View Dashboard
Open frontend di browser:
```
http://localhost:3001
Login dengan credentials test user
View campaigns dan leads di dashboard
```

## Troubleshooting

### Backend tidak bisa connect ke database
```bash
# Check PostgreSQL running
psql -U postgres -d upj_crm
\d  # List tables

# Check .env DATABASE_URL
echo $DATABASE_URL
```

### Frontend showing "Cannot find module"
```bash
cd frontend
npm install
npm start
```

### CORS errors saat API call
- Backend sudah include CORS headers
- Jika masih error, check backend logs: `npm start`

### Port already in use
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Atau ubah PORT di .env
```

## Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
# Output: build/ folder dengan optimized files
```

### Environment Variables untuk Production
```env
DATABASE_URL=postgresql://...
JWT_SECRET=use-strong-secret-key
PORT=3000
NODE_ENV=production

META_BUSINESS_ACCOUNT_ID=...
META_PHONE_NUMBER_ID=...
META_ACCESS_TOKEN=...
WEBHOOK_TOKEN=...
```

### Deploy Options
1. **Heroku**: Deploy beide folder sebagai monorepo
2. **AWS**: EC2 untuk backend, S3 + CloudFront untuk frontend
3. **DigitalOcean**: App Platform atau Droplet
4. **Docker**: Buat Dockerfile untuk container deployment

## Next Steps

### Phase 1: Current ✅
- Database setup
- Backend API
- Frontend dashboard
- User authentication
- Campaign & Lead management

### Phase 2: WhatsApp Integration
- Setup Meta API credentials
- Implement webhook receiver
- Test incoming messages
- Configure automation triggers

### Phase 3: Advanced Features
- Real-time message updates
- Analytics dashboard
- Bulk operations
- Export functionality
- Custom reports

### Phase 4: Production
- Production database
- SSL certificates
- Domain setup
- CDN configuration
- Monitoring & logging

## Support & Questions

Refer to:
- Backend: `backend/README.md`
- Frontend: `FRONTEND_README.md`  
- Database: `schema.sql`

Good luck! 🚀
