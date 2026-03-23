# 🧪 Quick Testing Guide - Sebelum Real WhatsApp API

**Tujuan**: Verify bahwa semua 3 fixes bekerja dengan baik sebelum terhubung ke real API

---

## 📋 Pre-Test Checklist

```bash
# 1. Start Backend Server
cd backend
npm start
# Expected: Server listening on port 5000

# 2. Verify Redis Running
redis-cli ping
# Expected: PONG

# 3. Backend Health Check
curl http://localhost:5000/
# Expected: { "message": "UPJ WhatsApp CRM Backend is running", "status": "ok" }
```

---

## 🧪 Test #1: Webhook Verification Endpoint

**Tujuan**: Verify endpoint bisa di-akses dan verify logic bekerja

### Test 1A: Verification dengan Token Salah
```bash
curl -X GET "http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=wrong_token"

# Expected Response: 403 Forbidden (atau error message)
```

### Test 1B: Verification dengan Token Benar
Pertama, set di `.env`:
```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=test_token_12345
```

Lalu restart backend, kemudian test:
```bash
curl -X GET "http://localhost:5000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=this_is_challenge_code&hub.verify_token=test_token_12345"

# Expected Response: 200 with body "this_is_challenge_code"
```

**Verifikasi**: Server harus return exact challenge code untuk Meta verification

---

## 🧪 Test #2: Webhook Message Status Update

**Tujuan**: Verify webhookController bisa terima & process webhook dari Meta

### Test 2A: Simulate Webhook - Message Delivered
```bash
curl -X POST http://localhost:5000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "wamid.HBEUGJc0fQ5kDW0p3d0O0gVpK5I",
            "status": "delivered",
            "timestamp": "1678886671"
          }]
        }
      }]
    }]
  }'

# Expected Response: { "success": true }
# Check Backend Logs: [Webhook] Message updated: wamid.xxx → delivered
```

### Test 2B: Simulate Webhook - Message Read
```bash
curl -X POST http://localhost:5000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "wamid.HBEUGJc0fQ5kDW0p3d0O0gVpK5I",
            "status": "read",
            "timestamp": "1678886671"
          }]
        }
      }]
    }]
  }'

# Expected Response: { "success": true }
# Check Backend Logs: [Webhook] Message updated: delivered → read
```

### Test 2C: Verify Status Order Protection (❌ Should Ignore)
```bash
# Try downgrade status: read → delivered (SHOULD BE IGNORED)
curl -X POST http://localhost:5000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "wamid.HBEUGJc0fQ5kDW0p3d0O0gVpK5I",
            "status": "delivered",
            "timestamp": "1678886671"
          }]
        }
      }]
    }]
  }'

# Expected: [Webhook] Ignoring status downgrade: read → delivered
# Database should STILL show "read", not "delivered"
```

---

## 🧪 Test #3: Blast Flow dengan Mock Data

**Tujuan**: Verify queue system & message tracking

### Prerequisites:
1. Backend running
2. Redis running
3. Database with test campaign & leads

### Test 3A: Create Test Data

```sql
-- Login to database first
psql -U postgres -d crm_marketing_db

-- Create test lead
INSERT INTO leads (id, name, phone_number, status) 
VALUES (gen_random_uuid(), 'Test Lead 1', '6281234567890', 'ACTIVE')
RETURNING id;
-- Copy the ID

-- Create test campaign
INSERT INTO campaigns (id, name, template_name, status, created_by_id)
VALUES (gen_random_uuid(), 'Test Campaign', 'welcome', 'DRAFT', gen_random_uuid())
RETURNING id;
-- Copy the ID

-- Link lead to campaign
INSERT INTO campaign_leads (campaign_id, lead_id, selected)
VALUES ('CAMPAIGN_ID_HERE', 'LEAD_ID_HERE', TRUE);
```

### Test 3B: Start Blast
```bash
curl -X POST http://localhost:5000/api/blast/CAMPAIGN_ID_HERE/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "parameters": [],
    "ratePerSecond": 5,
    "retryAttempts": 3
  }'

# Expected Response:
# {
#   "message": "Blast started",
#   "data": {
#     "campaign_id": "xxx",
#     "queued": 1,
#     "rate_per_second": 5,
#     "retry_attempts": 3
#   }
# }
```

