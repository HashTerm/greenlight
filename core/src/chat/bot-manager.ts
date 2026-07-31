import { createPostgresState } from '@chat-adapter/state-pg'
import { getPool } from '../db/client.js'
import { loadConfig } from '../core/config.js'
import type { ChannelRow } from '../services/channels/models.js'
import { channelInstanceKey } from '../services/channels/models.js'
import { instanceKey, resolvePlatformChannelId, type Platform } from '../core/platform.js'
import { adapterName, createAdapterForChannel } from './adapters.js'
import {
  allManagedBots,
  bindChannelToKey,
  clearBotRegistry,
  deleteManagedBot,
  getBotByKey,
  getChannelKey,
  setManagedBot,
  unbindChannel,
  type ManagedBot,
} from './bot-registry.js'
import { wireHandlers } from './handlers.js'
import { deletePlatformWebhook, registerPlatformWebhook } from './platform-webhook.js'

export type { ManagedBot } from './bot-registry.js'
export { getBotForChannel } from './bot-registry.js'

function stateKeyPrefix(platform: Platform, credentials: Record<string, string>): string {
  return `greenlight:${instanceKey(platform, credentials)}`
}

async function startDiscordGateway(
  managed: ManagedBot,
  organizationId: string,
  channelId: string,
): Promise<void> {
  const config = loadConfig()
  if (!config.PUBLIC_WEBHOOK_URL?.trim()) return

  const adapter = managed.bot.getAdapter('discord')
  if (!adapter || !('startGatewayListener' in adapter)) return

  const webhookUrl = `${config.PUBLIC_WEBHOOK_URL.replace(/\/$/, '')}/webhooks/${encodeURIComponent(organizationId)}/discord/${encodeURIComponent(channelId)}`
  const durationMs = 10 * 60 * 1000

  const runLoop = async (): Promise<void> => {
    while (managed.channelIds.size > 0) {
      try {
        await (
          adapter as {
            startGatewayListener: (
              options: object,
              durationMs?: number,
              abortSignal?: AbortSignal,
              webhookUrl?: string,
            ) => Promise<Response>
          }
        ).startGatewayListener({}, durationMs, undefined, webhookUrl)
      } catch (err) {
        console.error(`Discord gateway listener error for ${channelId}:`, err)
        await new Promise((r) => setTimeout(r, 5000))
      }
    }
  }

  managed.gatewayTask = runLoop()
}

async function createBotInstance(channel: ChannelRow): Promise<ManagedBot> {
  const { Chat } = await import('chat')
  const key = channelInstanceKey(channel)
  const adapter = createAdapterForChannel(channel)
  const name = adapterName(channel.platform)

  const state = createPostgresState({
    client: getPool(),
    keyPrefix: stateKeyPrefix(channel.platform, channel.credentials),
  })

  const userName = `bot_${channel.channel_id}`.slice(0, 32)
  const bot = new Chat({
    userName,
    adapters: { [name]: adapter },
    state,
  })

  wireHandlers(bot, channel.platform, channel.credentials)

  const managed: ManagedBot = {
    bot,
    platform: channel.platform,
    instanceKey: key,
    channelIds: new Set(),
  }

  await bot.initialize()
  setManagedBot(key, managed)

  await registerPlatformWebhook(channel)

  if (channel.platform === 'discord') {
    await startDiscordGateway(managed, channel.organization_id, channel.channel_id)
  }

  return managed
}

export async function ensureBotForChannel(channel: ChannelRow): Promise<ManagedBot> {
  const key = channelInstanceKey(channel)
  const existing = getBotByKey(key)
  if (existing) {
    existing.channelIds.add(channel.channel_id)
    bindChannelToKey(channel.organization_id, channel.channel_id, key)
    return existing
  }

  const managed = await createBotInstance(channel)
  managed.channelIds.add(channel.channel_id)
  bindChannelToKey(channel.organization_id, channel.channel_id, key)
  return managed
}

export async function stopBotForChannelWithRow(channel: ChannelRow): Promise<void> {
  const key = getChannelKey(channel.organization_id, channel.channel_id)
  if (!key) return

  const managed = getBotByKey(key)
  if (!managed) return

  managed.channelIds.delete(channel.channel_id)
  unbindChannel(channel.organization_id, channel.channel_id)

  if (managed.channelIds.size === 0) {
    await deletePlatformWebhook(channel)
    await managed.bot.shutdown()
    deleteManagedBot(key)
  }
}

export async function postToChat(
  channel: ChannelRow,
  message: unknown,
): Promise<{ messageId?: string }> {
  const key = channelInstanceKey(channel)
  const managed = getBotByKey(key)
  if (!managed) {
    throw new Error(`Bot not initialized for channel ${channel.channel_id}`)
  }

  const ch = managed.bot.channel(resolvePlatformChannelId(channel))
  const sent = await ch.post(message as string)
  const messageId =
    sent && typeof sent === 'object' && 'id' in sent
      ? String((sent as { id: string }).id)
      : undefined
  return { messageId }
}

export async function shutdownAllBots(): Promise<void> {
  for (const managed of allManagedBots()) {
    await managed.bot.shutdown()
  }
  clearBotRegistry()
}
