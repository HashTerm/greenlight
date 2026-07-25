import { describe, expect, it } from 'vitest'
import { registerChannelSchema } from '../src/services/channels/schemas.js'
import {
  credentialFingerprint,
  platformChannelId,
  resolvePlatformChannelId,
  parseThreadChannelId,
  maxPromptOptionsForPlatform,
} from '../src/core/platform.js'

describe('channel schemas', () => {
  it('requires platform and target_chat_id', () => {
    const body = registerChannelSchema.parse({
      channel_id: 'finance-bot',
      platform: 'telegram',
      target_chat_id: '-100123',
      credentials: { bot_token: '123456789:TOKEN' },
      channel_type: 'MESSAGE',
      callback_url: 'https://example.com/hook',
    })
    expect(body.platform).toBe('telegram')
    expect(body.target_chat_id).toBe('-100123')
  })

  it('accepts PROMPT channels without callback_url', () => {
    const body = registerChannelSchema.parse({
      channel_id: 'prompts',
      platform: 'telegram',
      target_chat_id: '-100123',
      credentials: { bot_token: '123456789:TOKEN' },
      channel_type: 'PROMPT',
    })
    expect(body.channel_type).toBe('PROMPT')
  })

  it('rejects legacy telegram_chat_id fields', () => {
    expect(() =>
      registerChannelSchema.parse({
        channel_id: 'finance-bot',
        telegram_chat_id: '-100123',
        bot_token: '123456789:TOKEN',
      }),
    ).toThrow()
  })

  it('validates slack credentials', () => {
    expect(() =>
      registerChannelSchema.parse({
        channel_id: 'ops-slack',
        platform: 'slack',
        target_chat_id: 'C01234567',
        credentials: { bot_token: 'xoxb-test' },
        callback_url: 'https://example.com/hook',
      }),
    ).toThrow()
  })

  it('accepts slack credentials with signing_secret', () => {
    const body = registerChannelSchema.parse({
      channel_id: 'ops-slack',
      platform: 'slack',
      target_chat_id: 'C01234567',
      credentials: {
        bot_token: 'xoxb-test',
        signing_secret: 'secret',
      },
      callback_url: 'https://example.com/hook',
    })
    expect(body.platform).toBe('slack')
  })

  it('validates gchat credentials and service_account_json', () => {
    expect(() =>
      registerChannelSchema.parse({
        channel_id: 'ops-gchat',
        platform: 'gchat',
        target_chat_id: 'spaces/AAAA',
        credentials: {
          service_account_json: 'not-json',
          google_chat_project_number: '123456789',
        },
        channel_type: 'PROMPT',
      }),
    ).toThrow()

    const body = registerChannelSchema.parse({
      channel_id: 'ops-gchat',
      platform: 'gchat',
      target_chat_id: 'spaces/AAAA',
      credentials: {
        service_account_json: JSON.stringify({
          client_email: 'bot@project.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n',
        }),
        google_chat_project_number: '123456789',
      },
      channel_type: 'PROMPT',
    })
    expect(body.platform).toBe('gchat')
  })

  it('validates whatsapp credentials', () => {
    const body = registerChannelSchema.parse({
      channel_id: 'support-wa',
      platform: 'whatsapp',
      target_chat_id: '15551234567',
      credentials: {
        access_token: 'token',
        app_secret: 'secret',
        phone_number_id: '1234567890',
        verify_token: 'verify',
      },
      callback_url: 'https://example.com/hook',
    })
    expect(body.platform).toBe('whatsapp')
  })

  it('validates messenger credentials', () => {
    const body = registerChannelSchema.parse({
      channel_id: 'support-fb',
      platform: 'messenger',
      target_chat_id: '27161130920158013',
      credentials: {
        page_access_token: 'page-token',
        app_secret: 'secret',
        verify_token: 'verify',
      },
      callback_url: 'https://example.com/hook',
    })
    expect(body.platform).toBe('messenger')
  })
})

describe('platform helpers', () => {
  it('maps platform channel ids', () => {
    expect(platformChannelId('slack', 'C123')).toBe('slack:C123')
    expect(platformChannelId('telegram', '-1001')).toBe('telegram:-1001')
    expect(platformChannelId('gchat', 'spaces/ABC')).toBe('gchat:spaces/ABC')
  })

  it('resolves whatsapp channel id with phone_number_id', () => {
    expect(
      resolvePlatformChannelId({
        platform: 'whatsapp',
        target_chat_id: '15551234567',
        credentials: { phone_number_id: '1234567890' },
      }),
    ).toBe('whatsapp:1234567890:15551234567')
  })

  it('parses whatsapp thread ids', () => {
    expect(parseThreadChannelId('whatsapp:1234567890:15551234567')).toEqual({
      platform: 'whatsapp',
      targetChatId: '15551234567',
    })
  })

  it('fingerprints credentials deterministically', () => {
    const a = credentialFingerprint('telegram', { bot_token: 'abc' })
    const b = credentialFingerprint('telegram', { bot_token: 'abc' })
    const c = credentialFingerprint('slack', { bot_token: 'abc' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('limits prompt options for whatsapp and messenger', () => {
    expect(maxPromptOptionsForPlatform('whatsapp')).toBe(3)
    expect(maxPromptOptionsForPlatform('messenger')).toBe(3)
    expect(maxPromptOptionsForPlatform('slack')).toBeNull()
  })
})
