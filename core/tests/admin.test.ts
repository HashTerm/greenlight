import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.API_KEY = 'agent-api-key'
  resetConfigForTests()
}

describe('unified /v1 API auth', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('returns 404 for removed /admin/v1/status', async () => {
    const app = createApp()
    const res = await app.request('/admin/v1/status', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for removed /admin/v1/settings', async () => {
    const app = createApp()
    const res = await app.request('/admin/v1/settings', {
      headers: { 'X-Admin-Token': 'anything' },
    })
    expect(res.status).toBe(404)
  })

  it('rejects missing API key on /v1/status', async () => {
    const app = createApp()
    const res = await app.request('/v1/status')
    expect(res.status).toBe(401)
  })

  it('accepts admin-scoped API key on /v1/status', async () => {
    const app = createApp()
    const res = await app.request('/v1/status', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('returns 403 for agent key on PATCH /v1/settings', async () => {
    const app = createApp()
    const res = await app.request('/v1/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'agent-only-key',
      },
      body: JSON.stringify({ prompts_retention_enabled: false }),
    })
    expect(res.status).toBe(403)
  })

  it('accepts admin key on GET /v1/keys', async () => {
    const app = createApp()
    const res = await app.request('/v1/keys', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })

  it('returns 403 for agent key on GET /v1/keys', async () => {
    const app = createApp()
    const res = await app.request('/v1/keys', {
      headers: { 'X-API-Key': 'agent-only-key' },
    })
    expect(res.status).toBe(403)
  })
})
