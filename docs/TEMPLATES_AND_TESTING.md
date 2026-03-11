# WhatsApp Templates & Testing Procedures

> Kumpulan template examples dan langkah testing untuk WhatsApp Business API

---

## 📋 Template Structure (Meta Requirements)

Semua templates harus di-approve oleh Meta sebelum bisa digunakan. Template bisa contain:
- Header (text, image, atau video)
- Body (variable dengan {{1}}, {{2}}, dst)
- Footer
- Buttons (URL, Quick Reply, atau Call)

---

## 🎯 Recommended Templates untuk UPJ CRM

### Template 1: Hello World (untuk testing)

**Category**: UTILITY  
**Language**: English (untuk testing awal)

**JSON Structure** (untuk create via API):
```json
{
  "name": "hello_world",
  "category": "UTILITY",
  "language": "en",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Hello World"
    },
    {
      "type": "BODY",
      "text": "This is a simple hello world message."
    },
    {
      "type": "FOOTER",
      "text": "Universitas Pembangunan Jaya"
    }
  ]
}
```

---

### Template 2: Info Pendaftaran

**Category**: MARKETING  
**Language**: Indonesian

**Deskripsi**: Template untuk memberikan informasi pendaftaran kepada leads

```json
{
  "name": "info_pendaftaran",
  "category": "MARKETING",
  "language": "id",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "📝 Informasi Pendaftaran UPJ"
    },
    {
      "type": "BODY",
      "text": "Halo {{1}},\n\nTerima kasih atas minat Anda pada Universitas Pembangunan Jaya.\n\n✨ Periode Pendaftaran:\n- Tanggal Pembukaan: {{2}}\n- Tenggat Waktu: {{3}}\n\n🎓 Program yang Tersedia:\n- Teknik Informatika\n- Manajemen Bisnis\n- Akuntansi\n- Dan lainnya\n\nSilahkan klik tombol di bawah untuk mendaftar atau dapatkan info lebih lanjut."
    },
    {
      "type": "FOOTER",
      "text": "Hubungi: +62-21-xxx-xxxx"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "🔗 Daftar Sekarang",
          "url": "https://upj.ac.id/pendaftaran"
        },
        {
          "type": "PHONE_NUMBER",
          "text": "📞 Hubungi Kami",
          "phone_number": "+6221xxxxxxxx"
        }
      ]
    }
  ]
}
```

**Penggunaan**:
```javascript
// Di blast campaign
WhatsAppService.sendTemplateMessage(
  "6281234567890",
  "info_pendaftaran",
  ["Ahmad", "15 Januari 2025", "30 April 2025"]
);
```

---

### Template 3: Info Biaya Pendidikan

**Category**: MARKETING  
**Language**: Indonesian

```json
{
  "name": "info_biaya",
  "category": "MARKETING",
  "language": "id",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "💰 Biaya Pendidikan UPJ"
    },
    {
      "type": "BODY",
      "text": "Halo {{1}},\n\nBerikut informasi biaya pendidikan untuk {{2}}:\n\n💳 Biaya Pendaftaran: Rp. 250.000\n📚 Biaya Akademik/Semester: Rp. 8.500.000\n🏠 Akomodasi (opsional): Rp. 2.000.000/tahun\n\n✅ Tersedia cicilan 4x tanpa bunga\n✅ Beasiswa tersedia untuk mahasiswa berprestasi\n✅ Program kerja sambil kuliah\n\nUntuk info lebih detail silahkan hubungi kami."
    },
    {
      "type": "FOOTER",
      "text": "Promo Early Bird: Diskon 10% untuk pendaftar hingga Januari 2025"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "📋 Lihat Detail Biaya",
          "url": "https://upj.ac.id/biaya"
        }
      ]
    }
  ]
}
```

---

### Template 4: Info Program Studi

**Category**: MARKETING  
**Language**: Indonesian

