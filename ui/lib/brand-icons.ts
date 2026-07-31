import discord from '@thesvg/icons/discord'
import googleChat from '@thesvg/icons/google-chat'
import messenger from '@thesvg/icons/messenger'
import microsoftTeams from '@thesvg/icons/microsoft-teams'
import slack from '@thesvg/icons/slack'
import telegram from '@thesvg/icons/telegram'
import whatsapp from '@thesvg/icons/whatsapp'

import type { Platform } from '@/lib/platform-fields'

const platformIcons = {
  telegram,
  slack,
  teams: microsoftTeams,
  discord,
  googlechat: googleChat,
  whatsapp,
  messenger,
} as const

export type PlatformIconSlug = keyof typeof platformIcons

const platformLabels: Record<PlatformIconSlug, string> = {
  telegram: 'Telegram',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  discord: 'Discord',
  googlechat: 'Google Chat',
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
}

const platformToIconSlug: Record<Platform, PlatformIconSlug> = {
  telegram: 'telegram',
  slack: 'slack',
  teams: 'teams',
  discord: 'discord',
  gchat: 'googlechat',
  whatsapp: 'whatsapp',
  messenger: 'messenger',
}

export function getPlatformBrand(platform: Platform) {
  const slug = platformToIconSlug[platform]
  return {
    iconSvg: platformIcons[slug].svg,
    label: platformLabels[slug],
  }
}
