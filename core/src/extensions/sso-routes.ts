import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireScope } from '../api/middleware/require-scope.js'
import { getAuditActor } from '../api/middleware/audit-actor.js'
import { recordAuditEvent } from './audit.js'
import { licenseGate } from './license-gate.js'
import { getSsoConfig, getSsoConfigWithSecret, testSsoConnection, upsertSsoConfig } from './sso.js'
import { assertMemberRole } from './rbac.js'

export const ssoRoutes = new Hono()

ssoRoutes.get('/sso', requireScope('settings:read'), async (c) => {
  if (!licenseGate.isEnabled('sso')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const config = await getSsoConfig()
  return c.json(config ?? { enabled: false })
})

ssoRoutes.get('/sso/runtime', async (c) => {
  if (!licenseGate.isEnabled('sso')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const apiKey = c.req.header('X-API-Key')
  if (!apiKey) {
    return c.json({ detail: 'unauthorized' }, 401)
  }

  const config = await getSsoConfigWithSecret()
  if (!config?.enabled) {
    return c.json({ enabled: false })
  }

  return c.json({
    enabled: true,
    issuer: config.issuer,
    client_id: config.client_id,
    client_secret: config.client_secret,
  })
})

ssoRoutes.put(
  '/sso',
  requireScope('settings:write'),
  zValidator(
    'json',
    z.object({
      issuer: z.string().url(),
      client_id: z.string().min(1),
      client_secret: z.string().optional(),
      enabled: z.boolean(),
    }),
  ),
  async (c) => {
    if (!licenseGate.isEnabled('sso')) {
      return c.json({ detail: 'not found' }, 404)
    }

    const denied = await assertMemberRole(c, ['admin'])
    if (denied) return denied

    const body = c.req.valid('json')

    try {
      const config = await upsertSsoConfig(body)
      const actor = getAuditActor(c)
      await recordAuditEvent({
        ...actor,
        action: 'sso.updated',
        resource_type: 'sso_config',
        resource_id: config.id,
        metadata: { enabled: config.enabled, issuer: config.issuer },
      })
      return c.json(config)
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)

ssoRoutes.post('/sso/test', requireScope('settings:write'), async (c) => {
  if (!licenseGate.isEnabled('sso')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const result = await testSsoConnection()
  return c.json(result)
})
