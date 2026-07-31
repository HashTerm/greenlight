import type { Adapter } from 'chat'
import { createTelegramAdapter } from '@chat-adapter/telegram'
import { createSlackAdapter } from '@chat-adapter/slack'
import { createTeamsAdapter } from '@chat-adapter/teams'
import { createDiscordAdapter } from '@chat-adapter/discord'
import { createGoogleChatAdapter } from '@chat-adapter/gchat'
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp'
import { createMessengerAdapter } from '@chat-adapter/messenger'
import { loadConfig } from '../core/config.js'
import { buildWebhookUrl } from './platform-webhook.js'
import type { ChannelRow } from '../services/channels/models.js'
import type { Platform } from '../core/platform.js'

export function createAdapterForChannel(channel: ChannelRow): Adapter {
  const creds = channel.credentials

  switch (channel.platform) {
    case 'telegram': {
      const config = loadConfig()
      const useWebhook = Boolean(config.PUBLIC_WEBHOOK_URL?.trim())
      return createTelegramAdapter({
        botToken: creds.bot_token,
        secretToken: config.WEBHOOK_SECRET,
        mode: useWebhook ? 'webhook' : 'polling',
      })
    }
    case 'slack':
      return createSlackAdapter({
        botToken: creds.bot_token,
        signingSecret: creds.signing_secret,
        appToken: creds.app_token,
        mode: 'webhook',
      })
    case 'teams':
      return createTeamsAdapter({
        appId: creds.app_id,
        appPassword: creds.app_password,
        appTenantId: creds.app_tenant_id,
        appType: creds.app_tenant_id ? 'SingleTenant' : 'MultiTenant',
      })
    case 'discord':
      return createDiscordAdapter({
        botToken: creds.bot_token,
        publicKey: creds.public_key,
        applicationId: creds.application_id,
      })
    case 'gchat': {
      const config = loadConfig()
      const endpointUrl = config.PUBLIC_WEBHOOK_URL?.trim()
        ? buildWebhookUrl(channel.organization_id, 'gchat', channel.channel_id)
        : undefined
      return createGoogleChatAdapter({
        credentials: JSON.parse(creds.service_account_json) as {
          client_email: string
          private_key: string
        },
        googleChatProjectNumber: creds.google_chat_project_number,
        pubsubTopic: creds.pubsub_topic,
        pubsubAudience: creds.pubsub_audience,
        impersonateUser: creds.impersonate_user,
        endpointUrl,
      })
    }
    case 'whatsapp':
      return createWhatsAppAdapter({
        accessToken: creds.access_token,
        appSecret: creds.app_secret,
        phoneNumberId: creds.phone_number_id,
        verifyToken: creds.verify_token,
      })
    case 'messenger':
      return createMessengerAdapter({
        pageAccessToken: creds.page_access_token,
        appSecret: creds.app_secret,
        verifyToken: creds.verify_token,
      })
    default: {
      const _exhaustive: never = channel.platform
      throw new Error(`Unsupported platform: ${_exhaustive}`)
    }
  }
}

export function adapterName(platform: Platform): string {
  return platform
}
