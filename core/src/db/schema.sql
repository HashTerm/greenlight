-- Greenlight schema (multi-platform, org-scoped, fresh-install only)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS channels (
  organization_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'slack', 'teams', 'discord', 'gchat', 'whatsapp', 'messenger')),
  target_chat_id TEXT NOT NULL,
  credentials JSONB NOT NULL,
  callback_url TEXT,
  callback_headers JSONB,
  callback_data JSONB,
  channel_type TEXT NOT NULL DEFAULT 'MESSAGE' CHECK (channel_type IN ('MESSAGE', 'PROMPT')),
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_platform_target ON channels(platform, target_chat_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_org ON channels(organization_id);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  prompt_num INTEGER NOT NULL,
  chat_id TEXT NOT NULL,
  message_id BIGINT,
  text TEXT NOT NULL,
  media_url TEXT,
  options JSONB,
  allow_text BOOLEAN NOT NULL DEFAULT false,
  callback_url TEXT,
  callback_headers JSONB,
  correlation_id TEXT,
  callback_data JSONB,
  broadcast_batch_id TEXT,
  broadcast_group_id TEXT,
  broadcast_answer_mode TEXT,
  broadcast_batch_status TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_org_channel_num
  ON prompts(organization_id, channel_id, prompt_num);
CREATE INDEX IF NOT EXISTS idx_prompts_broadcast_batch ON prompts(broadcast_batch_id)
  WHERE broadcast_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_broadcast_group ON prompts(broadcast_group_id)
  WHERE broadcast_group_id IS NOT NULL;

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
  broadcast_batch_id TEXT,
  broadcast_group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, channel_id) REFERENCES channels(organization_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(organization_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_broadcast_batch ON messages(broadcast_batch_id)
  WHERE broadcast_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_broadcast_group ON messages(broadcast_group_id)
  WHERE broadcast_group_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS organization_licenses (
  organization_id TEXT PRIMARY KEY,
  license_payload TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_groups (
  organization_id TEXT NOT NULL,
  broadcast_group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('prompt', 'message')),
  prompt_answer_mode TEXT NOT NULL DEFAULT 'first_answer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, broadcast_group_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_groups_org ON broadcast_groups(organization_id);

CREATE TABLE IF NOT EXISTS broadcast_group_channels (
  organization_id TEXT NOT NULL,
  broadcast_group_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  PRIMARY KEY (organization_id, broadcast_group_id, channel_id),
  FOREIGN KEY (organization_id, channel_id)
    REFERENCES channels(organization_id, channel_id),
  FOREIGN KEY (organization_id, broadcast_group_id)
    REFERENCES broadcast_groups(organization_id, broadcast_group_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prompts_organization_id_channel_id_fkey'
  ) THEN
    ALTER TABLE prompts
      ADD CONSTRAINT prompts_organization_id_channel_id_fkey
      FOREIGN KEY (organization_id, channel_id)
      REFERENCES channels(organization_id, channel_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broadcast_groups_prompt_answer_mode_check'
  ) THEN
    ALTER TABLE broadcast_groups
      ADD CONSTRAINT broadcast_groups_prompt_answer_mode_check
      CHECK (prompt_answer_mode IN ('first_answer', 'all_answer_same', 'all_answer_majority'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prompts_broadcast_answer_mode_check'
  ) THEN
    ALTER TABLE prompts
      ADD CONSTRAINT prompts_broadcast_answer_mode_check
      CHECK (
        broadcast_answer_mode IS NULL OR
        broadcast_answer_mode IN ('first_answer', 'all_answer_same', 'all_answer_majority')
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prompts_broadcast_batch_status_check'
  ) THEN
    ALTER TABLE prompts
      ADD CONSTRAINT prompts_broadcast_batch_status_check
      CHECK (
        broadcast_batch_status IS NULL OR
        broadcast_batch_status IN ('COLLECTING', 'RESOLVED', 'CONFLICT', 'EXPIRED')
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
