import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'
import { createBroadcast } from '../src/services/broadcasts/service.js'
import { ValueError } from '../src/core/security.js'

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.GREENLIGHT_API_KEY = 'agent-api-key'
  resetConfigForTests()
}

describe('broadcasts', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects broadcast with fewer than two channels', async () => {
    await expect(
      createBroadcast({
        organizationId: 'default',
        kind: 'message',
        channelIds: ['only-one'],
        text: 'hello',
      }),
    ).rejects.toThrow(ValueError)
  })

  it('rejects duplicate channel_ids', async () => {
    await expect(
      createBroadcast({
        organizationId: 'default',
        kind: 'message',
        channelIds: ['a', 'a'],
        text: 'hello',
      }),
    ).rejects.toThrow(/unique/)
  })

  it('returns 404 for GET /v1/prompts?broadcast_id without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts?broadcast_id=brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for GET /v1/messages?broadcast_id without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages?broadcast_id=brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for POST /v1/broadcasts/new without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/broadcasts/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-api-key',
      },
      body: JSON.stringify({
        kind: 'message',
        channel_ids: ['a', 'b'],
        text: 'hi',
      }),
    })
    expect(res.status).toBe(404)
  })
})
