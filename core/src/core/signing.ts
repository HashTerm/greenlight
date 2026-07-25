import { createHmac, timingSafeEqual } from 'node:crypto'
import { loadConfig } from './config.js'

export function signBody(body: Buffer | string): string {
  const config = loadConfig()
  const payload = typeof body === 'string' ? Buffer.from(body) : body
  const sig = createHmac('sha256', config.CALLBACK_SIGNING_SECRET).update(payload).digest('hex')
  return `sha256=${sig}`
}

export function verifySignature(body: Buffer | string, header: string, secret?: string): boolean {
  const config = loadConfig()
  const key = secret ?? config.CALLBACK_SIGNING_SECRET
  const payload = typeof body === 'string' ? Buffer.from(body) : body
  const expected = `sha256=${createHmac('sha256', key).update(payload).digest('hex')}`
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(header))
  } catch {
    return false
  }
}
