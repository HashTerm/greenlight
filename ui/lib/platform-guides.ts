import type { Platform } from '@/lib/platform-fields'

interface PlatformGuide {
  title: string
  steps: string[]
}

const PLATFORM_GUIDES: Record<Platform, PlatformGuide> = {
  telegram: {
    title: 'Telegram',
    steps: [
      'Create a bot via @BotFather and copy the bot token.',
      'Add the bot to your target group/channel and get the chat ID.',
      'Register the channel here with platform telegram.',
      'Set webhook URL to {webhook} (Greenlight handles delivery).',
    ],
  },
  slack: {
    title: 'Slack',
    steps: [
      'Create a Slack app with bot scopes: chat:write, channels:history.',
      'Install the app to your workspace and copy the bot token.',
      'Copy signing secret from Basic Information.',
      'Register with target_chat_id = channel ID (C…).',
      'Point Events API request URL to {webhook}.',
    ],
  },
  teams: {
    title: 'Microsoft Teams',
    steps: [
      'Register an Azure Bot / Teams app with app ID and password.',
      'Configure messaging endpoint to {webhook}.',
      'Use conversation ID as target_chat_id.',
      'Register channel with teams platform credentials.',
    ],
  },
  discord: {
    title: 'Discord',
    steps: [
      'Create a Discord application and bot.',
      'Copy bot token, public key, and application ID.',
      'Set interactions endpoint URL to {webhook}.',
      'Invite bot to server; use channel ID as target_chat_id.',
    ],
  },
  gchat: {
    title: 'Google Chat',
    steps: [
      'Create a Google Chat app with service account.',
      'Configure HTTP endpoint {webhook}.',
      'Paste service account JSON and project number.',
      'Use space name as target_chat_id.',
    ],
  },
  whatsapp: {
    title: 'WhatsApp',
    steps: [
      'Set up Meta WhatsApp Business API app.',
      'Copy access token, app secret, phone number ID.',
      'Set verify token and configure webhook {webhook}.',
      'Use phone number as target_chat_id.',
    ],
  },
  messenger: {
    title: 'Messenger',
    steps: [
      'Create Facebook Page app with Messenger product.',
      'Generate page access token and set verify token.',
      'Configure webhook {webhook} for messages.',
      'Use page-scoped user ID as target_chat_id.',
    ],
  },
}

export function formatGuideSteps(platform: Platform, webhookUrl: string): string[] {
  return PLATFORM_GUIDES[platform].steps.map((s) => s.replace('{webhook}', webhookUrl))
}
