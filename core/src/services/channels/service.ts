import { withClient } from '../../db/client.js'
import {
  ensureBotForChannel,
  postToChat,
  stopBotForChannelWithRow,
} from '../../chat/bot-manager.js'
import type { Platform } from '../../core/platform.js'
import type { MessageSource } from '../messages/models.js'
import * as messageModels from '../messages/models.js'
import * as settingsModels from '../settings/models.js'
import * as channelModels from './models.js'

export async function registerChannel(data: {
  channelId: string
  platform: Platform
  targetChatId: string
  credentials: Record<string, string>
  callbackUrl: string | null
  channelType: string
}): Promise<'registered' | 'updated'> {
  return withClient(async (client) => {
    const existing = await channelModels.getChannel(client, data.channelId)
    const wasActive = Boolean(existing?.is_active)

    await channelModels.registerChannel(client, data)

    const row = await channelModels.getChannel(client, data.channelId)
    if (!row) throw new Error('Failed to register channel')

    await ensureBotForChannel(row)

    return wasActive ? 'updated' : 'registered'
  })
}

export async function sendToChannel(
  channelId: string,
  text: string,
  source: MessageSource = 'api',
): Promise<{ messageId?: string }> {
  return withClient(async (client) => {
    const channel = await channelModels.getChannel(client, channelId)
    if (!channel || !channel.is_active) {
      throw new Error(`Channel ${channelId} not registered`)
    }

    if (channel.channel_type !== 'MESSAGE') {
      throw new Error(`Channel ${channelId} is not a MESSAGE channel`)
    }

    await ensureBotForChannel(channel)
    const { messageId: platformMessageId } = await postToChat(channel, text)

    const settings = await settingsModels.getSettings(client)
    if (settings.messages_outbound_zero_retention) {
      return {}
    }

    const row = await messageModels.createMessage(client, {
      channelId: channel.channel_id,
      direction: 'outbound',
      text,
      platform: channel.platform,
      source,
      platformMessageId: platformMessageId ?? null,
    })
    return { messageId: row.id }
  })
}

export async function listChannels(): Promise<
  {
    channel_id: string
    platform: Platform
    target_chat_id: string
    channel_type: string
    callback_url: string | null
    is_active: boolean
    registered_at: string
  }[]
> {
  return withClient(async (client) => {
    const channels = await channelModels.listAllChannels(client)
    return channels.map((ch) => ({
      channel_id: ch.channel_id,
      platform: ch.platform,
      target_chat_id: ch.target_chat_id,
      channel_type: ch.channel_type,
      callback_url: ch.callback_url,
      is_active: ch.is_active,
      registered_at: ch.registered_at.toISOString(),
    }))
  })
}

export async function unregisterChannel(channelId: string): Promise<void> {
  await withClient(async (client) => {
    const channel = await channelModels.getChannel(client, channelId)
    if (!channel) {
      throw new Error(`Channel ${channelId} not found.`)
    }
    await channelModels.deactivateChannel(client, channelId)
    await stopBotForChannelWithRow(channel)
  })
}

export async function restoreChannelsOnStartup(): Promise<void> {
  const channels = await withClient((client) => channelModels.listActiveChannels(client))
  for (const channel of channels) {
    await ensureBotForChannel(channel)
  }
}
