import { createHash } from 'node:crypto'

export const PLATFORMS = [
  'telegram',
  'slack',
  'teams',
  'discord',
  'gchat',
  'whatsapp',
  'messenger',
] as const
export type Platform = (typeof PLATFORMS)[number]

export function credentialFingerprint(
  platform: Platform,
  credentials: Record<string, string>,
): string {
  const sorted = JSON.stringify(credentials, Object.keys(credentials).sort())
  return createHash('sha256').update(`${platform}:${sorted}`).digest('hex').slice(0, 16)
}

export function platformChannelId(platform: Platform, targetChatId: string): string {
  return `${platform}:${targetChatId}`
}

export function resolvePlatformChannelId(channel: {
  platform: Platform
  target_chat_id: string
  credentials: Record<string, string>
}): string {
  switch (channel.platform) {
    case 'whatsapp':
      return `whatsapp:${channel.credentials.phone_number_id}:${channel.target_chat_id}`
    default:
      return platformChannelId(channel.platform, channel.target_chat_id)
  }
}

function parsePlatformChannelId(
  channelId: string,
): { platform: Platform; targetChatId: string } | null {
  const idx = channelId.indexOf(':')
  if (idx < 0) return null
  const platform = channelId.slice(0, idx) as Platform
  if (!PLATFORMS.includes(platform)) return null
  return { platform, targetChatId: channelId.slice(idx + 1) }
}

/** Parse Chat SDK thread.id into platform + target_chat_id for channel lookup. */
export function parseThreadChannelId(
  threadId: string,
): { platform: Platform; targetChatId: string } | null {
  const platform = threadId.split(':')[0] as Platform
  if (!PLATFORMS.includes(platform)) return null

  if (platform === 'whatsapp') {
    const parts = threadId.split(':')
    if (parts.length < 3) return null
    return { platform, targetChatId: parts.slice(2).join(':') }
  }

  return parsePlatformChannelId(threadId)
}

export function instanceKey(platform: Platform, credentials: Record<string, string>): string {
  return `${platform}:${credentialFingerprint(platform, credentials)}`
}

export function maxPromptOptionsForPlatform(platform: Platform): number | null {
  if (platform === 'whatsapp' || platform === 'messenger') return 3
  return null
}

/** Max option labels when allow_text reserves a Type answer button. */
export function maxPromptOptionLabelsForPlatform(
  platform: Platform,
  allowText: boolean,
): number | null {
  const limit = maxPromptOptionsForPlatform(platform)
  if (limit === null) return null
  return allowText ? limit - 1 : limit
}
