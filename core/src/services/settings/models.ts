import type pg from 'pg'

export interface AppSettingsRow {
  id: number
  prompts_retention_enabled: boolean
  prompts_retention_days: number
  messages_inbound_retention_enabled: boolean
  messages_outbound_retention_enabled: boolean
  messages_inbound_retention_days: number
  messages_outbound_retention_days: number
  messages_inbound_zero_retention: boolean
  messages_outbound_zero_retention: boolean
  updated_at: Date
}

export const DEFAULT_SETTINGS: Omit<AppSettingsRow, 'updated_at'> = {
  id: 1,
  prompts_retention_enabled: false,
  prompts_retention_days: 30,
  messages_inbound_retention_enabled: true,
  messages_outbound_retention_enabled: true,
  messages_inbound_retention_days: 30,
  messages_outbound_retention_days: 30,
  messages_inbound_zero_retention: false,
  messages_outbound_zero_retention: false,
}

const SETTINGS_SELECT = `SELECT
  id,
  prompts_retention_enabled,
  prompts_retention_days,
  messages_inbound_retention_enabled,
  messages_outbound_retention_enabled,
  messages_inbound_retention_days,
  messages_outbound_retention_days,
  messages_inbound_zero_retention,
  messages_outbound_zero_retention,
  updated_at
FROM app_settings WHERE id = 1`

export async function getSettings(client: pg.PoolClient): Promise<AppSettingsRow> {
  const result = await client.query<AppSettingsRow>(SETTINGS_SELECT)
  if (result.rows[0]) return result.rows[0]

  const inserted = await client.query<AppSettingsRow>(
    `INSERT INTO app_settings (
       id,
       prompts_retention_enabled,
       prompts_retention_days,
       messages_inbound_retention_enabled,
       messages_outbound_retention_enabled,
       messages_inbound_retention_days,
       messages_outbound_retention_days,
       messages_inbound_zero_retention,
       messages_outbound_zero_retention
     )
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET id = app_settings.id
     RETURNING
       id,
       prompts_retention_enabled,
       prompts_retention_days,
       messages_inbound_retention_enabled,
       messages_outbound_retention_enabled,
       messages_inbound_retention_days,
       messages_outbound_retention_days,
       messages_inbound_zero_retention,
       messages_outbound_zero_retention,
       updated_at`,
    [
      DEFAULT_SETTINGS.prompts_retention_enabled,
      DEFAULT_SETTINGS.prompts_retention_days,
      DEFAULT_SETTINGS.messages_inbound_retention_enabled,
      DEFAULT_SETTINGS.messages_outbound_retention_enabled,
      DEFAULT_SETTINGS.messages_inbound_retention_days,
      DEFAULT_SETTINGS.messages_outbound_retention_days,
      DEFAULT_SETTINGS.messages_inbound_zero_retention,
      DEFAULT_SETTINGS.messages_outbound_zero_retention,
    ],
  )
  return inserted.rows[0]!
}

export async function updateSettings(
  client: pg.PoolClient,
  input: {
    promptsRetentionEnabled: boolean
    promptsRetentionDays: number
    messagesInboundRetentionEnabled: boolean
    messagesOutboundRetentionEnabled: boolean
    messagesInboundRetentionDays: number
    messagesOutboundRetentionDays: number
    messagesInboundZeroRetention: boolean
    messagesOutboundZeroRetention: boolean
  },
): Promise<AppSettingsRow> {
  const result = await client.query<AppSettingsRow>(
    `UPDATE app_settings
     SET prompts_retention_enabled = $1,
         prompts_retention_days = $2,
         messages_inbound_retention_enabled = $3,
         messages_outbound_retention_enabled = $4,
         messages_inbound_retention_days = $5,
         messages_outbound_retention_days = $6,
         messages_inbound_zero_retention = $7,
         messages_outbound_zero_retention = $8,
         updated_at = now()
     WHERE id = 1
     RETURNING
       id,
       prompts_retention_enabled,
       prompts_retention_days,
       messages_inbound_retention_enabled,
       messages_outbound_retention_enabled,
       messages_inbound_retention_days,
       messages_outbound_retention_days,
       messages_inbound_zero_retention,
       messages_outbound_zero_retention,
       updated_at`,
    [
      input.promptsRetentionEnabled,
      input.promptsRetentionDays,
      input.messagesInboundRetentionEnabled,
      input.messagesOutboundRetentionEnabled,
      input.messagesInboundRetentionDays,
      input.messagesOutboundRetentionDays,
      input.messagesInboundZeroRetention,
      input.messagesOutboundZeroRetention,
    ],
  )
  if (result.rows[0]) return result.rows[0]
  return getSettings(client)
}
