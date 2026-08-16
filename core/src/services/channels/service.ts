import { withClient } from '../../db/client.js'
import { validateCallbackData, validateCallbackHeaders, ValueError } from '../../core/security.js'
import {
  ensureBotForChannel,
  postToChat,
  stopBotForChannelWithRow,
} from '../../chat/bot-manager.js'
import type { Platform } from '../../core/platform.js'
import * as messageModels from '../messages/models.js'
import * as settingsModels from '../settings/models.js'
import * as channelModels from './models.js'
import type { ChannelRow } from './models.js'
import { getCredentialsValidationError } from './schemas.js'

export class ChannelAlreadyExistsError extends Error {
  constructor(channelId: string) {
    super(`Channel ${channelId} already exists`)
    this.name = 'ChannelAlreadyExistsError'
  }
}

export class ChannelNotFoundError extends Error {
  constructor(channelId: string) {
    super(`Channel ${channelId} not found`)
    this.name = 'ChannelNotFoundError'
  }
}

function mergeCredentials(
  existing: Record<string, string>,
  patch: Record<string, string>,
): Record<string, string> {
  const merged = { ...existing }
  for (const [key, value] of Object.entries(patch)) {
    if (value.trim()) merged[key] = value
  }
  return merged
}

export function serializeChannelRow(ch: ChannelRow) {
  return {
    channel_id: ch.channel_id,
    platform: ch.platform,
    target_chat_id: ch.target_chat_id,
    channel_type: ch.channel_type,
    callback_url: ch.callback_url,
    callback_data: ch.callback_data,
    callback_headers_configured: Boolean(
      ch.callback_headers && Object.keys(ch.callback_headers).length > 0,
    ),
    is_active: ch.is_active,
    registered_at: ch.registered_at.toISOString(),
  }
}

export async function createChannel(data: {
  organizationId: string
  channelId: string
  platform: Platform
  targetChatId: string
  credentials: Record<string, string>
  callbackUrl: string | null
  callbackHeaders?: Record<string, string> | null
  callbackData?: unknown | null
  channelType: string
}): Promise<void> {
  const callbackHeaders =
    data.channelType === 'MESSAGE' ? validateCallbackHeaders(data.callbackHeaders ?? null) : null
  const callbackData =
    data.channelType === 'MESSAGE' ? validateCallbackData(data.callbackData ?? null) : null

  return withClient(async (client) => {
    const existing = await channelModels.getChannel(client, data.organizationId, data.channelId)
    if (existing) {
      throw new ChannelAlreadyExistsError(data.channelId)
    }

    await channelModels.insertChannel(client, {
      organizationId: data.organizationId,
      channelId: data.channelId,
      platform: data.platform,
      targetChatId: data.targetChatId,
      credentials: data.credentials,
      callbackUrl: data.callbackUrl,
      callbackHeaders,
      callbackData,
      channelType: data.channelType,
    })

    const row = await channelModels.getChannel(client, data.organizationId, data.channelId)
    if (!row) throw new Error('Failed to create channel')

    await ensureBotForChannel(row)
  })
}

export async function updateChannel(
  organizationId: string,
  channelId: string,
  patch: {
    targetChatId?: string
    credentials?: Record<string, string>
    callbackUrl?: string | null
    callbackHeaders?: Record<string, string> | null
    callbackData?: unknown | null
  },
): Promise<void> {
  return withClient(async (client) => {
    const existing = await channelModels.getChannel(client, organizationId, channelId)
    if (!existing) {
      throw new ChannelNotFoundError(channelId)
    }

    const targetChatId = patch.targetChatId ?? existing.target_chat_id
    const callbackUrl = patch.callbackUrl !== undefined ? patch.callbackUrl : existing.callback_url
    const credentials = patch.credentials
      ? mergeCredentials(existing.credentials, patch.credentials)
      : existing.credentials

    let callbackHeaders = existing.callback_headers
    if (patch.callbackHeaders !== undefined) {
      callbackHeaders = validateCallbackHeaders(patch.callbackHeaders)
    }

    let callbackData = existing.callback_data
    if (patch.callbackData !== undefined) {
      callbackData =
        existing.channel_type === 'MESSAGE' ? validateCallbackData(patch.callbackData) : null
    }

    const credentialError = getCredentialsValidationError(existing.platform, credentials)
    if (credentialError) {
      throw new Error(credentialError)
    }

    if (existing.channel_type === 'MESSAGE' && !callbackUrl) {
      throw new Error('MESSAGE channels require callback_url')
    }

    await channelModels.updateChannel(client, organizationId, channelId, {
      targetChatId,
      credentials,
      callbackUrl,
      callbackHeaders,
      callbackData,
    })

    const row = await channelModels.getChannel(client, organizationId, channelId)
    if (!row) throw new Error('Failed to update channel')

    await ensureBotForChannel(row)
  })
}

export async function sendToChannel(
  organizationId: string,
  channelId: string,
  text: string,
  apiKeyId: string | null = null,
  options?: { broadcastId?: string | null },
): Promise<{ messageId?: string }> {
  return withClient(async (client) => {
    const channel = await channelModels.getChannel(client, organizationId, channelId)
    if (!channel || !channel.is_active) {
      throw new Error(`Channel ${channelId} not registered`)
    }

    if (channel.channel_type !== 'MESSAGE') {
      throw new Error(`Channel ${channelId} is not a MESSAGE channel`)
    }

    await ensureBotForChannel(channel)
    const { messageId: platformMessageId } = await postToChat(channel, text)

    const settings = await settingsModels.getSettings(client, organizationId)
    if (settings.messages_outbound_zero_retention) {
      return {}
    }

    const row = await messageModels.createMessage(client, {
      organizationId,
      channelId: channel.channel_id,
      direction: 'outbound',
      text,
      platform: channel.platform,
      apiKeyId,
      platformMessageId: platformMessageId ?? null,
      broadcastId: options?.broadcastId ?? null,
    })
    return { messageId: row.id }
  })
}

export async function listChannels(
  organizationId: string,
  options?: {
    platform?: Platform
    channelType?: string
    limit?: number
  },
): Promise<ReturnType<typeof serializeChannelRow>[]> {
  return withClient(async (client) => {
    const channels = await channelModels.listChannelsFiltered(client, organizationId, {
      platform: options?.platform,
      channelType: options?.channelType,
      limit: options?.limit ?? 50,
    })
    return channels.map(serializeChannelRow)
  })
}

export async function unregisterChannel(organizationId: string, channelId: string): Promise<void> {
  await withClient(async (client) => {
    const channel = await channelModels.getChannel(client, organizationId, channelId)
    if (!channel) {
      throw new ChannelNotFoundError(channelId)
    }
    await channelModels.deactivateChannel(client, organizationId, channelId)
    await stopBotForChannelWithRow(channel)
  })
}

export async function restoreChannelsOnStartup(): Promise<void> {
  const channels = await withClient((client) => channelModels.listActiveChannels(client))
  for (const channel of channels) {
    await ensureBotForChannel(channel)
  }
}
