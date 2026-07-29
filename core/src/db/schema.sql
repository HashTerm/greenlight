-- Greenlight schema (multi-platform)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_num ON prompts(prompt_num);

CREATE TABLE IF NOT EXISTS prompt_options (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (prompt_id, option_id)
);

CREATE TABLE IF NOT EXISTS channels (
  channel_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'slack', 'teams', 'discord', 'gchat', 'whatsapp', 'messenger')),
  target_chat_id TEXT NOT NULL,
  credentials JSONB NOT NULL,
  callback_url TEXT,
  channel_type TEXT NOT NULL DEFAULT 'MESSAGE' CHECK (channel_type IN ('MESSAGE', 'PROMPT')),
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_platform_target ON channels(platform, target_chat_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(channel_id),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  text TEXT NOT NULL,
  platform TEXT NOT NULL,
  from_user TEXT,
  api_key_id TEXT REFERENCES api_keys(id),
  platform_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
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

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Legacy columns (pre-directional retention); kept for existing DBs only
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_retention_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_retention_days INTEGER NOT NULL DEFAULT 30;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_inbound_retention_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_outbound_retention_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_inbound_retention_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_outbound_retention_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_inbound_zero_retention BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS messages_outbound_zero_retention BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS api_key_id TEXT REFERENCES api_keys(id);
ALTER TABLE messages DROP COLUMN IF EXISTS source;
