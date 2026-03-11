# UPJ WhatsApp CRM - Complete Code Index

> Production-ready backend for WhatsApp Marketing CRM at Universitas Pembangunan Jaya  
> Built with Node.js, Express, PostgreSQL, JWT, BullMQ/Redis

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Root Configuration Files](#root-configuration-files)
3. [Backend Architecture](#backend-architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Key Features](#key-features)
7. [Dependencies](#dependencies)

---

## Project Overview

**Project Name**: UPJ WhatsApp CRM  
**Version**: 1.0.0  
**Main Entry Point**: `backend/server.js`  
**Development Command**: `npm run dev`  
**Production Command**: `npm start`

A complete CRM system designed for WhatsApp marketing campaigns at Universitas Pembangunan Jaya with:
- User authentication (JWT-based)
- Role-based access control (ADMIN, MARKETING, CS, SALES)
- Lead management system
- Campaign scheduling with BullMQ
- Message tracking and delivery status
- Audit logging and status history

---

## Root Configuration Files

### [.env](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/.env)
**Purpose**: Production environment variables (git-ignored)  
**Contains**:
- `PORT`: Server port
- `JWT_SECRET`: JWT signing key
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL credentials
- `REDIS_URL`: Redis connection URL
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`: Rate limiting settings

### [.env.example](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/.env.example)
**Purpose**: Template for environment variables (tracked in git)

### [package.json](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/package.json)
**Purpose**: Node.js project metadata and dependencies

**Key Dependencies**:
- **express** (^4.18.2): Web framework
- **pg** (^8.10.0): PostgreSQL client
- **jsonwebtoken** (^9.0.0): JWT authentication
- **bcrypt** (^5.1.0): Password hashing
- **bullmq** (^3.14.0): Job queue
- **redis** (^4.6.5): Cache and message broker
- **joi** (^17.8.3): Data validation
- **helmet** (^6.0.1): Security headers
- **cors** (^2.8.5): CORS handling
- **morgan** (^1.10.0): HTTP logging
- **winston** (^3.9.0): Structured logging
- **express-rate-limit** (^6.8.0): Rate limiting
- **dotenv** (^16.0.3): Environment variable management

**Dev Dependencies**:
- **nodemon** (^3.1.14): Auto-restart on file changes

### [README.md](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/README.md)
**Purpose**: Project documentation and setup instructions

### [schema.sql](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/schema.sql)
**Purpose**: PostgreSQL database schema initialization (see [Database Schema](#database-schema))

---

## Backend Architecture

### /backend/server.js
**Purpose**: Server entry point  
**Responsibility**: 
- Load Express app
- Start HTTP server on configured port
- Output startup message

**Code**:
```javascript
const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
```

---

### /backend/app.js
**Purpose**: Express application setup  
**Responsibility**:
- Configure global middleware (Helmet, CORS, JSON parsing, logging, rate limiting)
- Mount API routes
- Define health check endpoints
- Implement 404 handler
- Apply global error handler

**Global Middleware Stack**:
1. `helmet()` - Security headers
2. `cors()` - CORS support
3. `express.json()` - JSON body parsing
4. `requestLogger` - HTTP request logging (Morgan)
5. `rateLimiter` - Rate limiting

**Routes**:
- `GET /` - Health check
- `GET /favicon.ico` - Favicon (returns 204)
- `POST /api/auth/*` - Authentication routes
- `GET|POST|PUT|DELETE /api/leads/*` - Lead management routes

---

### /backend/config/index.js
**Purpose**: Centralized configuration management  
**Exports**:
- `port`: Server port (default: 3000)
- `jwtSecret`: JWT signing key
- `db`: PostgreSQL connection pool settings
- `redisUrl`: Redis connection URL
- `rateLimit`: Rate limiting configuration

**Environment Variables** (from .env):
```
PORT=3000
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=crm_db
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

### /backend/config/database.js
**Purpose**: PostgreSQL connection pool  
**Exports**:
- `query(text, params)`: Execute SQL query
- `pool`: Raw Pool instance for transactions

**Uses**: `pg.Pool` with settings from config

---

## Backend Routes

### /backend/routes/auth.js
**Purpose**: Authentication endpoints  
**Base Path**: `/api/auth`

**Endpoints**:
| Method | Path | Protected | Description |
|--------|------|-----------|-------------|
| POST | `/login` | No | User login, returns JWT token |

**Controller**: [authController.js](#backendcontrollersauthcontrollerjs)

---

### /backend/routes/leads.js
**Purpose**: Lead management API  
**Base Path**: `/api/leads`

**Endpoints**:
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Yes | All | Get all leads |
| GET | `/:id` | Yes | All | Get lead by ID |
| GET | `/:id/history` | Yes | All | Get lead status change history |
| POST | `/` | Yes | ADMIN, MARKETING, SALES | Create new lead |
| PUT | `/:id` | Yes | ADMIN, MARKETING | Update lead |
| DELETE | `/:id` | Yes | ADMIN | Delete lead |

**Controller**: [leadsController.js](#backendcontrollersleadscontrollerjs)

---

## Backend Controllers

### /backend/controllers/authController.js
**Purpose**: Authentication logic  

**Methods**:
- `login(req, res, next)` 
  - Validates email & password
  - Compares with hashed password in database
  - Returns JWT token valid for 1 hour
  - Returns user info (id, email, role)
  - Status: 401 on invalid credentials

**Validation Schema** (Joi):
```javascript
{
  email: string (required, valid email format),
  password: string (required)
}
```

**Database Query**:
```sql
SELECT id, email, password_hash, role FROM users 
WHERE lower(email) = lower($1) LIMIT 1
```

---

### /backend/controllers/leadsController.js
**Purpose**: Lead management logic  
**Total Lines**: 297

**Methods**:

#### `getAllLeads(req, res, next)`
- Returns all leads ordered by creation date (newest first)
- Includes total count
- No special role restrictions

**Response**:
```json
{
  "data": [{ lead objects }],
  "total": 15
}
```

#### `getLeadById(req, res, next)`
- Returns single lead by UUID
- Returns 404 if not found
- Validates UUID format

#### `createLead(req, res, next)`
- Creates new lead with validation
- Returns 201 on success
- Returns 409 if phone number already exists
- Returns 400 if invalid assigned_to user

**Validation Schema** (Joi):
```javascript
{
  full_name: string (required, min 1 char),
  phone_number: string (required, min 6 chars),
  email: string (email format, optional),
  school_origin: string (optional),
  city: string (optional),
  program_interest: string (optional),
  entry_year: number (1900-9999, optional),
  lead_source: string (optional),
  status: enum (NEW|CONTACTED|INTERESTED|FOLLOW_UP|REGISTERED|REJECTED, default: NEW),
  assigned_to: UUID (optional),
  notes: string (optional)
}
```

#### `updateLead(req, res, next)`
- Updates lead with transaction support for status changes
- Stores status change history
- Partial updates allowed (at least 1 field required)
- Prevents duplicate phone numbers
- Locks row during transaction (FOR UPDATE)

**Validation Schema** (Joi):
- Same fields as create, all optional, but minimum 1 field required

#### `getLeadStatusHistory(req, res, next)` 
- Returns all status changes for a lead
- Includes old status, new status, who changed it, and when

#### `deleteLead(req, res, next)`
- Soft or hard delete (implementation in full file)
- ADMIN role required
- Cascades related records

**Lead Field Transformations**:
- Empty strings converted to NULL
- UUID validation for assigned_to
- Entry year must be between 1900-9999

---

## Backend Middlewares

### /backend/middlewares/auth.js
**Purpose**: JWT authentication  

**Function**: `authenticate(req, res, next)`
- Extracts Bearer token from Authorization header
- Verifies token signature using JWT_SECRET
- Decodes payload into `req.user` object
- Returns 401 if missing, malformed, invalid, or expired
- Token payload: `{ id, role }`

**Usage**:
```javascript
router.get('/', authenticate, handlerFunction);
```

---

### /backend/middlewares/roles.js
**Purpose**: Role-based authorization  

**Function**: `authorize(...allowedRoles)`
- Returns middleware function
- Checks if `req.user.role` is in allowed roles
- Returns 401 if no user (not authenticated)
- Returns 403 if role not allowed

**Valid Roles**: `ADMIN`, `MARKETING`, `CS`, `SALES`

**Usage**:
```javascript
router.post('/', authenticate, authorize('ADMIN', 'MARKETING'), createLead);
```

---

### /backend/middlewares/logger.js
**Purpose**: HTTP request logging  

**Exports**:
- `logger`: Winston logger instance for structured logging
- `requestLogger`: Morgan middleware for HTTP request logging

**Features**:
- JSON format output
- Automatic timestamps
- Severity levels (info, error, warn, etc.)
- Console transport

**Used In**: [app.js](#backendappjs)

---

### /backend/middlewares/errorHandler.js
**Purpose**: Global error handling  

**Function**: `errorHandler(err, req, res, next)`
- Catches all thrown errors
- Logs error stack
- Returns JSON response with error message
- Defaults to 500 status if not specified
- Must be registered last in middleware stack

**Usage**:
```javascript
app.use(errorHandler); // Last middleware
```

---

### /backend/middlewares/rateLimiter.js
**Purpose**: Rate limiting  

**Configuration**:
- Window duration: 15 minutes (900,000 ms) - configurable
- Max requests per window: 100 - configurable
- Returns 429 when exceeded

**Configuration Source**: [config/index.js](#backendconfigindexjs)

**Used In**: [app.js](#backendappjs)

---

### /backend/jobs/queue.js
**Purpose**: BullMQ job queue setup (placeholder)  

**Components**:
- `myQueue`: Queue named 'default' connected to Redis
- `worker`: Worker to process jobs

**Current State**: Template implementation  
**Intended Use**: 
- Schedule WhatsApp messages
- Process campaign distributions
- Handle async tasks (notifications, reports, etc.)

**Connection**: Uses `REDIS_URL` from environment

---

## Database Schema

### Database: PostgreSQL

**File**: [schema.sql](c:/Users/Reigan%20Chenartha/OneDrive/Documents/Desktop/TUGAS-AKHIR/crm-marketing-upj/schema.sql)

**Extensions**:
- `pgcrypto`: For `gen_random_uuid()` function

---

### Enum Types

#### `user_role`
Values: `ADMIN`, `MARKETING`, `CS`, `SALES`

#### `lead_status`
Values: `NEW`, `CONTACTED`, `INTERESTED`, `FOLLOW_UP`, `REGISTERED`, `REJECTED`

#### `message_status`
Values: `sent`, `delivered`, `read`, `failed`

#### `campaign_status`
Values: `DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `CANCELLED`

---

### Tables

#### `users`
**Purpose**: User accounts and authentication  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| name | TEXT | NOT NULL | User's full name |
| email | TEXT | NOT NULL, UNIQUE | Case-insensitive index |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | user_role | NOT NULL, DEFAULT 'MARKETING' | Role type |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp |

**Indexes**:
- `idx_users_email_lower`: On LOWER(email) for case-insensitive searches
- `idx_users_role`: On role for filtering by role

---

#### `leads`
**Purpose**: Student/prospect information  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| full_name | TEXT | NOT NULL | Lead's name |
| phone_number | TEXT | NOT NULL, UNIQUE | WhatsApp number |
| email | TEXT | NULL | Optional email |
| school_origin | TEXT | NULL | Current school |
| city | TEXT | NULL | Location |
| program_interest | TEXT | NULL | Program of interest |
| entry_year | INTEGER | NULL | Expected entry year (1900-9999) |
| lead_source | TEXT | NULL | How lead was acquired |
| status | lead_status | NOT NULL, DEFAULT 'NEW' | Current status |
| assigned_to | UUID | FK users.id, NULL | Assigned user |
| notes | TEXT | NULL | Internal notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation time |

**Indexes**:
- `idx_leads_assigned_to`: For filtering by assigned user
- `idx_leads_status`: For status-based queries
- `idx_leads_created_at`: For ordering by date (DESC)
- `idx_leads_city`: For geographic filtering
- `idx_leads_email_lower`: Case-insensitive email search

**Constraints**:
- Unique phone number
- FK to users.id on assigned_to (SET NULL on delete)
- Entry year must be 1900-9999

---

#### `lead_status_history`
**Purpose**: Audit trail of status changes  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| lead_id | UUID | FK leads.id, NOT NULL | Reference to lead |
| old_status | lead_status | NULL | Previous status |
| new_status | lead_status | NOT NULL | Current status |
| changed_by | UUID | FK users.id, NULL | Who made change |
| changed_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When changed |

**Constraint**: Status must be different (old_status ≠ new_status)

**Indexes**:
- `idx_lead_status_history_lead_id`: For getting history of a lead
- `idx_lead_status_history_changed_by`: For user activity tracking
- `idx_lead_status_history_changed_at`: For timeline queries

---

#### `campaigns`
**Purpose**: Marketing campaign templates and schedules  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| name | TEXT | NOT NULL | Campaign name |
| template_name | TEXT | NOT NULL | Message template identifier |
| scheduled_at | TIMESTAMPTZ | NULL | Scheduled send time |
| status | campaign_status | NOT NULL, DEFAULT 'DRAFT' | Campaign status |
| created_by | UUID | FK users.id, NULL | Campaign creator |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation time |

**Indexes**:
- `idx_campaigns_created_by`: For user's campaigns
- `idx_campaigns_status`: For filtering by status
- `idx_campaigns_scheduled_at`: For scheduled campaigns

---

#### `messages`
**Purpose**: Individual message delivery tracking  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| lead_id | UUID | FK leads.id, NOT NULL | Message recipient |
| campaign_id | UUID | FK campaigns.id, NULL | Associated campaign |
| meta_message_id | TEXT | UNIQUE | WhatsApp message ID |
| status | message_status | NOT NULL, DEFAULT 'sent' | Delivery status |
| error_message | TEXT | NULL | Error details if failed |
| sent_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Send time |

**Cascade**: Messages deleted when lead deleted

**Indexes**:
- `idx_messages_lead_id`: For lead's message history
- `idx_messages_campaign_id`: For campaign analytics
- `idx_messages_status`: For delivery status tracking
- `idx_messages_sent_at`: For timeline queries

---

#### `automations`
**Purpose**: Trigger-based automation rules  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| trigger_type | TEXT | NOT NULL | Event type (e.g., 'lead_status_change') |
| condition_json | JSONB | NOT NULL, DEFAULT '{}' | Conditional logic |
| action_json | JSONB | NOT NULL, DEFAULT '{}' | Action to execute |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Enable/disable flag |

**Example**:
```json
{
  "trigger_type": "lead_status_change",
  "condition_json": { "new_status": "INTERESTED" },
  "action_json": { "action": "send_message", "template": "interested_followup" },
  "is_active": true
}
```

**Indexes**:
- `idx_automations_is_active`: For finding active rules
- `idx_automations_trigger_type`: For event-based lookup

---

#### `audit_logs`
**Purpose**: Complete activity audit trail  
**Columns**:
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Auto-generated UUID |
| user_id | UUID | FK users.id, NULL | Who performed action |
| action | TEXT | NOT NULL | Action name (e.g., 'CREATE', 'UPDATE') |
| entity_type | TEXT | NOT NULL | Entity type (e.g., 'LEAD', 'CAMPAIGN') |
| entity_id | UUID | NULL | Entity ID |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When action occurred |

**Indexes**:
- `idx_audit_logs_user_id`: For user's activities
- `idx_audit_logs_action`: For action queries
- `idx_audit_logs_entity`: For entity change history
- `idx_audit_logs_created_at`: For timeline queries

---

## API Endpoints

### Authentication

#### POST /api/auth/login
**Authentication**: None  
**Body**:
```json
{
  "email": "user@upj.ac.id",
  "password": "securepassword"
}
```

**Success Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@upj.ac.id",
    "role": "MARKETING"
  }
}
```

**Error Responses**:
- 400 Bad Request: Missing/invalid email or password
- 401 Unauthorized: Invalid credentials

---

### Leads Management

**Base URL**: `/api/leads`  
**Authentication**: JWT required for all endpoints  
**Response Format**: JSON

#### GET /api/leads
**Roles**: All authenticated users  
**Query Params**: None

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Ahmad Rizki",
      "phone_number": "+62812345678",
      "email": "ahmad@email.com",
      "school_origin": "SMA Negeri 1",
      "city": "Jakarta",
      "program_interest": "Teknik Informatika",
      "entry_year": 2024,
      "lead_source": "Instagram",
      "status": "INTERESTED",
      "assigned_to": "550e8400-e29b-41d4-a716-446655440001",
      "notes": "Very interested in InfoTech",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

---

#### GET /api/leads/:id
**Roles**: All authenticated users  
**Params**: 
- `id` (UUID): Lead ID

**Response** (200): Single lead object

**Errors**:
- 400 Bad Request: Invalid UUID
- 404 Not Found: Lead doesn't exist

---

#### GET /api/leads/:id/history
**Roles**: All authenticated users  
**Params**: 
- `id` (UUID): Lead ID

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "old_status": "NEW",
      "new_status": "CONTACTED",
      "changed_by": "uuid (user who made change)",
      "changed_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### POST /api/leads
**Roles**: ADMIN, MARKETING, SALES  
**Body**:
```json
{
  "full_name": "Siti Nurhaliza",
  "phone_number": "+62823456789",
  "email": "siti@email.com",
  "school_origin": "SMA Negeri 2",
  "city": "Bandung",
  "program_interest": "Manajemen",
  "entry_year": 2025,
  "lead_source": "Referral",
  "status": "NEW",
  "assigned_to": null,
  "notes": "Recommended by student"
}
```

**Success Response** (201):
```json
{
  "data": { lead object with id and created_at },
  "message": "Lead created"
}
```

**Errors**:
- 400 Bad Request: Validation failed or invalid assigned_to user
- 409 Conflict: Phone number already exists

---

#### PUT /api/leads/:id
**Roles**: ADMIN, MARKETING  
**Params**: 
- `id` (UUID): Lead ID

**Body** (partial update, minimum 1 field):
```json
{
  "status": "INTERESTED",
  "assigned_to": "550e8400-e29b-41d4-a716-446655440002",
  "notes": "Updated follow-up notes"
}
```

**Success Response** (200):
```json
{
  "data": { updated lead object },
  "message": "Lead updated"
}
```

**Special Behavior**:
- When `status` changes, automatically creates entry in `lead_status_history`
- Uses database transaction for atomicity
- Row-level locking during update (FOR UPDATE)

**Errors**:
- 400 Bad Request: Validation failed or no valid fields
- 404 Not Found: Lead doesn't exist

---

#### DELETE /api/leads/:id
**Roles**: ADMIN only  
**Params**: 
- `id` (UUID): Lead ID

**Success Response** (200):
```json
{
  "message": "Lead deleted"
}
```

**Errors**:
- 404 Not Found: Lead doesn't exist

---

## Key Features

### 1. Authentication & Authorization
- JWT-based stateless authentication
- 1-hour token expiration
- Role-based access control (RBAC)
- 4 role types: ADMIN, MARKETING, CS, SALES
- Bcrypt password hashing (10 salt rounds)

### 2. Lead Management
- Full CRUD operations
- Lead status tracking (6 statuses)
- Assignment to team members
- Status change history/audit trail
- Lead source attribution
- School and program information
- Contact details (phone, email, address)

### 3. Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Password hashing with bcrypt
- JWT token verification
- Input validation with Joi
- SQL injection prevention (parameterized queries)

### 4. Logging & Monitoring
- Winston structured logging
- Morgan HTTP request logging
- Error stack trace logging
- Audit trail for all changes
- Lead status history tracking

### 5. Database Features
- PostgreSQL with UUID primary keys
- Proper indexing for performance
- Foreign key relationships
- Cascade deletes
- Transaction support for data consistency
- JSONB columns for flexible automation rules
- Row-level locking for concurrent updates

### 6. Job Queue (Beta)
- BullMQ integration for background jobs
- Redis-backed task processing
- Ready for async WhatsApp message sending
- Campaign distribution scheduling
- Notification processing

### 7. Error Handling
- Global error handler middleware
- Validation error messages
- HTTP status codes
- Meaningful error responses
- Stack trace logging

---

## Dependencies Graph

```
express
├── helmet (security)
├── cors (cross-origin)
├── morgan (http logging)
└── express-rate-limit (rate limiting)

Authentication
├── jsonwebtoken (JWT)
└── bcrypt (password hashing)

Database
├── pg (PostgreSQL)
└── joi (validation)

Job Queue
├── bullmq (task queue)
└── redis (message broker)

Logging
└── winston (structured logging)

Environment
└── dotenv (config management)
```

---

## File Structure Summary

```
crm-marketing-upj/
├── .env                           # Environment variables (git-ignored)
├── .env.example                   # Environment template
├── package.json                   # Project metadata & dependencies
├── package-lock.json              # Locked dependency versions
├── README.md                       # Project overview
├── schema.sql                      # Database schema
├── CODE_INDEX.md                   # This file
│
├── backend/
│   ├── server.js                  # HTTP server entry point
│   ├── app.js                     # Express app configuration
│   │
│   ├── config/
│   │   ├── index.js               # Configuration loader
│   │   └── database.js            # PostgreSQL pool
│   │
│   ├── controllers/
│   │   ├── authController.js      # Login logic
│   │   └── leadsController.js     # Lead CRUD logic
│   │
│   ├── routes/
│   │   ├── auth.js                # Auth endpoints
│   │   └── leads.js               # Lead endpoints
│   │
│   ├── middlewares/
│   │   ├── auth.js                # JWT verification
│   │   ├── roles.js               # Role authorization
│   │   ├── logger.js              # Request logging
│   │   ├── errorHandler.js        # Error handling
│   │   └── rateLimiter.js         # Rate limiting
│   │
│   └── jobs/
│       └── queue.js               # BullMQ setup
│
└── frontend/
    └── (to be developed)
```

---

## Common Development Tasks

### Setup Development Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL and Redis details
npm install
npm run dev
```

### Database Setup
```bash
psql -U postgres
CREATE DATABASE crm_db;
\c crm_db
\i schema.sql
```

### Create First User
```bash
# Use your preferred PostgreSQL client or psql
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@upj.ac.id', '$2b$10$...', 'ADMIN');
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upj.ac.id","password":"password"}'
```

### Add Middleware
Edit `/backend/app.js` and add to global middleware stack

### Add New Route/Controller
1. Create controller in `/backend/controllers/`
2. Create route in `/backend/routes/`
3. Import and mount in `/backend/app.js`

### Database Migrations
Run SQL scripts against database manually or create migration system

---

## Performance Considerations

### Indexing
- All foreign key columns indexed
- Status and timestamp columns indexed
- Case-insensitive email searches optimized
- Created_at DESC for recent-first ordering

### Connection Pooling
- pg.Pool manages connections (default 10)
- Reuses connections across requests
- Handles connection errors gracefully

### Rate Limiting
- Global rate limiter: 100 requests per 15 minutes
- Configurable via environment variables
- Returns 429 Too Many Requests

### Transaction Safety
- Lead updates use explicit transactions
- Row-level locking (FOR UPDATE) prevents race conditions
- Status history automatically tracked

---

## Security Best Practices Implemented

✅ **Password Security**
- Bcrypt hashing with salt
- Never store plain passwords

✅ **Token Security**
- JWT with HS256 algorithm
- 1-hour expiration
- Verified on every protected request

✅ **Input Validation**
- Joi schema validation on all inputs
- Type checking and format validation
- Min/max length constraints

✅ **Database Security**
- Parameterized queries (no SQL injection)
- Foreign key constraints
- Row-level access control via middleware

✅ **HTTP Security**
- Helmet.js headers
- CORS configuration
- Rate limiting
- Error messages don't leak internals

---

## Next Steps for Completion

- [ ] Implement frontend (React/Vue/Angular)
- [ ] Complete /message endpoints for WhatsApp integration
- [ ] Complete /campaigns endpoints
- [ ] Implement BullMQ workers for message queuing
- [ ] Add unit and integration tests
- [ ] Implement email notifications
- [ ] Add user registration endpoint
- [ ] Implement password reset flow
- [ ] Add pagination to lead listings
- [ ] Add search/filter capabilities
- [ ] Implement field-level access control
- [ ] Add export functionality (PDF/Excel)
- [ ] Setup CI/CD pipeline
- [ ] Configure Docker for containerization
- [ ] Add API documentation (Swagger/OpenAPI)

---

**Last Updated**: March 3, 2026  
**Maintained By**: Development Team  
**Status**: Active Development
