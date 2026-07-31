import { describe, expect, it, beforeEach } from 'vitest'
import { createApp } from '../src/api/app.js'
import { resetConfigForTests } from '../src/core/config.js'
import { licenseGate, type EnterpriseFeature } from '../src/extensions/license-gate.js'
import { onEnterpriseBoot, recordAuditEvent } from '../src/extensions/index.js'

const FEATURES: EnterpriseFeature[] = ['audit', 'sso', 'multi_user_admin', 'rbac']

function baseEnv(): void {
  process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
  process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
  process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  process.env.USE_AUTH = 'true'
  process.env.GREENLIGHT_API_KEY = 'agent-api-key'
  resetConfigForTests()
}

describe('community extension stubs', () => {
  beforeEach(() => {
    baseEnv()
  })
  it('licenseGate disables all enterprise features', () => {
    for (const feature of FEATURES) {
      expect(licenseGate.isEnabled(feature)).toBe(false)
    }
  })

  it('onEnterpriseBoot resolves without error', async () => {
    await expect(onEnterpriseBoot()).resolves.toBeUndefined()
  })

  it('recordAuditEvent is a safe no-op', async () => {
    await expect(
      recordAuditEvent({
        actor_type: 'api_key',
        action: 'api_key.created',
        resource_type: 'api_key',
      }),
    ).resolves.toBeUndefined()
  })

  it('does not register enterprise routes', async () => {
    const app = createApp()
    const res = await app.request('/v1/audit', {
      headers: { 'X-API-Key': 'agent-api-key' },
    })
    expect(res.status).toBe(404)
  })
})