### Test 3C: Check Queue Status
```bash
curl http://localhost:5000/api/blast/CAMPAIGN_ID_HERE/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response:
# {
#   "data": {
#     "campaign": { ... },
#     "message_stats": {
#       "total_messages": 1,
#       "sent": 0,
#       "delivered": 0,
#       "read": 0,
#       "failed": 0
#     },
#     "queue": {
#       "waiting": 1,
#       "active": 0,
#       "completed": 0,
#       "failed": 0,
#       "delayed": 0
#     }
#   }
# }
```

### Test 3D: Check Database Message Record
```sql
-- Check if message was inserted dengan campaign_lead_id
SELECT id, campaign_lead_id, lead_id, campaign_id, phone_number, status 
FROM messages 
WHERE campaign_id = 'CAMPAIGN_ID_HERE'
ORDER BY created_at DESC;

-- Expected: Harus ada campaign_lead_id value (bukan NULL)

-- Check campaign_leads status
SELECT id, campaign_id, lead_id, status 
FROM campaign_leads 
WHERE campaign_id = 'CAMPAIGN_ID_HERE';

-- Expected: status = 'sent' atau 'queued'
```

---

## 🧪 Test #4: Transaction Safety

**Tujuan**: Verify Rollback behavior jika error terjadi

### Test 4A: Start Blast dengan Redis Down (simulate transaction rollback)
```bash
# Stop Redis
redis-cli shutdown

# Try start blast
curl -X POST http://localhost:5000/api/blast/CAMPAIGN_ID_HERE/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "parameters": [], "ratePerSecond": 5 }'

# Expected: 503 Service Unavailable
# Expected Response: 
# { "message": "Message queue is unavailable. Ensure Redis is running..." }

# Check Database: Campaign status harus STILL "DRAFT", tidak berubah ke "RUNNING"
# Ini verify ROLLBACK bekerja
```

### Test 4B: Verify Campaign Status Unchanged
```sql
SELECT id, name, status FROM campaigns WHERE id = 'CAMPAIGN_ID_HERE';

-- Expected: status = 'DRAFT' (unchanged)
-- Not 'RUNNING' (would indicate partial transaction)
```

---

## ✅ Expected Results Summary

Jika semua test pass:

| Test | Status | Indikator Sukses |
|------|--------|-----------------|
| Webhook Verification | ✅ | Return challenge code |
| Webhook Status Update | ✅ | Message status updated di DB |
| Status Order Protection | ✅ | Downgrade ignored |
| Campaign_Lead_ID Tracking | ✅ | Message punya campaign_lead_id FK |
| Queue Processing | ✅ | Message_stats show correct counts |
| Transaction Safety | ✅ | Rollback when Redis down |

---

## 📊 Backend Logs yang Diharapkan

Saat semua berjalan semestinya, Anda akan lihat di console:

```
✅ [DB] No pending migrations
✅ [DB] Templates already seeded
✅ [Queue] send-whatsapp-message queue ready
✅ [Queue] blast-campaign queue ready
✅ Server listening on port 5000

[Webhook] Verified webhook for WhatsApp
[Webhook] Processing webhook: changes detected
[Webhook] Message updated: wamid.xxx → delivered
[Queue] Processing message job 1 untuk 6281234567890
[Queue] Message sent successfully - Campaign: xxx, Lead: xxx
```

---

## 🔍 Debugging Tips

Jika ada error:

1. **Check Redis Connection**:
   ```bash
   redis-cli ping
   redis-cli KEYS "*"  # Lihat queue keys
   ```

2. **Check Database**:
   ```sql
   SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM campaign_leads LIMIT 5;
   ```

3. **Check Logs**:
   ```bash
   # Set debug mode di backend
   export DEBUG=*
   npm start
   ```

4. **Check Network**:
   ```bash
   # Verify webhook endpoint accessible
   curl -v http://localhost:5000/api/webhooks/whatsapp
   ```

---

## 🎯 Next: Real WhatsApp API Setup

Setelah semua test pass, siap untuk:

1. Get Meta Business Account
2. Create WhatsApp Business App
3. Verify phone number
4. Add credentials ke `.env`
5. Setup webhook URL di Meta
6. Test dengan real messages

Gunakan guide di [FIXES_IMPLEMENTED.md](./FIXES_IMPLEMENTED.md)!

