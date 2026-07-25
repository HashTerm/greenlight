import type { Chat } from 'chat'
import type { Platform } from '../core/platform.js'

export interface ManagedBot {
  bot: Chat
  platform: Platform
  instanceKey: string
  channelIds: Set<string>
  gatewayTask?: Promise<void>
}

const botsByKey = new Map<string, ManagedBot>()
const channelToKey = new Map<string, string>()

export function getBotByKey(key: string): ManagedBot | undefined {
  return botsByKey.get(key)
}

export function getBotForChannel(channelId: string): ManagedBot | undefined {
  const key = channelToKey.get(channelId)
  if (!key) return undefined
  return botsByKey.get(key)
}

export function setManagedBot(key: string, managed: ManagedBot): void {
  botsByKey.set(key, managed)
}

export function deleteManagedBot(key: string): void {
  botsByKey.delete(key)
}

export function bindChannelToKey(channelId: string, key: string): void {
  channelToKey.set(channelId, key)
}

export function unbindChannel(channelId: string): string | undefined {
  const key = channelToKey.get(channelId)
  channelToKey.delete(channelId)
  return key
}

export function getChannelKey(channelId: string): string | undefined {
  return channelToKey.get(channelId)
}

export function allManagedBots(): IterableIterator<ManagedBot> {
  return botsByKey.values()
}

export function clearBotRegistry(): void {
  botsByKey.clear()
  channelToKey.clear()
}
