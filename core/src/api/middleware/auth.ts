import { timingSafeEqual } from 'node:crypto'
import type { Context, Next } from 'hono'
import { loadConfig } from '../../core/config.js'

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const config = loadConfig()
  if (!config.USE_AUTH) {
    return next()
  }

  const apiKey = c.req.header('X-API-Key')
  if (!apiKey || !config.API_KEY) {
    return c.json({ detail: 'Invalid or missing API key' }, 401)
  }

  try {
    const valid = timingSafeEqual(Buffer.from(apiKey), Buffer.from(config.API_KEY))
    if (!valid) {
      return c.json({ detail: 'Invalid or missing API key' }, 401)
    }
  } catch {
    return c.json({ detail: 'Invalid or missing API key' }, 401)
  }

  return next()
}
