# 🚀 Quick Setup Guide - Sebelum Mulai Development

**Status**: Backend sudah siap! Database dan Redis terhubung dengan baik ✅

---

## 📋 Pre-requisites Checklist

Pastikan sudah installed:

```bash
# 1. Node.js (v20.19+ or v22.12+)
node --version

# 2. PostgreSQL (running)
psql --version

# 3. Redis (running)
redis-cli ping
# Expected: PONG
```

---

## 🔧 Konfigurasi Environment

### Already Done! ✅
- [x] `.env.example` dibuat - template dokumentasi lengkap
- [x] `.env` dibuat - development config sudah pre-filled
- [x] Backend bisa start tanpa error

### File yang digunakan:

**`backend/.env.example`**
- Template lengkap dengan 70+ environment variables
- Penjelasan detail untuk setiap variable
- Security best practices
- NEVER commit ini ke git? NO - ini HARUS commit (tanpa sensitive values)

**`backend/.env`** 
- Development configuration sekarang
- Pre-filled dengan dummy values
- NEVER commit ini ke git ⚠️

---

## 🏃 Untuk Start Development

```bash
# 1. Masuk ke backend directory
cd backend

# 2. (Sudah done) Install dependencies
npm install

# 3. Buat database (first time only)
npm run migrate

# 4. Seed templates (optional)
npm run seed

# 5. Start backend
npm start

# Expected output:
# [DB] No pending migrations
# [DB] Templates already seeded  
# [Queue] send-whatsapp-message queue ready
# [Queue] blast-campaign queue ready
# Server listening on port 5000
```

---

## 📊 Environment Variables Explained

### Minimal Setup (untuk development sekarang)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `development` | Mode aplikasi |
| `PORT` | `5000` | Server port |
| `DATABASE_*` | postgres://... | Database connection |
| `REDIS_URL` | redis://localhost:6379 | Queue system |
| `JWT_SECRET` | dev_secret_key_... | Token signing |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | test_webhook_... | Webhook security |

### After Getting Real API

```env
WHATSAPP_ACCESS_TOKEN=EAAJvP...       # From Meta
WHATSAPP_PHONE_NUMBER_ID=123456...    # From Meta
WHATSAPP_WEBHOOK_VERIFY_TOKEN=YOUR_TOKEN
```

---

## 🧪 Quick Tests

### Test #1: Backend Health Check
```bash
curl http://localhost:5000/

# Expected:
# {
#   "message": "UPJ WhatsApp CRM Backend is running",
#   "status": "ok"
# }
```

### Test #2: Webhook Endpoint
```bash
curl http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=test_webhook_token_dev_123456789

# Expected: test123 (challenge code)
```

### Test #3: Database Connection
```bash
# Check migrations applied
npm run migrate

# Expected:
# [DB] No pending migrations
# Connection pool ready
```

---

## 🔐 Security Notes untuk Production

### NEVER DO THIS ⚠️
```env
# ❌ BAD - commit sensitive values
JWT_SECRET=my_super_secret_key
WHATSAPP_ACCESS_TOKEN=EAAJvP...
DATABASE_PASSWORD=postgres
```

### DO THIS INSTEAD ✅
```
# 1. Commit .env.example (without secrets)
# 2. Create .env locally (add to .gitignore)
# 3. Use environment variable management:
#    - AWS Secrets Manager
#    - Google Cloud Secret Manager  
#    - HashiCorp Vault
#    - Doppler
#    - 1Password Connect
```

### Production .env tips:
```env
# Use strong random values
JWT_SECRET=$(openssl rand -base64 32)

# Use managed services
REDIS_URL=rediss://username:password@redis.production.aws.com:6380
DATABASE_URL=postgresql://user:pass@db.production.aws.com:5432/crm

# Use different tokens per environment
WHATSAPP_WEBHOOK_VERIFY_TOKEN=prod_token_different_from_dev
```

---

## 📁 Project Structure

```
backend/
├── .env                    # ← Development config (local only)
├── .env.example           # ← Template (commit to git)
├── .env.production        # ← Optional: production template
├── .gitignore             # Should include: .env
├── config/
│   ├── database.js        # DB connection
│   ├── index.js           # Config loader
│   └── queue.js           # Queue config
├── controllers/           # Business logic
├── routes/                # API endpoints
├── jobs/
│   └── queue.js          # BullMQ worker
├── services/              # External integrations
├── middlewares/           # Auth, logging, error
└── db/
    └── migrations/        # Database schema
```

---

## 🎯 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Code | ✅ Ready | All 3 critical fixes implemented |
| Database | ✅ Running | PostgreSQL connected |
| Redis | ✅ Running | Queue system ready |
| Environment | ✅ Configured | .env setup with dev values |
| Webhook Handler | ✅ Ready | webhookController.js complete |
| Blast System | ✅ Ready | Transactional & safe |
| Message Tracking | ✅ Ready | campaign_lead_id tracking |
| WhatsApp API | ⏳ Pending | Awaiting Meta credentials |

---

## 🚀 Next Steps

### Today (Development):
1. [x] Setup .env files
2. [x] Verify backend starts
3. [x] Run test endpoints
4. [ ] Test webhook locally (see TESTING_GUIDE.md)
5. [ ] Test blast flow with mock data

### When You Get Meta API:
1. [ ] Get credentials (Phone Number ID, Access Token)
2. [ ] Add to `.env`
3. [ ] Setup webhook URL in Meta
4. [ ] Test end-to-end
5. [ ] Deploy to production

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment template dengan 70+ variables & explanations |
| `.env` | Development configuration (already setup) |
| `FIXES_IMPLEMENTED.md` | Detail ketiga critical fixes |
| `TESTING_GUIDE.md` | Step-by-step testing scenarios |
| `BLAST_AUDIT_REPORT.md` | Complete audit report (Indonesian) |
| `ROADMAP.md` | Project roadmap & features |

---

## ❓ Troubleshooting

### Backend won't start?
```bash
# Check Redis running
redis-cli ping

# Check database connection
npm run migrate

# Check for port conflicts
lsof -i :5000
```

### Environment variables not loaded?
```bash
# Verify .env file exists
ls -la backend/.env

# Verify syntax (no quotes around values)
cat backend/.env | grep WHATSAPP
```

### Queue not working?
```javascript
// Check Redis connection in logs
// Look for: [Queue] send-whatsapp-message queue ready

// Check Redis manually
redis-cli
> KEYS *
> QUIT
```

---

## 💡 Development Tips

### Debug Mode
```bash
# Run with verbose logging
DEBUG=* npm start

# Or set in .env
DEBUG=bull,queue
```

### Database Migrations
```bash
# Show current migrations
npm run migrate:status

# Rollback last migration
npm run migrate:rollback
```

### Queue Management
```bash
# Monitor queue in real-time
npm run queue:monitor

# Clear failed jobs
npm run queue:clear
```

---

**✨ You're all set!**

Backend sudah ready untuk development. Silakan mulai test endpoints atau integration dengan frontend!

Jika ada error, cek log output atau lihat TESTING_GUIDE.md untuk debugging steps.

Selamat coding! 🎉
