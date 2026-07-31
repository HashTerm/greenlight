import type { Context, Next } from 'hono'
import type { AuthenticatedApiKey } from '../../services/api-keys/service.js'
import { authenticateApiKey, touchApiKeyLastUsed } from '../../services/api-keys/service.js'
import { loadConfig } from '../../core/config.js'

export type ApiKeyVariables = {
  apiKey: AuthenticatedApiKey
}

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const config = loadConfig()
  if (!config.USE_AUTH) {
    return next()
  }

  const header = c.req.header('X-API-Key')
  if (!header) {
    return c.json({ detail: 'Invalid or missing API key' }, 401)
  }

  const apiKey = await authenticateApiKey(header)
  if (!apiKey) {
    return c.json({ detail: 'Invalid or missing API key' }, 401)
  }

  if (!apiKey.organizationId) {
    return c.json({ detail: 'API key missing organization scope' }, 403)
  }

  c.set('apiKey', apiKey)
  touchApiKeyLastUsed(apiKey.id)
  return next()
}

export function getApiKey(c: Context): AuthenticatedApiKey {
  const apiKey = c.get('apiKey') as AuthenticatedApiKey | undefined
  if (!apiKey) {
    throw new Error('API key not set on context')
  }
  return apiKey
}

export function getApiKeyId(c: Context): string | null {
  if (!loadConfig().USE_AUTH) return null
  return getApiKey(c).id
}
