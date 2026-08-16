import { existsSync } from 'node:fs'
import { isIP } from 'node:net'
import { resolve } from 'node:path'
import { loadConfig } from './config.js'

const IN_DOCKER = existsSync('/.dockerenv')

export function resolveCallbackUrl(url: string): string {
  if (!IN_DOCKER) return url
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'host.docker.internal'
      return parsed.toString()
    }
  } catch {
    // fall through
  }
  return url
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false
  }
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isPrivateIp(hostname: string): boolean {
  const version = isIP(hostname)
  if (version === 4) return isPrivateIpv4(hostname)
  if (version === 6) {
    const lower = hostname.toLowerCase()
    return (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    )
  }
  return false
}

export function validateCallbackUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ValueError('Callback URL must be a valid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValueError(
      `Callback URL scheme must be http or https, got '${parsed.protocol.replace(':', '')}'`,
    )
  }

  const hostname = parsed.hostname
  if (!hostname) {
    throw new ValueError('Callback URL must have a non-empty hostname')
  }

  if (isPrivateIp(hostname)) {
    throw new ValueError(
      `Callback URL hostname '${hostname}' resolves to a private or reserved IP address`,
    )
  }
}

export const CALLBACK_DATA_MAX_BYTES = 8192

export function validateCallbackData(data: unknown): unknown | null {
  if (data === null || data === undefined) return null
  if (typeof data !== 'object') {
    throw new ValueError('callback_data must be a JSON object or array')
  }
  const serialized = JSON.stringify(data)
  if (Buffer.byteLength(serialized, 'utf8') > CALLBACK_DATA_MAX_BYTES) {
    throw new ValueError(`callback_data exceeds ${CALLBACK_DATA_MAX_BYTES} bytes`)
  }
  return data as Record<string, unknown>
}

export const CALLBACK_HEADERS_MAX_BYTES = 4096
export const CALLBACK_HEADERS_MAX_COUNT = 20

const BLOCKED_CALLBACK_HEADERS = new Set([
  'content-type',
  'x-signature',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'te',
  'trailer',
  'upgrade',
  'host',
])

const HEADER_NAME_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

export function validateCallbackHeaders(data: unknown): Record<string, string> | null {
  if (data === null || data === undefined) return null
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new ValueError('callback_headers must be a JSON object')
  }

  const entries = Object.entries(data as Record<string, unknown>)
  if (entries.length > CALLBACK_HEADERS_MAX_COUNT) {
    throw new ValueError(`callback_headers exceeds ${CALLBACK_HEADERS_MAX_COUNT} headers`)
  }

  const normalized: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (!key.trim()) {
      throw new ValueError('callback_headers keys must be non-empty')
    }
    if (!HEADER_NAME_RE.test(key)) {
      throw new ValueError(`callback_headers has invalid header name: ${key}`)
    }
    if (typeof value !== 'string') {
      throw new ValueError(`callback_headers value for ${key} must be a string`)
    }
    if (BLOCKED_CALLBACK_HEADERS.has(key.toLowerCase())) {
      throw new ValueError(`callback_headers cannot set ${key}`)
    }
    normalized[key] = value
  }

  const serialized = JSON.stringify(normalized)
  if (Buffer.byteLength(serialized, 'utf8') > CALLBACK_HEADERS_MAX_BYTES) {
    throw new ValueError(`callback_headers exceeds ${CALLBACK_HEADERS_MAX_BYTES} bytes`)
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

export function validateMediaPath(path: string): void {
  const config = loadConfig()
  if (!config.MEDIA_ALLOWED_DIR) {
    throw new ValueError('media_path requires MEDIA_ALLOWED_DIR to be configured')
  }

  const allowed = resolve(config.MEDIA_ALLOWED_DIR)
  const target = resolve(path)

  if (!target.startsWith(allowed + '/') && target !== allowed) {
    throw new ValueError('Path is outside the allowed media directory')
  }
}

export class ValueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValueError'
  }
}
