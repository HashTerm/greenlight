import { withClient } from '../../db/client.js'
import {
  ensureBotForChannel,
  postToChat,
  stopBotForChannelWithRow,
} from '../../chat/bot-manager.js'
import type { Platform } from '../../core/platform.js'
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

export async function sendToChannel(channelId: string, text: string): Promise<void> {
  await withClient(async (client) => {
    const channel = await channelModels.getChannel(client, channelId)
    if (!channel || !channel.is_active) {
      throw new Error(`Channel ${channelId} not registered`)
    }

    await ensureBotForChannel(channel)
    await postToChat(channel, text)
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
