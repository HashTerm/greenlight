import type { Context, Next } from 'hono'
import { hasAnyScope, type Scope } from '../../services/api-keys/scopes.js'
import { loadConfig } from '../../core/config.js'
import { getApiKey } from './auth.js'

export function requireScope(...required: Scope[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    if (!loadConfig().USE_AUTH) {
      return next()
    }
    const apiKey = getApiKey(c)
    if (!hasAnyScope(apiKey.scopes, required)) {
      return c.json({ detail: 'Insufficient scope' }, 403)
    }
    return next()
  }
}
