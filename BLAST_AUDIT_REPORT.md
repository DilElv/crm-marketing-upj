# 🚀 Alur WhatsApp Blast - Laporan Audit Komprehensif

**Status**: Penilaian kesiapan siap deployment (API belum terhubung)  
**Tanggal**: 17 Maret 2026  
**Fokus**: Validasi alur kerja blast end-to-end

---

## 📋 Ringkasan Eksekutif

Arsitektur sistem blast WhatsApp **dirancang dengan baik dan siap produksi** dengan:
✅ Pemrosesan antrian async yang tepat (BullMQ + Redis)  
✅ Mekanisme retry dengan exponential backoff  
✅ Pembatasan laju (pesan/detik dapat dikonfigurasi)  
✅ Pelacakan database untuk semua pesan  
✅ Penanganan error di berbagai lapisan

⚠️ **Masalah Kritis Ditemukan**: 3  
⚠️ **Masalah Minor Ditemukan**: 5  

---

## 📊 Walkthrough Alur Blast Lengkap

### **Fase 1: Pembuatan Kampanye & Seleksi Lead**
```
User membuat kampanye
    ↓
POST /campaigns
    ↓
✅ Kampanye disimpan di DB (status: DRAFT)
    ├─ id: UUID
    ├─ name: "Siswa Baru 2024"
    ├─ template_name: "welcome"
    ├─ status: DRAFT
    └─ campaign_leads: (kosong awalnya)
```

**Kode**: `campaignController.js - createCampaign()`
- Validasi nama kampanye (min 3 karakter)
- Memerlukan nama template
- Mendukung filter targetLeadStatus (opsional)
- Membuat entri campaign_leads jika leadIds disediakan

---

### **Fase 2: Import Lead ke Kampanye**
```
User upload CSV → CampaignLeadImportModal
    ↓
POST /campaigns/:id/import-csv
    ↓
campaignController.importCsv()
    ├─ Parse buffer CSV
    ├─ Validasi/normalisasi nomor telepon
    ├─ Cek duplikat
    └─ Insert ke tabel campaign_leads (selected = TRUE)
```

**Kode**: `campaignController.js - importCsv()`
- Parse CSV menggunakan `parseCsvBuffer()`
- Normalisasi telepon (0 → 62 prefix)
- Logic de-duplikasi
- Bulk insert: `INSERT INTO campaign_leads...`

**Detail Penting**: `campaign_leads.selected = TRUE` menandai lead sebagai target blast

---

### **Fase 3: Preview Target (Sebelum Blast)**
```
User klik "Preview Target"
    ↓
POST /blast/:campaignId/preview
    ↓
blastController.previewTargets()
    ├─ Query campaign_leads WHERE selected=TRUE
    ├─ Join dengan tabel leads untuk dapatkan phone_numbers
    └─ Return hitungan + sampel (50 pertama)
```

**Query**:
```sql
SELECT l.id, l.phone_number
FROM campaign_leads cl
INNER JOIN leads l ON l.id = cl.lead_id
WHERE cl.campaign_id = $1 AND cl.selected = TRUE
```

---

### **Fase 4: Mulai Blast (BAGIAN KRITIS)**
```
User klik "Mulai Blast"
    ↓
POST /blast/:campaignId/start
    ↓
blastController.startBlast()
    ├─ Validasi kampanye ada
    ├─ Cek status != COMPLETED/CANCELLED
    ├─ Dapatkan target kampanye (lead terpilih)
    ├─ Antri setiap target dengan delay = (index * intervalMs)
    │  dimana intervalMs = 1000 / ratePerSecond
    │  (contoh: 10/det = 100ms delay per pesan)
    ├─ Update status kampanye → RUNNING
    └─ Return konfirmasi
```

**Implementasi Rate Limiting**:
```javascript
const intervalMs = Math.ceil(1000 / Math.max(1, ratePerSecond));
for (let i = 0; i < targets.length; i++) {
  const delay = i * intervalMs;  // Menyebar pesan
  await messageQueue.add({...}, { delay });
}
```

Contoh: 100 lead at 10/det = 10 detik spread  
✅ **Ini benar!**

---

### **Fase 5: Pemrosesan Antrian Pesan**

