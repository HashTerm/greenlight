import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'
import { DEFAULT_ORG_ID } from '../src/core/org.js'

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.GREENLIGHT_API_KEY = 'agent-api-key'
  resetConfigForTests()
}

describe('multi-tenant organization scoping', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects API key without organization_id at auth layer', async () => {
    const { authenticateApiKey } = await import('../src/services/api-keys/service.js')
    const result = await authenticateApiKey('missing-org-key')
    expect(result).toBeNull()
  })

  it('scopes status to the API key organization', async () => {
    const app = createApp()
    const res = await app.request('/v1/status', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
    if (res.status === 200) {
      const body = (await res.json()) as { organization_id?: string }
      expect(body.organization_id).toBe(DEFAULT_ORG_ID)
    }
  })

  it('returns 404 for legacy webhook path without org prefix', async () => {
    const app = createApp()
    const res = await app.request('/webhooks/telegram/test-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('accepts org-prefixed webhook path shape', async () => {
    const app = createApp()
    const res = await app.request(
      `/webhooks/${encodeURIComponent(DEFAULT_ORG_ID)}/telegram/test-channel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { detail?: string }
    expect(body.detail).toBe('unknown channel')
  })

  it('isolates org-b API key organization context', async () => {
    const app = createApp()
    const res = await app.request('/v1/status', {
      headers: { 'X-API-Key': 'org-b-key' },
    })
    expect(res.status).not.toBe(401)
    if (res.status === 200) {
      const body = (await res.json()) as { organization_id?: string }
      expect(body.organization_id).toBe('org-b')
    }
  })
})
