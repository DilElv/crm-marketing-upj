-- PostgreSQL schema for WhatsApp Marketing CRM
-- Requires extension: pgcrypto (for gen_random_uuid)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUM TYPES
-- =========================
CREATE TYPE user_role AS ENUM ('ADMIN', 'MARKETING', 'CS', 'SALES');
CREATE TYPE lead_status AS ENUM (
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'REGISTERED',
  'REJECTED'
);
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'MARKETING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- =========================
-- LEADS
-- =========================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  email TEXT,
  school_origin TEXT,
  city TEXT,
  program_interest TEXT,
  entry_year INTEGER,
  lead_source TEXT,
  status lead_status NOT NULL DEFAULT 'NEW',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_leads_entry_year CHECK (
    entry_year IS NULL OR entry_year BETWEEN 1900 AND 9999
  )
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads (city);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON leads (lower(email));

-- =========================
-- LEAD STATUS HISTORY
-- =========================
CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_status_changed CHECK (old_status IS DISTINCT FROM new_status)
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_by ON lead_status_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history (changed_at DESC);

-- =========================
-- CAMPAIGNS
-- =========================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status campaign_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns (created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns (scheduled_at);

-- =========================
-- MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  meta_message_id TEXT UNIQUE,
  status message_status NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at DESC);

-- =========================
-- AUTOMATIONS
-- =========================
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_automations_is_active ON automations (is_active);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations (trigger_type);

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
