-- Greenlight schema (multi-platform, org-scoped)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  prompt_num SERIAL,
  chat_id TEXT NOT NULL,
  message_id BIGINT,
  text TEXT NOT NULL,
  media_url TEXT,
  options JSONB,
  allow_text BOOLEAN NOT NULL DEFAULT false,
  callback_url TEXT,
  correlation_id TEXT,
  state TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  answered_by_id BIGINT,
  answered_by_username TEXT,
  answer JSONB
);

CREATE INDEX IF NOT EXISTS idx_prompts_state ON prompts(state);
CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_prompts_org_prompt_num ON prompts(organization_id, prompt_num);

CREATE TABLE IF NOT EXISTS prompt_options (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (prompt_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_options_prompt ON prompt_options(prompt_id);

CREATE TABLE IF NOT EXISTS pending_text_replies (
  organization_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  prompt_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_text_replies_expires ON pending_text_replies(expires_at);

CREATE TABLE IF NOT EXISTS channels (
  organization_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'slack', 'teams', 'discord', 'gchat', 'whatsapp', 'messenger')),
  target_chat_id TEXT NOT NULL,
  credentials JSONB NOT NULL,
  callback_url TEXT,
  channel_type TEXT NOT NULL DEFAULT 'MESSAGE' CHECK (channel_type IN ('MESSAGE', 'PROMPT')),
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_platform_target ON channels(platform, target_chat_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_org ON channels(organization_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  text TEXT NOT NULL,
  platform TEXT NOT NULL,
  from_user TEXT,
  api_key_id TEXT REFERENCES api_keys(id),
  platform_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, channel_id) REFERENCES channels(organization_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(organization_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

CREATE TABLE IF NOT EXISTS app_settings (
  organization_id TEXT PRIMARY KEY,
  prompts_retention_enabled BOOLEAN NOT NULL DEFAULT false,
  prompts_retention_days INTEGER NOT NULL DEFAULT 30,
  messages_inbound_retention_enabled BOOLEAN NOT NULL DEFAULT true,
  messages_outbound_retention_enabled BOOLEAN NOT NULL DEFAULT true,
  messages_inbound_retention_days INTEGER NOT NULL DEFAULT 30,
  messages_outbound_retention_days INTEGER NOT NULL DEFAULT 30,
  messages_inbound_zero_retention BOOLEAN NOT NULL DEFAULT false,
  messages_outbound_zero_retention BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (organization_id) VALUES ('default') ON CONFLICT (organization_id) DO NOTHING;

-- Breaking migration from pre-org schema (required upgrade step)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS organization_id TEXT;
UPDATE api_keys SET organization_id = 'default' WHERE organization_id IS NULL;
ALTER TABLE api_keys ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS organization_id TEXT;
UPDATE prompts SET organization_id = 'default' WHERE organization_id IS NULL;
ALTER TABLE prompts ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS organization_id TEXT;
UPDATE channels SET organization_id = 'default' WHERE organization_id IS NULL;
ALTER TABLE channels ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id TEXT;
UPDATE messages SET organization_id = 'default' WHERE organization_id IS NULL;
ALTER TABLE messages ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_organization_id_channel_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'channels_pkey' AND conrelid = 'channels'::regclass
  ) THEN
    ALTER TABLE channels DROP CONSTRAINT channels_pkey;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE channels ADD CONSTRAINT channels_pkey PRIMARY KEY (organization_id, channel_id);

ALTER TABLE messages
  ADD CONSTRAINT messages_organization_id_channel_id_fkey
  FOREIGN KEY (organization_id, channel_id)
  REFERENCES channels(organization_id, channel_id);

-- Migrate app_settings singleton to per-org
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'id'
  ) THEN
    INSERT INTO app_settings (
      organization_id,
      prompts_retention_enabled,
      prompts_retention_days,
      messages_inbound_retention_enabled,
      messages_outbound_retention_enabled,
      messages_inbound_retention_days,
      messages_outbound_retention_days,
      messages_inbound_zero_retention,
      messages_outbound_zero_retention,
      updated_at
    )
    SELECT
      'default',
      prompts_retention_enabled,
      prompts_retention_days,
      messages_inbound_retention_enabled,
      messages_outbound_retention_enabled,
      messages_inbound_retention_days,
      messages_outbound_retention_days,
      messages_inbound_zero_retention,
      messages_outbound_zero_retention,
      updated_at
    FROM app_settings WHERE id = 1
    ON CONFLICT (organization_id) DO NOTHING;

    ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_id_check;
    ALTER TABLE app_settings DROP COLUMN IF EXISTS id;
  END IF;
END $$;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS organization_id TEXT;
UPDATE app_settings SET organization_id = 'default' WHERE organization_id IS NULL;
ALTER TABLE app_settings ALTER COLUMN organization_id SET NOT NULL;

-- Legacy columns (pre-directional retention)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_retention_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_retention_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS api_key_id TEXT REFERENCES api_keys(id);
ALTER TABLE messages DROP COLUMN IF EXISTS source;

CREATE TABLE IF NOT EXISTS organization_licenses (
  organization_id TEXT PRIMARY KEY,
  license_payload TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