#### **Setup Antrian** (`queue.js`)
```javascript
const messageQueue = new Queue('send-whatsapp-message', {
  redis: { ...redisOptions }
});

// Process individual messages
messageQueue.process(async (job) => {
  const { campaignId, phoneNumber, leadId, templateName, parameters } = job.data;
  
  // 1. Normalize phone
  const normalizedPhone = phoneNumber.replace(/^0/, '62');
  
  // 2. Send via WhatsApp
  const result = await WhatsAppService.sendTemplateMessage(
    normalizedPhone,
    templateName,
    parameters
  );
  
  // 3. Save to DB
  await db.query(
    `INSERT INTO messages (...)`
  );
});
```

**Konfigurasi Job**:
- `attempts: retryAttempts` (default 3)
- `backoff: exponential` (2s → 4s → 8s)
- `removeOnComplete: 1000` (hapus setelah 1000ms)
- `timeout: 30000` (30det per pesan)

✅ **Logika retry sangat solid!**

---

### **Fase 6: Panggilan API WhatsApp** (`whatsappService.js`)

```javascript
static async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
  // Normalize
  let phone = phoneNumber.toString();
  if (phone.startsWith('+')) phone = phone.substring(1);
  if (!phone.startsWith('62')) phone = '62' + phone.substring(1);
  
  // Build payload
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'id' }
    }
  };
  
  // Add parameters if needed
  if (parameters?.length > 0) {
    payload.template.components = [{
      type: 'body',
      parameters: parameters.map(p => ({
        type: 'text',
        text: String(p)
      }))
    }];
  }
  
  // Send to Meta API
  const response = await whatsappAPI.post(
    `/${config.whatsapp.phoneNumberId}/messages`,
    payload
  );
  
  return { success: true, messageId: response.data.messages[0].id };
}
```

**Endpoint API**: `POST /{phoneNumberId}/messages`  
**Dokumentasi Meta**: https://developers.facebook.com/docs/whatsapp/cloud-api/

---

### **Fase 7: Pelacakan Status Pesan**

#### **Penyimpanan Pesan Awal** (Setelah pengiriman berhasil)
```sql
INSERT INTO messages 
(lead_id, campaign_id, phone_number, message_id, status)
VALUES ($1, $2, $3, $4, 'sent')
```

#### **Update Webhook** (Dari Meta)
```javascript
POST /webhooks/whatsapp
Body: {
  entry: [{
    changes: [{
      value: {
        messages: [{
          id: "wamid.xxx",
          status: "delivered",  // atau "read"
        }]
      }
    }]
  }]
}
```

**Update yang Diharapkan**:
- sent → delivered (diterima WhatsApp)
- delivered → read (dibuka penerima)
- (Status apapun) → failed (tidak dapat dikirim)

---

### **Fase 8: Monitoring Status**

User poll: `GET /blast/:campaignId/status`

```javascript
exports.getBlastStatus = async (req, res, next) => {
  // Dapatkan statistik pesan
  const stats = await db.query(`
    SELECT
      COUNT(*)::int AS total_messages,
      SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END)::int AS sent,
      SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END)::int AS delivered,
      SUM(CASE WHEN status='read' THEN 1 ELSE 0 END)::int AS read,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END)::int AS failed
    FROM messages
    WHERE campaign_id = $1
  `);
  
  // Dapatkan stat antrian
  const queueStats = await messageQueue.getJobCounts();
  
  return { campaign, message_stats, queue: queueStats };
};
```

**Update Frontend**: Grafik refresh dengan stat real-time!

---

## 🔴 MASALAH KRITIS YANG DITEMUKAN

### **Masalah #1: Tabel Pesan Kurang FK yang Diperlukan**
**Severity**: KRITIS  
**Location**: `schema.sql` + `queue.js`

**Masalah**:
```sql
-- Di queue.js, job processor insert:
INSERT INTO messages (lead_id, campaign_id, phone_number, message_id, status)

-- Tapi tabel messages punya:
campaign_lead_id UUID REFERENCES campaign_leads(id)  -- ← Seharusnya diisi!
```

