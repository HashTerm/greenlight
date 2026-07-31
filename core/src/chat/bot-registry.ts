import type { Chat } from 'chat'
import type { Platform } from '../core/platform.js'
import { channelRegistryKey } from '../core/org.js'

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

export function getBotForChannel(organizationId: string, channelId: string): ManagedBot | undefined {
  const key = channelToKey.get(channelRegistryKey(organizationId, channelId))
  if (!key) return undefined
  return botsByKey.get(key)
}

export function setManagedBot(key: string, managed: ManagedBot): void {
  botsByKey.set(key, managed)
}

export function deleteManagedBot(key: string): void {
  botsByKey.delete(key)
}

export function bindChannelToKey(organizationId: string, channelId: string, key: string): void {
  channelToKey.set(channelRegistryKey(organizationId, channelId), key)
}

export function unbindChannel(organizationId: string, channelId: string): string | undefined {
  const registryKey = channelRegistryKey(organizationId, channelId)
  const key = channelToKey.get(registryKey)
  channelToKey.delete(registryKey)
  return key
}

export function getChannelKey(organizationId: string, channelId: string): string | undefined {
  return channelToKey.get(channelRegistryKey(organizationId, channelId))
}

export function allManagedBots(): IterableIterator<ManagedBot> {
  return botsByKey.values()
}

export function clearBotRegistry(): void {
  botsByKey.clear()
  channelToKey.clear()
}
