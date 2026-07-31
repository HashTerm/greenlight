import { withClient } from '../../db/client.js'
import * as promptModels from '../prompts/models.js'
import { purgeOldMessagesByDirection } from '../messages/service.js'
import * as settingsModels from './models.js'

export type RetentionSettings = {
  prompts_retention_enabled: boolean
  prompts_retention_days: number
  messages_inbound_retention_enabled: boolean
  messages_outbound_retention_enabled: boolean
  messages_inbound_retention_days: number
  messages_outbound_retention_days: number
  messages_inbound_zero_retention: boolean
  messages_outbound_zero_retention: boolean
  updated_at: string
}

export const DEFAULT_RETENTION_SETTINGS: Omit<RetentionSettings, 'updated_at'> = {
  prompts_retention_enabled: settingsModels.DEFAULT_SETTINGS.prompts_retention_enabled,
  prompts_retention_days: settingsModels.DEFAULT_SETTINGS.prompts_retention_days,
  messages_inbound_retention_enabled:
    settingsModels.DEFAULT_SETTINGS.messages_inbound_retention_enabled,
  messages_outbound_retention_enabled:
    settingsModels.DEFAULT_SETTINGS.messages_outbound_retention_enabled,
  messages_inbound_retention_days: settingsModels.DEFAULT_SETTINGS.messages_inbound_retention_days,
  messages_outbound_retention_days:
    settingsModels.DEFAULT_SETTINGS.messages_outbound_retention_days,
  messages_inbound_zero_retention: settingsModels.DEFAULT_SETTINGS.messages_inbound_zero_retention,
  messages_outbound_zero_retention:
    settingsModels.DEFAULT_SETTINGS.messages_outbound_zero_retention,
}

function toSettings(row: settingsModels.AppSettingsRow): RetentionSettings {
  return {
    prompts_retention_enabled: row.prompts_retention_enabled,
    prompts_retention_days: row.prompts_retention_days,
    messages_inbound_retention_enabled: row.messages_inbound_retention_enabled,
    messages_outbound_retention_enabled: row.messages_outbound_retention_enabled,
    messages_inbound_retention_days: row.messages_inbound_retention_days,
    messages_outbound_retention_days: row.messages_outbound_retention_days,
    messages_inbound_zero_retention: row.messages_inbound_zero_retention,
    messages_outbound_zero_retention: row.messages_outbound_zero_retention,
    updated_at: row.updated_at.toISOString(),
  }
}

function validateRetentionDays(days: number): void {
  const MIN = 1
  const MAX = 3650
  if (!Number.isInteger(days) || days < MIN || days > MAX) {
    throw new Error(`Retention days must be an integer between ${MIN} and ${MAX}`)
  }
}

export async function getRetentionSettings(organizationId: string): Promise<RetentionSettings> {
  const row = await withClient((client) => settingsModels.getSettings(client, organizationId))
  return toSettings(row)
}

export async function updateRetentionSettings(
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
): Promise<RetentionSettings> {
  if (input.promptsRetentionEnabled) {
    validateRetentionDays(input.promptsRetentionDays)
  }
  if (input.messagesInboundRetentionEnabled) {
    validateRetentionDays(input.messagesInboundRetentionDays)
  }
  if (input.messagesOutboundRetentionEnabled) {
    validateRetentionDays(input.messagesOutboundRetentionDays)
  }

  const row = await withClient((client) =>
    settingsModels.updateSettings(client, organizationId, input),
  )
  return toSettings(row)
}

export async function runRetention(): Promise<void> {
  const orgIds = await withClient((client) => settingsModels.listOrganizationIds(client))
  for (const organizationId of orgIds) {
    const settings = await getRetentionSettings(organizationId)

    if (settings.prompts_retention_enabled) {
      await withClient((client) =>
        promptModels.deleteOlderThan(client, organizationId, settings.prompts_retention_days),
      )
    }

    if (settings.messages_inbound_retention_enabled) {
      await purgeOldMessagesByDirection(
        organizationId,
        'inbound',
        settings.messages_inbound_retention_days,
      )
    }

    if (settings.messages_outbound_retention_enabled) {
      await purgeOldMessagesByDirection(
        organizationId,
        'outbound',
        settings.messages_outbound_retention_days,
      )
    }
  }
}
