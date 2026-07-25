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

describe('admin API auth', () => {
  beforeEach(() => {
    baseEnv()
  })

  it('rejects API key on admin routes', async () => {
    const app = createApp()
    const res = await app.request('/admin/v1/status', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects wrong admin token', async () => {
    const app = createApp()
    const res = await app.request('/admin/v1/status', {
      headers: { 'X-Admin-Token': 'wrong-token' },
    })
    expect(res.status).toBe(401)
  })

  it('accepts admin token on admin routes', async () => {
    const app = createApp()
    const res = await app.request('/admin/v1/status', {
      headers: { 'X-Admin-Token': 'admin-internal-token' },
    })
    expect(res.status).not.toBe(401)
  })

  it('accepts API key on agent routes', async () => {
    const app = createApp()
    const res = await app.request('/channels', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).not.toBe(401)
  })

  it('does not mount admin routes without ADMIN_INTERNAL_TOKEN', async () => {
    delete process.env.ADMIN_INTERNAL_TOKEN
    resetConfigForTests()
    const app = createApp()
    const res = await app.request('/admin/v1/status', {
      headers: { 'X-Admin-Token': 'admin-internal-token' },
    })
    expect(res.status).toBe(404)
  })
})
