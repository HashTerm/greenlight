import type { Context } from 'hono'
import { getApiKeyId } from './auth.js'
import { getOrganizationId } from './org-context.js'
import { loadConfig } from '../../core/config.js'

export type AuditActor = {
  actor_type: 'api_key' | 'user' | 'system'
  actor_id?: string
}

export type AuditEventContext = AuditActor & {
  organization_id?: string
}

export function getAuditActor(c: Context): AuditActor {
  const userId = c.req.header('X-Greenlight-User-Id')
  if (userId) {
    return { actor_type: 'user', actor_id: userId }
  }
  const keyId = getApiKeyId(c)
  if (keyId) {
    return { actor_type: 'api_key', actor_id: keyId }
  }
  return { actor_type: 'system' }
}

export function getAuditEventContext(c: Context): AuditEventContext {
  const actor = getAuditActor(c)
  if (!loadConfig().USE_AUTH) {
    return actor
  }
  try {
    return { ...actor, organization_id: getOrganizationId(c) }
  } catch {
    return actor
  }
}
