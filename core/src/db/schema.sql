-- Greenlight schema (multi-platform, org-scoped)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
-- idx_prompts_org_channel_num and idx_prompts_broadcast_batch are created after
-- channel_id / broadcast_batch_id columns exist (see per-channel prompt migration below).

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
-- idx_messages_broadcast_batch is created after broadcast_batch_id column exists (see below).

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

-- Upgrade channels PK from legacy single-column to (organization_id, channel_id).
-- Idempotent: skip when composite PK already exists; drop dependent FKs only when
-- recreating a legacy PK.
DO $$
DECLARE
  pk_cols text[];
BEGIN
  IF to_regclass('public.channels') IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum))
  INTO pk_cols
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.contype = 'p' AND c.conrelid = 'channels'::regclass;

  IF pk_cols IS DISTINCT FROM ARRAY['organization_id', 'channel_id']::text[] THEN
    ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_organization_id_channel_id_fkey;
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_organization_id_channel_id_fkey;

    IF pk_cols IS NOT NULL THEN
      ALTER TABLE channels DROP CONSTRAINT channels_pkey;
    END IF;

    ALTER TABLE channels ADD CONSTRAINT channels_pkey PRIMARY KEY (organization_id, channel_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'messages_organization_id_channel_id_fkey'
     ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_organization_id_channel_id_fkey
      FOREIGN KEY (organization_id, channel_id)
      REFERENCES channels(organization_id, channel_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

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

-- Per-channel prompt ids + callback_data (upgrade from org-wide SERIAL prompt_num)
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS callback_data JSONB;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS broadcast_batch_id TEXT;

UPDATE prompts p
SET channel_id = c.channel_id
FROM channels c
WHERE p.organization_id = c.organization_id
  AND p.chat_id = c.target_chat_id
  AND c.channel_type = 'PROMPT'
  AND p.channel_id IS NULL;

UPDATE prompts p
SET channel_id = (
  SELECT c.channel_id FROM channels c
  WHERE c.organization_id = p.organization_id AND c.channel_type = 'PROMPT'
  ORDER BY c.channel_id LIMIT 1
)
WHERE p.channel_id IS NULL;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, channel_id ORDER BY created_at, id
    ) AS new_num
  FROM prompts
  WHERE channel_id IS NOT NULL
)
UPDATE prompts p
SET prompt_num = r.new_num
FROM ranked r
WHERE p.id = r.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'channel_id'
  ) THEN
    ALTER TABLE prompts ALTER COLUMN channel_id SET NOT NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_prompts_org_prompt_num;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'channel_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_org_channel_num
      ON prompts(organization_id, channel_id, prompt_num);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'broadcast_batch_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_prompts_broadcast_batch ON prompts(broadcast_batch_id)
      WHERE broadcast_batch_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = 'prompts_prompt_num_seq'
  ) THEN
    ALTER TABLE prompts ALTER COLUMN prompt_num DROP DEFAULT;
    DROP SEQUENCE prompts_prompt_num_seq;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

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
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Outbound callback auth headers + MESSAGE channel callback_data
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS callback_headers JSONB;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS callback_headers JSONB;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS callback_data JSONB;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS broadcast_batch_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'broadcast_batch_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_broadcast_batch ON messages(broadcast_batch_id)
      WHERE broadcast_batch_id IS NOT NULL;
  END IF;
END $$;

-- Broadcast groups (enterprise): persistent channel collections for fan-out sends
CREATE TABLE IF NOT EXISTS broadcast_groups (
  organization_id TEXT NOT NULL,
  broadcast_group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('prompt', 'message')),
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

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS broadcast_group_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS broadcast_group_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'broadcast_group_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_prompts_broadcast_group ON prompts(broadcast_group_id)
      WHERE broadcast_group_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'broadcast_group_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_broadcast_group ON messages(broadcast_group_id)
      WHERE broadcast_group_id IS NOT NULL;
  END IF;
END $$;

-- Prompt answer modes on broadcast groups and fan-out prompt rows
ALTER TABLE broadcast_groups
  ADD COLUMN IF NOT EXISTS prompt_answer_mode TEXT NOT NULL DEFAULT 'first_answer';

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

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS broadcast_answer_mode TEXT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS broadcast_batch_status TEXT;

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

UPDATE api_keys
SET scopes = array_replace(scopes, 'audit:read', 'audit_log:read')
WHERE 'audit:read' = ANY(scopes);
