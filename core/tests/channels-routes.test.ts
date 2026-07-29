import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.API_KEY = 'agent-api-key'
  process.env.ADMIN_INTERNAL_TOKEN = 'admin-internal-token'
  resetConfigForTests()
}

describe('v1 channels API auth', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects unauthenticated POST /v1/channels/new', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 for removed POST /v1/channels', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-api-key',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for PATCH /v1/channels/new (reserved id)', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels/new', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-api-key',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('accepts API key on GET /v1/channels', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
  })

  it('accepts API key on GET /v1/channels?platform=telegram&limit=10', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels?platform=telegram&limit=10', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
  })

  it('returns 404 for removed POST /v1/channels/:id/messages/send', async () => {
    const app = createApp()
    const res = await app.request('/v1/channels/test-channel/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-api-key',
      },
      body: JSON.stringify({ channel_id: 'test-channel', text: 'hello' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects unauthenticated POST /v1/prompts/new', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated POST /v1/prompts/new with multipart', async () => {
    const app = createApp()
    const form = new FormData()
    form.append('text', 'hello')
    const res = await app.request('/v1/prompts/new', {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(401)
  })

  it('returns 415 for unsupported Content-Type on POST /v1/prompts/new', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-API-Key': 'agent-api-key',
      },
      body: 'hello',
    })
    expect(res.status).toBe(415)
  })
})

describe('v1 prompts API auth', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects unauthenticated GET /v1/prompts', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts')
    expect(res.status).toBe(401)
  })

  it('accepts API key on GET /v1/prompts?state=all', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts?state=all', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
  })

  it('returns 404 for removed GET /v1/prompts/pending', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts/pending', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for removed POST /v1/prompts/new/upload', async () => {
    const app = createApp()
    const res = await app.request('/v1/prompts/new/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-api-key',
      },
      body: JSON.stringify({ text: 'hello' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('v1 messages API auth', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects unauthenticated POST /v1/messages/send', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: 'test', text: 'hello' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated GET /v1/messages', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages')
    expect(res.status).toBe(401)
  })

  it('accepts API key on GET /v1/messages', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
  })

  it('returns 404 for GET /v1/messages/send (reserved id)', async () => {
    const app = createApp()
    const res = await app.request('/v1/messages/send', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })
})