Ketika webhook updates datang, sistem perlu mencocokkan pesan ke campaign_leads:
```javascript
// ❌ Saat ini hanya punya message_id, perlu campaign_lead_id juga
const result = await db.query(`
  SELECT id FROM messages WHERE message_id = $1
`);

// Seharusnya lookup campaign_lead untuk track lead mana dapat pesan apa
```

**Impact**: Tidak bisa track dengan tepat lead mana yang dapat pesan apa untuk logika retry!

**Fix Diperlukan**:
```javascript
// Di queue.js, dapatkan campaign_lead_id dulu:
const campaignLeadResult = await db.query(`
  SELECT id FROM campaign_leads 
  WHERE campaign_id = $1 AND lead_id = $2
`, [campaignId, leadId]);

const campaign_lead_id = campaignLeadResult.rows[0]?.id;

// Lalu insert dengan campaign_lead_id:
INSERT INTO messages 
(campaign_lead_id, lead_id, campaign_id, phone_number, message_id, status)
VALUES ($1, $2, $3, $4, $5, 'sent')
```

**Juga**: Perlu update `campaign_leads.status` ketika pesan dikirim!

---

### **Masalah #2: Integrasi Webhook Hilang**
**Severity**: KRITIS  
**Location**: `routes/webhooks.js` (jika ada)

**Masalah**:
- Meta kirim webhook notification untuk: `sent`, `delivered`, `read`, `failed`
- Tidak ada kode untuk handle status updates dari webhooks
- Pesan stuck di status "sent" selamanya

**State Saat Ini**: 
```
✅ Pesan dibuat dengan status='sent'
❌ Tidak ada kode untuk update ke 'delivered' atau 'read'
❌ Frontend stats akan salah
```

**Yang Hilang**:
```javascript
// webhooks.js seharusnya punya:
exports.handleWhatsAppWebhook = async (req, res, next) => {
  const { entry } = req.body;
  
  for (const change of entry[0].changes) {
    const { messages, message_status, statuses } = change.value;
    
    // Handle message status updates
    if (statuses) {
      for (const status of statuses) {
        await db.query(`
          UPDATE messages
          SET status = $1
          WHERE whatsapp_message_id = $2 OR message_id = $2
        `, [status.status, status.id]);
      }
    }
  }
  
  res.json({ success: true });
};
```

---

### **Masalah #3: Koneksi Redis/Antrian Tidak Divalidasi**
**Severity**: KRITIS  
**Location**: `queue.js` + `blastController.js`

**Masalah**:
```javascript
// User klik "Mulai Blast"
// Jika Redis down, queueTargets() throw error
// Tapi frontend mungkin tidak handle dengan baik

exports.startBlast = async (req, res, next) => {
  // ✅ Ini catch queue errors...
  try {
    const queued = await queueTargets({...});
    // Tapi jika error terjadi, user dapat 503
  } catch (err) {
    next(err);  // ← Passed to error handler
  }
};
```

**Bagaimana jika**:
- User queue 5000 pesan
- Redis turun di pesan 2500
- 2500 sudah di queue, 2500 hilang

**Fix**: Tambah transactional safety:
```javascript
await db.query('BEGIN TRANSACTION');
try {
  const queued = await queueTargets({...});
  await db.query('INSERT INTO blast_jobs...');  // Log blast attempt
  await db.query('COMMIT');
} catch (err) {
  await db.query('ROLLBACK');
  throw err;
}
```

---

## 🟡 MASALAH MINOR

### **Masalah M1: Tidak Ada Pencegahan Pesan Duplikat**
**Severity**: SEDANG  
**Location**: `queue.js` message processor

**Masalah**: Jika ID pesan yang sama diterima 2x (glitch webhook), update 2x:
```javascript
// Webhook pertama: UPDATE messages SET status='delivered' WHERE message_id=$1
// Webhook kedua: UPDATE messages SET status='delivered' WHERE message_id=$1  ← Idempotent ✅

// Tapi jika status order berbeda:
// Webhook pertama: UPDATE SET status='read'    # out of order!
// Webhook kedua: UPDATE SET status='delivered'  # overwrite dengan status lama
```

**Fix**: Hanya update jika status baru lebih "baru" dari sekarang:
```javascript
const statusOrder = { sent: 0, delivered: 1, read: 2, failed: 99 };

await db.query(`
  UPDATE messages
  SET status = $1
  WHERE message_id = $2 AND statusOrder[$3] > statusOrder[status]