```json
{
  "name": "info_program",
  "category": "MARKETING",
  "language": "id",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "🎓 Program Studi UPJ"
    },
    {
      "type": "BODY",
      "text": "Halo {{1}},\n\nUPJ menawarkan berbagai program studi unggulan:\n\n💻 **Sarjana S1:**\n- Teknik Informatika\n- Teknik Sipil\n- Manajemen Bisnis\n- Akuntansi\n- Sistem Informasi\n\n📖 **Program Prioritas:**\n- {{2}} dengan fasilitas {{3}}\n\n🏆 **Sertifikasi Internasional:**\n- ABET Accredited\n- Kurikulum Global\n- Praktik Industri\n\nPilih program yang sesuai dengan minat Anda!"
    },
    {
      "type": "FOOTER",
      "text": "Dapatkan konsultasi gratis dengan advisor kami"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Lihat Semua Program",
          "url": "https://upj.ac.id/program-studi"
        }
      ]
    }
  ]
}
```

---

### Template 5: Menu Bantuan (Default)

**Category**: UTILITY  
**Language**: Indonesian

Ini untuk response otomatis ketika user kirim pesan yang tidak cocok dengan keyword apapun.

```json
{
  "name": "menu_bantuan",
  "category": "UTILITY",
  "language": "id",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Menu Bantuan UPJ"
    },
    {
      "type": "BODY",
      "text": "Halo! 👋\n\nSilahkan pilih topik yang ingin Anda tanyakan:\n\n1️⃣ Ketik 'PENDAFTARAN' untuk info pendaftaran\n2️⃣ Ketik 'BIAYA' untuk info biaya pendidikan\n3️⃣ Ketik 'PROGRAM' untuk lihat program studi\n4️⃣ Ketik 'BUKA' untuk info pembukaan penerimaan\n5️⃣ Ketik 'KONTAK' untuk hubungi kami\n\n❓ Atau Anda bisa mengetik pertanyaan langsung dan tim kami akan membalas ASAP."
    },
    {
      "type": "FOOTER",
      "text": "Kami siap membantu Anda! 🎓"
    }
  ]
}
```

---

### Template 6: Konfirmasi Status Pendaftaran

**Category**: MARKETING  
**Language**: Indonesian

Untuk memberitahu lead status pendaftaran mereka.

```json
{
  "name": "status_pendaftaran",
  "category": "MARKETING",
  "language": "id",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "✅ Update Status Pendaftaran"
    },
    {
      "type": "BODY",
      "text": "Halo {{1}},\n\n📌 Status pendaftaran Anda:\n\n**Nama**: {{2}}\n**No. Pendaftaran**: {{3}}\n**Status**: {{4}}\n**Tanggal Update**: {{5}}\n\n{% if status == 'APPROVED' %}\n🎉 Selamat! Anda telah diterima di UPJ.\nMohon lakukan pembayaran SEP sebelum {{6}} untuk melanjutkan.\n\n{% elsif status == 'PENDING' %}\n⏳ Pendaftaran Anda masih dalam proses review.\nKami akan memberitahu hasil evaluasi dalam waktu {{6}} hari kerja.\n\n{% elsif status == 'REJECTED' %}\n😔 Mohon maaf, pendaftaran Anda belum memenuhi kriteria seleksi.\nAnda bisa mendaftar kembali di periode berikutnya.\n\n{% endif %}\n\nUntuk pertanyaan lebih lanjut, hubungi bagian Admisi kami."
    },
    {
      "type": "FOOTER",
      "text": "Universitas Pembangunan Jaya - Admission Team"
    }
  ]
}
```

---

## 🔄 Automation Flows

Contoh automation rules yang bisa di-setup di database:

### Automation 1: Auto-reply untuk incoming chat

**Pattern**: Lead mengirim pesan → Auto-reply dengan menu bantuan

**Database Entry**:
```sql
INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
VALUES (
  'incoming_message',
  '{"messageType": "text"}',
  '{"action": "send_message", "templateName": "menu_bantuan"}',
  true
);
```

### Automation 2: Auto-send follow-up ketika status berubah

**Pattern**: Lead status → INTERESTED → Auto-send info biaya + program

