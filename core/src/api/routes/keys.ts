import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  createKey,
  getKey,
  LastKeyError,
  listKeys,
  revokeKey,
} from '../../services/api-keys/service.js'
import { type ScopePreset } from '../../services/api-keys/scopes.js'
import { getApiKeyId } from '../middleware/auth.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit-log.js'
import { getAuditEventContext } from '../middleware/audit-log-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'

const createSchema = z.object({
  name: z.string().min(1).max(128),
  preset: z.enum(['admin', 'agent', 'readonly']).optional(),
  scopes: z.array(z.string()).optional(),
})

export const keyRoutes = new Hono()

keyRoutes.get('/keys', requireScope('keys:read'), async (c) => {
  const keys = await listKeys(getOrganizationId(c))
  return c.json(keys)
})

keyRoutes.get('/keys/:id', requireScope('keys:read'), async (c) => {
  const id = c.req.param('id')
  if (id === 'new') {
    return c.json({ detail: 'not found' }, 404)
  }
  const key = await getKey(getOrganizationId(c), id ?? '')
  if (!key) return c.json({ detail: 'not found' }, 404)
  return c.json(key)
})

keyRoutes.post(
  '/keys/new',
  requireScope('keys:write'),
  zValidator('json', createSchema),
  async (c) => {
    const body = c.req.valid('json')
    if (!body.preset && (!body.scopes || body.scopes.length === 0)) {
      return c.json({ detail: 'preset or scopes is required' }, 400)
    }
    try {
      const result = await createKey({
        organizationId: getOrganizationId(c),
        name: body.name,
        preset: body.preset as ScopePreset | undefined,
        scopes: body.scopes,
      })
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'api_key.created',
        resource_type: 'api_key',
        resource_id: result.key.id,
        metadata: { name: body.name },
      })
      return c.json({
        ...result.key,
        key: result.plaintext,
      })
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)

keyRoutes.delete('/keys/:id', requireScope('keys:write'), async (c) => {
  const id = c.req.param('id')
  if (id === 'new') {
    return c.json({ detail: 'not found' }, 404)
  }
  try {
    await revokeKey(getOrganizationId(c), id ?? '', getApiKeyId(c) ?? undefined)
    await recordAuditEvent({
      ...getAuditEventContext(c),
      action: 'api_key.revoked',
      resource_type: 'api_key',
      resource_id: id ?? undefined,
    })
    return c.json({ status: 'revoked' })
  } catch (err) {
    if (err instanceof LastKeyError) {
      return c.json({ detail: err.message }, 400)
    }
    const message = String(err)
    if (message.includes('not found')) {
      return c.json({ detail: message }, 404)
    }
    return c.json({ detail: message }, 400)
  }
})