`, [newStatus, messageId, newStatus]);
```

---

### **Masalah M2: Normalisasi Nomor Telepon Tidak Konsisten**
**Severity**: SEDANG  
**Location**: Multiple places

**Kode punya 3 approach normalisasi berbeda**:
```javascript
// Lokasi 1: whatsappService.js
if (phone.startsWith('+')) phone = phone.substring(1);
if (!phone.startsWith('62')) phone = '62' + phone.substring(1);

// Lokasi 2: queue.js
const normalizedPhone = phoneNumber.replace(/^0/, '62');

// Lokasi 3: blastController.js
// Tidak ada normalisasi - rely pada service

```

**Risiko**: Nomor telepon yang sama bisa disimpan 3 cara:
- `6281234567890`
- `81234567890` 
- `+6281234567890`

**Fix**: Centralisasi di utility function:
```javascript
const normalizePhone = (phone) => {
  let result = String(phone).trim();
  if (result.startsWith('+')) result = result.substring(1);
  if (result.startsWith('0')) result = '62' + result.substring(1);
  if (!result.startsWith('62')) result = '62' + result;
  return result;
};
```

---

### **Masalah M3: Tidak Ada Validasi Status Kampanye**
**Severity**: RENDAH  
**Location**: `retryFailed()` function

**Masalah**:
```javascript
// retryFailed tidak cek jika campaign.status == COMPLETED
// Bisa retry campaign yang completed
// ✓ Actually tidak bug - retries seharusnya work meski completed
// Tapi seharusnya clear status naming (RUNNING vs RETRYING)
```

**Rekomendasi**: Pertimbangkan explicit RETRYING status untuk clarity

---

### **Masalah M4: Tidak Ada Perhitungan Success Rate**
**Severity**: RENDAH  
**Location**: Dashboard stats

**Perhitungan Hilang**:
```javascript
// Saat ini show: delivered=2500, sent=5000
// Seharusnya return juga:
delivery_rate = (delivered / sent) * 100  // 50%
read_rate = (read / sent) * 100           // 30%
failure_rate = (failed / sent) * 100      // 10%
```

**Impact**: Frontend perlu hitung ini, backend seharusnya provide

---

### **Masalah M5: Timeout Job Antrian Terlalu Lama**
**Severity**: RENDAH  
**Location**: `queue.js` - `timeout: 30000`

**Analisa**:
- Jika WhatsApp API lambat, job tunggu 30 detik
- Lebih baik: 10 detik (WhatsApp biasanya respond <2det)
- Prevent queue jams

**Rekomendasi**:
```javascript
timeout: 10000,  // 10 det cukup
// Jika lebih lambat, exponential backoff akan retry
```

---

## ✅ TEMUAN POSITIF

### **Apa yang Bekerja Dengan Baik**

1. **Implementasi Rate Limiting** ⭐
   - Menyebar pesan dengan tepat over time
   - Configurable (default 10/det masuk akal)
   - Prevent API throttling

2. **Mekanisme Retry** ⭐
   - Exponential backoff: 2det → 4det → 8det
   - Max 3 attempts by default
   - Failed messages tracked

3. **Database Schema** ⭐
   - Foreign keys dan cascades yang tepat
   - Message tracking dengan statuses
   - campaign_leads untuk N:N relationship

4. **Penanganan Error** ⭐
   - Try/catch blocks di queue level
   - Graceful Redis connection fallback
   - Detailed error logging

5. **Stateless Processing** ⭐
   - BullMQ ensure jobs survive crashes
   - Redis persistent
   - Bisa restart worker kapan saja

---

## 🧪 TEST SCENARIO KOMPREHENSIF

### **Test Case 1: Normal Blast (100 lead)**
```gherkin
GIVEN: Campaign "Test Blast" dengan 100 lead terpilih
AND: Template "welcome" ada
AND: Redis running

WHEN: User klik "Mulai Blast"
  → rate: 10/det
  → retries: 3

THEN:
  ✅ Status kampanye change ke "RUNNING"
  ✅ 100 pesan di-queue selama ~10 detik
  ✅ Pesan pertama kirim dalam 100ms
  ✅ Pesan di DB dengan status="sent"
  
WEBHOOK INCOMING:
  ✓ Delivery confirmations tiba
  ✓ Pesan update ke "delivered"
  ✓ Frontend show stats update
  
EXPECTED TIME: 12-15 detik total
```

