# CRM Marketing UPJ - Quick Reference

## 🚀 Running the System

```bash
# Terminal 1: Backend
cd backend && npm start
→ http://localhost:3000

# Terminal 2: Frontend  
cd frontend && npm start
→ http://localhost:3001
```

### Login Credentials
- **Email**: reigan@upj.ac.id
- **Password**: Reigan123

---

## 📊 What We Built

### Backend (Express.js)
- REST API dengan 30+ endpoints
- JWT authentication
- Role-based access control
- PostgreSQL database dengan 8 tables
- Error handling & validation
- Security headers & rate limiting

### Frontend (React)
- Dashboard dengan tab navigation
- Campaign management (view, create)
- Lead management (view, table)
- Login/Register pages
- Real-time API integration
- Responsive design

### Database
- `users` - Admin, Marketing, Viewer roles
- `leads` - Dengan status tracking (NEW→CONVERTED)
- `campaigns` - Dengan message stats
- `templates` - WhatsApp templates
- `automations` - Rule-based triggers
- `messages` - Message records
- `lead_status_history` - Audit trail
- `audit_logs` - System logging

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express.js |
| Frontend | React 19 + React Router v6 |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Styling | CSS3 (modern gradient) |
| Validation | Joi schemas |

---

## 📋 API Endpoints Summary

```bash
# Auth
POST   /api/auth/register        # Register user
POST   /api/auth/login           # Login & get token

# Campaigns (ADMIN/MARKETING)
GET    /api/campaigns            # List all
POST   /api/campaigns            # Create
GET    /api/campaigns/:id        # Details
GET    /api/campaigns/:id/stats  # Statistics
PUT    /api/campaigns/:id        # Update
DELETE /api/campaigns/:id        # Delete

# Leads (All users)
GET    /api/leads                # List all
POST   /api/leads                # Create
GET    /api/leads/:id            # Details
PUT    /api/leads/:id            # Update
DELETE /api/leads/:id            # Delete

# Templates (ADMIN)
GET    /api/templates            # List all
POST   /api/templates            # Create
GET    /api/templates/:name      # Get
DELETE /api/templates/:name      # Delete

# Automations (ADMIN)
GET    /api/automations          # List all
POST   /api/automations          # Create
GET    /api/automations/:id      # Details
PUT    /api/automations/:id      # Update
DELETE /api/automations/:id      # Delete
```

**Note**: All requests (except auth) need `Authorization: Bearer <token>`

---

## 📁 Project Structure

```
crm-marketing-upj/
├── backend/
│   ├── controllers/         # Business logic
│   ├── routes/             # API routes
│   ├── middlewares/        # Auth, validation, logging
│   ├── config/database.js  # DB connection
│   ├── app.js              # Express app
│   ├── server.js           # HTTP server
│   ├── .env                # Environment vars
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # Login, Register, Dashboard
│   │   ├── components/     # Reusable components
│   │   ├── services/api.js # API client
│   │   ├── styles/         # CSS files
│   │   ├── App.js          # Router
│   │   └── index.js
│   └── package.json
│
├── schema.sql              # Database DDL
├── SETUP_GUIDE.md          # Complete setup
├── FRONTEND_README.md      # Frontend docs
├── PROJECT_STATUS.md       # Detailed status
├── QUICK_REFERENCE.md      # This file
└── README.md               # Overview
```

---

## 💾 Database Setup

```bash
# 1. Create database
psql -U postgres
CREATE DATABASE upj_crm;
\q

# 2. Apply schema
psql -U postgres -d upj_crm -f schema.sql

# 3. Verify tables
psql -U postgres -d upj_crm
\d  # Shows all tables
```

---

## 🔑 Environment Variables

### Backend .env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/upj_crm
JWT_SECRET=your-secret-key
PORT=3000
```

### Frontend .env.local (optional)
```env
REACT_APP_API_URL=http://localhost:3000/api
```

---

## ✨ Key Features

### ✅ Implemented
- [x] User registration & login
- [x] Role-based access control
- [x] Campaign CRUD + statistics
- [x] Lead CRUD + status tracking
- [x] Template management
- [x] Automation rules
- [x] JWT authentication
- [x] Dashboard UI
- [x] Complete documentation

### ⏳ Pending
- [ ] Meta WhatsApp API integration
- [ ] Real-time updates (WebSocket)
- [ ] Edit/Delete UI components
- [ ] Automation UI
- [ ] Redis queue setup

---

## 🧪 Quick Test

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test",
    "email":"test@upj.ac.id",
    "password":"Test123!",
    "role":"MARKETING"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@upj.ac.id",
    "password":"Test123!"
  }'

# 3. Create Lead (with token from step 2)
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"John Doe",
    "phone_number":"628123456789",
    "city":"Jakarta"
  }'
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot connect to database` | Check PostgreSQL running & .env DATABASE_URL |
| `Port 3000 in use` | Kill process: `lsof -i :3000` or use different port |
| `Module not found` | Run `npm install` in backend or frontend folder |
| `CORS error` | Backend already has CORS enabled, check network tab |
| `401 Unauthorized` | Token expired or missing, login again |
| `Frontend shows blank` | Check browser console (F12) for errors |

---

## 📚 Documentation

| File | Contents |
|------|----------|
| `SETUP_GUIDE.md` | Step-by-step setup from zero |
| `FRONTEND_README.md` | React frontend details |
| `PROJECT_STATUS.md` | Comprehensive project status |
| `schema.sql` | Database structure |
| `backend/app.js` | Express configuration |
| `frontend/src/services/api.js` | API client code |

---

## 🎯 Next Steps

### For Phase 2 (WhatsApp Integration)
1. Get Meta Business Account ID & API credentials
2. Setup webhook in Meta Dashboard
3. Implement message sending service
4. Test incoming message handler
5. Configure automation triggers

### For UI Completion
1. Add Edit/Delete button handlers
2. Implement automation management UI
3. Create template management pages
4. Add lead detail page
5. Implement campaign detail page

### For Production
1. Setup production database
2. Configure HTTPS/SSL
3. Set strong JWT_SECRET
4. Configure rate limiting
5. Add error tracking (Sentry/RollBar)

---

## 📊 Feature Checklist

- [x] Database schema (8 tables)
- [x] User authentication
- [x] Campaign management
- [x] Lead management
- [x] Role-based access
- [x] API documentation
- [x] Frontend dashboard
- [x] Error handling
- [x] Input validation
- [x] Security headers
- [ ] WhatsApp integration
- [ ] Real-time updates
- [ ] Analytics
- [ ] Bulk operations

---

## 💡 Tips

- **LocalStorage**: Token disimpan di browser, clear dengan `localStorage.clear()` jika masalah
- **CORS Proxy**: Frontend proxy config in package.json untuk dev mode
- **JWT Expiry**: Default 1 hour, ubah di backend `config/index.js`
- **Password Hash**: Semua password di-hash, tidak bisa recover (tell user untuk reset)
- **Database Backup**: Export dengan `pg_dump -U postgres upj_crm > backup.sql`

---

## 📞 Port References

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Frontend App | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

**Status**: ✅ Phase 1 Complete - Ready for Phase 2

Last updated: March 3, 2026
Total implementation time: ~6 hours
Team size: 1 AI + 1 User
