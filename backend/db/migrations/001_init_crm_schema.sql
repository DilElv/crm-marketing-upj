CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MARKETING'
    CHECK (role IN ('ADMIN', 'MARKETING', 'CS', 'SALES')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'MARKETING',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  message_body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'MARKETING',
  language TEXT NOT NULL DEFAULT 'id',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS templates
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS message_body TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'MARKETING',
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates (name);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates (status);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT,
  program_interest TEXT,
  school_origin TEXT,
  entry_year INTEGER,
  lead_source TEXT,
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED', 'REJECTED')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS leads
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS program_interest TEXT,
  ADD COLUMN IF NOT EXISTS school_origin TEXT,
  ADD COLUMN IF NOT EXISTS entry_year INTEGER,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads (phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads (city);

CREATE OR REPLACE FUNCTION sync_lead_name_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := COALESCE(NULLIF(NEW.name, ''), NULLIF(NEW.full_name, ''));
  NEW.full_name := COALESCE(NULLIF(NEW.full_name, ''), NEW.name);

  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'Lead name is required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lead_name_columns ON leads;
CREATE TRIGGER trg_sync_lead_name_columns
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION sync_lead_name_columns();

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED')),
  scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS campaigns
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns (template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
  selected BOOLEAN NOT NULL DEFAULT TRUE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id)
);

ALTER TABLE IF EXISTS campaign_leads
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS selected BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON campaign_leads (lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads (status);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  whatsapp_message_id TEXT UNIQUE,
  message_id TEXT UNIQUE,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  automation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS messages
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS campaign_lead_id UUID,
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS automation_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_messages_campaign_lead_id ON messages (campaign_lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  action JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS automations
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT,
  ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS action JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_messages_automation'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT fk_messages_automation
      FOREIGN KEY (automation_id)
      REFERENCES automations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS lead_status_history
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS old_status TEXT,
  ADD COLUMN IF NOT EXISTS new_status TEXT,
  ADD COLUMN IF NOT EXISTS changed_by UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history (changed_at DESC);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'INFO',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS logs
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'INFO',
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs (user_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs (created_at DESC);

INSERT INTO templates (name, message_body, category, language, status)
VALUES
  ('welcome', 'Halo {{1}}, terima kasih telah bergabung.', 'MARKETING', 'id', 'ACTIVE'),
  ('promo_blast', 'Promo terbaru untuk {{1}}! Klik tautan ini {{2}}', 'MARKETING', 'id', 'ACTIVE'),
  ('follow_up', 'Hai {{1}}, kami follow up info sebelumnya ya.', 'MARKETING', 'id', 'ACTIVE'),
  ('confirmation', 'Konfirmasi: {{1}}', 'UTILITY', 'id', 'ACTIVE'),
  ('reminder', 'Reminder untuk {{1}} pada {{2}}', 'UTILITY', 'id', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;