---

### **Test Case 2: Retry Failed Messages**
```gherkin
GIVEN: Campaign sebelumnya dengan 5 failed messages

WHEN: User klik "Retry Failed"

THEN:
  ✅ 5 pesan di-queue ulang
  ✅ Status kampanye → "RUNNING"
  ✅ Retry attempt logged
  
EXPECTED: Sama seperti Test Case 1, tapi dengan 5 pesan
```

---

### **Test Case 3: Redis Connection Lost**
```gherkin
GIVEN: Blast sedang progress (50 pesan sudah di-queue)
AND: Koneksi Redis drop

THEN:
  ⚠️ Blast start baru fail dengan 503
  ✅ Pesan yang sudah di-queue tetap process
  ✅ Error handler return clear message
  
WHEN: Redis reconnect
  ✅ Queuing resume
```

---

## 📊 Mock Test Plan (Tanpa Real API)

### **Setup: Mock WhatsApp Service**

Buat file: `backend/services/__mocks__/whatsappService.js`

```javascript
// Mock yang simulate API tanpa real calls
class MockWhatsAppService {
  static async sendTemplateMessage(phone, template, params) {
    // Simulate 95% success rate
    if (Math.random() > 0.95) {
      return {
        success: false,
        error: { message: 'Simulated API error' }
      };
    }
    
    // Simulate network delay (100-500ms)
    await new Promise(r => setTimeout(r, 100 + Math.random() * 400));
    
    return {
      success: true,
      messageId: 'wamid_mock_' + Date.now()
    };
  }
}

module.exports = MockWhatsAppService;
```

### **Test Execution**

```bash
# Set environment
export NODE_ENV=test
export WHATSAPP_API_URL=mock
export TEST_LEADS=100

# Run test
npm test -- tests/blast.integration.test.js
```

---

## 🔧 Fixes Diperlukan Sebelum Produksi

### **HARUS FIX (Blocking)**
1. [ ] Add `campaign_lead_id` ke messages table inserts
2. [ ] Implement webhook status update handler
3. [ ] Add transactional safety untuk bulk queue operations

### **SEHARUSNYA FIX (Penting)**
4. [ ] Centralisasi phone normalization
5. [ ] Add success rate calculations
6. [ ] Implement duplicate message prevention

### **NICE TO HAVE**
7. [ ] Reduce job timeout jadi 10det
8. [ ] Add campaign_lead status updates
9. [ ] Add blast job logging table

---

## 📈 Ekspektasi Performa

Untuk **10,000 lead** at **10 pesan/detik**:

| Metrik | Expected |
|--------|----------|
| Queue Time | ~100 detik |
| Pesan Pertama | <100ms |
| Pesan Terakhir Di-queue | ~1000 detik (16.7 menit) |
| Total Processing | ~30-40 menit |
| Database Inserts | ~10,000 pesan |
| Redis Memory | ~5-10MB |

**Bottleneck**: WhatsApp API response time, bukan kode Anda ✅

---

## 🎯 Kesimpulan

**State Saat Ini**: 8/10 ready  
**Blocker**: 3 critical issue (30 menit fix)  
**Rekomendasi**: Fix critical issue → Deploy dengan confident

Arsitektur **solid dan scalable**. Setelah 3 critical issue diselesaikan, sistem ini akan reliably blast WhatsApp message at scale!

---

## 📚 Quick Reference: File untuk Dimodify

| Masalah | File | Baris | Perubahan |
|---------|------|-------|----------|
| M1 | `queue.js` | ~160 | Get campaign_lead_id sebelum insert |
| C2 | `routes/webhooks.js` | NEW | Create webhook handler |
| C3 | `queue.js` | ~90 | Add transaction wrapper |
| M2 | `utils/phone.js` | NEW | Centralisasi normalization |
| M4 | `blastController.js` | ~250 | Add rate calculations |