**Database Entry**:
```sql
INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
VALUES (
  'lead_status_changed',
  '{"newStatus": "INTERESTED"}',
  '{"action": "send_message", "templateName": "info_biaya", "delay": 300000}',
  true
);

INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
VALUES (
  'lead_status_changed',
  '{"newStatus": "INTERESTED"}',
  '{"action": "assign_to_user", "userId": "assigned_sales_rep_uuid"}',
  true
);
```

### Automation 3: Reminder untuk belum daftar

**Pattern**: Lead created > 3 hari & status masih NEW → kirim reminder

```sql
INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
VALUES (
  'scheduled_task',
  '{"older_than_days": 3, "status": "NEW"}',
  '{"action": "send_message", "templateName": "info_pendaftaran"}',
  true
);
```

---

## 🧪 Testing Procedures

### Test 1: Verify Webhook Setup

**Objective**: Pastikan webhook di-recognize oleh Meta

```bash
# 1. Ensure ngrok running
ngrok http 3000

# 2. Get ngrok URL: https://abc123.ngrok.io

# 3. Di Meta Console → WhatsApp → Configuration
# Set Callback URL: https://abc123.ngrok.io/api/webhooks/whatsapp
# Set Verify Token: nilai dari META_WEBHOOK_TOKEN di .env

# 4. Click "Verify and Save"

# Expected: Server terima GET request dengan challenge
# Console output: [Webhook] ✅ Verified successfully
```

### Test 2: Manual Message Send

**Objective**: Test sending message dari API

```bash
# 1. Get JWT token dulu (login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upj.ac.id",
    "password": "yourpassword"
  }'

# Save token dari response

# 2. Test send melalui service langsung (development)
# Edit backend/routes/test-whatsapp.js (temporary, untuk testing)

const WhatsAppService = require('../services/whatsappService');

router.get('/test-send', async (req, res) => {
  const result = await WhatsAppService.sendTemplateMessage(
    '6281234567890',
    'hello_world',
    []
  );
  res.json(result);
});

# atau gunakan curl ke WhatsApp API langsung:

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

### Test 3: Incoming Message Webhook

**Objective**: Test receive message dari WhatsApp user

```bash
# 1. Send message dari WhatsApp ke nomor bisnis kamu
# (minta temen send chat ke nomor bisnis)

# 2. Di server terminal, harusnya lihat:
# [Webhook] Processing event type: { hasMessages: true, hasStatuses: false }
# [Message] Received from 6281234567890 at 2024-01-15...
# [Message] Text: "{pesan user}"
# [Automation] Sending template: menu_bantuan
# [Automation] ✅ Message sent: wamid.xxxxx

# 3. Di WhatsApp, harusnya menerima menu_bantuan template
```

### Test 4: Campaign Blast

**Objective**: Test broadcast campaign ke multiple leads

```bash
# 1. Create test leads
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "full_name": "Test User 1",
    "phone_number": "6281234567890",
    "status": "NEW"
  }'

# 2. Create campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "name": "Test Blast Campaign",
    "templateName": "hello_world",
    "targetLeadStatus": "NEW",
    "parameters": []
  }'

# 3. Monitor queue
redis-cli
> KEYS bull:*:waiting
> LRANGE bull:send-whatsapp-message:waiting 0 -1

# 4. Cek messages di database
psql -U postgres -d crm_db
> SELECT * FROM messages ORDER BY sent_at DESC LIMIT 5;

# Expected:
# - Harusnya ada N rows dengan status='sent'
# - meta_message_id terisi dengan ID dari Meta
# - campaign_id sesuai
```

### Test 5: Message Status Updates

**Objective**: Test receiving status updates (delivered, read, failed)

```bash
# 1. Send message seperti di Test 4

# 2. Di WhatsApp user, beri time untuk:
#    - Message delivered
#    - User buka chat
#    - User read message

# 3. Meta webhook akan kirim status update events

# 4. Di server, harusnya lihat:
# [Status] Message {messageId} → delivered
# [Status] Message {messageId} → read

# 5. Verify di database:
psql -U postgres -d crm_db
> SELECT meta_message_id, status, sent_at FROM messages 
  WHERE meta_message_id = 'wamid.xxxxx';

