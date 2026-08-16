import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'
import { ValueError } from '../src/core/security.js'
import { resolveSendTargets } from '../src/services/fan-out/targets.js'

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.GREENLIGHT_API_KEY = 'agent-api-key'
  resetConfigForTests()
}

describe('fan-out targets', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects when no target mode is provided', async () => {
    await expect(resolveSendTargets('default', {})).rejects.toThrow(ValueError)
  })

  it('rejects multiple target modes', async () => {
    await expect(
      resolveSendTargets('default', {
        channel_id: 'a',
        broadcast_group: { channel_ids: ['b'], prompt_answer_mode: 'first_answer' },
      }),
    ).rejects.toThrow(/exactly one/)
  })

  it('rejects duplicate channel_ids in inline broadcast_group', async () => {
    await expect(
      resolveSendTargets('default', {
        broadcast_group: {
          channel_ids: ['a', 'a'],
          prompt_answer_mode: 'first_answer',
        },
      }),
    ).rejects.toThrow(/unique/)
  })

  it('rejects inline prompt send without prompt_answer_mode', async () => {
    await expect(
      resolveSendTargets('default', {
        broadcast_group: { channel_ids: ['a'] },
      }, 'PROMPT'),
    ).rejects.toThrow(/prompt_answer_mode/)
  })

  it('rejects broadcast_group_id without enterprise license', async () => {
    await expect(
      resolveSendTargets('default', { broadcast_group_id: 'brg_test' }),
    ).rejects.toThrow(/broadcast feature/)
  })
})

describe('fan-out API', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('allows GET /v1/prompts?broadcast_batch_id without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts?broadcast_batch_id=brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(404)
  })

  it('allows GET /v1/messages?broadcast_batch_id without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages?broadcast_batch_id=brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(404)
  })

  it('returns 404 for GET /v1/broadcast-groups without enterprise license', async () => {
    const app = createApp()
    const res = await app.request('/v1/broadcast-groups', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })

  it('registers GET /v1/broadcast-batches/{broadcast_batch_id}', async () => {
    const app = createApp()
    const wrongPath = await app.request('/v1/broadcast-batches-extra/brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(wrongPath.status).toBe(404)

    const res = await app.request('/v1/broadcast-batches/brd_test', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(404)
  })
})
