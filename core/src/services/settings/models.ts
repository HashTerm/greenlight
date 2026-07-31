import type pg from 'pg'
import { DEFAULT_ORG_ID } from '../../core/org.js'

export interface AppSettingsRow {
  organization_id: string
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

export const DEFAULT_SETTINGS: Omit<AppSettingsRow, 'updated_at' | 'organization_id'> = {
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
FROM app_settings WHERE organization_id = $1`

export async function ensureSettings(
  client: pg.PoolClient,
  organizationId: string = DEFAULT_ORG_ID,
): Promise<void> {
  await client.query(
    `INSERT INTO app_settings (organization_id)
     VALUES ($1)
     ON CONFLICT (organization_id) DO NOTHING`,
    [organizationId],
  )
}

export async function getSettings(
  client: pg.PoolClient,
  organizationId: string,
): Promise<AppSettingsRow> {
  await ensureSettings(client, organizationId)
  const result = await client.query<AppSettingsRow>(SETTINGS_SELECT, [organizationId])
  return result.rows[0]!
}

export async function updateSettings(
  client: pg.PoolClient,
  organizationId: string,
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
  await ensureSettings(client, organizationId)
  const result = await client.query<AppSettingsRow>(
    `UPDATE app_settings
     SET prompts_retention_enabled = $2,
         prompts_retention_days = $3,
         messages_inbound_retention_enabled = $4,
         messages_outbound_retention_enabled = $5,
         messages_inbound_retention_days = $6,
         messages_outbound_retention_days = $7,
         messages_inbound_zero_retention = $8,
         messages_outbound_zero_retention = $9,
         updated_at = now()
     WHERE organization_id = $1
     RETURNING
       organization_id,
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
      organizationId,
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
  return result.rows[0] ?? getSettings(client, organizationId)
}

export async function listOrganizationIds(client: pg.PoolClient): Promise<string[]> {
  const result = await client.query<{ organization_id: string }>(
    'SELECT organization_id FROM app_settings',
  )
  return result.rows.map((row) => row.organization_id)
}