# Expected status progression:
# sent → delivered → read
```

### Test 6: Automation Trigger

**Objective**: Test automation rules

```bash
# 1. Setup automation (manual SQL insert)
psql -U postgres -d crm_db

INSERT INTO automations (trigger_type, condition_json, action_json, is_active)
VALUES (
  'lead_status_changed',
  '{"newStatus": "INTERESTED"}',
  '{"action": "send_message", "templateName": "info_biaya"}',
  true
);

# 2. Update lead status ke INTERESTED
curl -X PUT http://localhost:3000/api/leads/{lead-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"status": "INTERESTED"}'

# 3. Server harusnya trigger automation:
# [Automation] Matched condition for lead_status_changed
# [Automation] Executing: send_message
# [Automation] Sending template: info_biaya

# 4. Lead menerima info_biaya template otomatis
```

---

## 🐛 Debugging Checklist

Ketika ada issue, check:

### Webhook tidak verified
- [ ] ngrok URL benar dan masih running
- [ ] META_WEBHOOK_TOKEN di .env match dengan verify token di Meta
- [ ] Server bisa di-akses dari luar (`ngrok http 3000` running)

### Message tidak terkirim
- [ ] Template status di Meta = "APPROVED" (bukan PENDING atau REJECTED)
- [ ] Phone number format benar (harus 62+nomor tanpa 0 dan +)
- [ ] META_ACCESS_TOKEN masih valid (jangan expired)
- [ ] PHONE_NUMBER_ID benar
- [ ] Template name case-sensitive, harus exact match

### Worker tidak process
- [ ] Redis running (`redis-cli ping`)
- [ ] BullMQ workers initialized (lihat di server startup log)
- [ ] Check redis: `redis-cli ZRANGE bull:send-whatsapp-message:waiting 0 -1`
- [ ] Check failed jobs: `redis-cli ZRANGE bull:send-whatsapp-message:failed 0 -1`

### Automation tidak trigger
- [ ] Automation rule ada di database
- [ ] `is_active = true`
- [ ] `condition_json` match dengan event data
- [ ] Check logs: `[Automation] Matched condition...`

---

## 📊 Monitoring Dashboard (For Backend)

Add temporary endpoint untuk monitor status (hanya untuk dev):

```javascript
// backend/routes/monitoring.js (temporary untuk dev)
router.get('/status', async (req, res) => {
  const messageCount = await db.query(
    'SELECT COUNT(*) as total FROM messages WHERE created_at > now() - interval \'1 day\''
  );
  
  const campaignStatus = await db.query(
    `SELECT status, COUNT(*) as count FROM campaigns GROUP BY status`
  );

  const queueInfo = await messageQueue.getJobCounts();

  res.json({
    messages_24h: messageCount.rows[0].total,
    campaigns: campaignStatus.rows,
    queue: {
      waiting: queueInfo.waiting,
      active: queueInfo.active,
      completed: queueInfo.completed,
      failed: queueInfo.failed,
    },
  });
});
```

---

## 📝 Troubleshooting Logs

Save logs ke file untuk analysis:

```javascript
// backend/jobs/queue.js - add ini untuk persistence

const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/worker.log');

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

messageWorker.on('failed', (job, err) => {
  log(`❌ [FAILED] Job ${job.id}: ${err.message}`);
});

campaignWorker.on('completed', (job) => {
  log(`✅ [COMPLETED] Campaign ${job.id}`);
});
```

---

## ✅ Pre-Production Checklist

Sebelum go-to-production:

- [ ] Semua templates sudah di-approve oleh Meta
- [ ] Webhook URL menggunakan HTTPS (bukan http)
- [ ] Access Token stored secara aman (environment variable)
- [ ] Rate limiting dikonfigurasi (jangan terlalu ketat atau longgar)
- [ ] Database backup sudah di-setup
- [ ] Redis persistence di-enable (`/etc/redis/redis.conf`: appendonly yes)
- [ ] Logging ke file untuk audit trail
- [ ] Error notification sudah di-create (Slack/Email integration)
- [ ] Load testing sudah dilakukan
- [ ] Rollback plan ada (jika deployment gagal)

---

**Last Updated**: March 3, 2026  
**Status**: Ready for testing
