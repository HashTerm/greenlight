import { loadConfig } from './config.js'
import { resolveCallbackUrl, validateCallbackUrl } from './security.js'
import { signBody } from './signing.js'

const MAX_PENDING_CALLBACKS = 200
const pending = new Set<Promise<void>>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildHeaders(
  body: string,
  sign: boolean,
  extraHeaders?: Record<string, string> | null,
): Record<string, string> {
  const headers: Record<string, string> = {}
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }
  headers['Content-Type'] = 'application/json'
  if (sign) {
    headers['X-Signature'] = signBody(body)
  }
  return headers
}

async function postWithRetries(
  url: string,
  body: string,
  options: { sign?: boolean; maxAttempts?: number; extraHeaders?: Record<string, string> | null } = {},
): Promise<void> {
  const { sign = true, maxAttempts = 5, extraHeaders = null } = options
  const headers = buildHeaders(body, sign, extraHeaders)

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        const delay = Math.min(8000, 500 * 2 ** (attempt - 1))
        await sleep(delay + Math.random() * 200)
      }
    }
  }
  throw lastError
}

export async function notifyCallback(
  callbackUrl: string,
  payload: Record<string, unknown>,
  callbackHeaders?: Record<string, string> | null,
): Promise<void> {
  const resolved = resolveCallbackUrl(callbackUrl)
  validateCallbackUrl(resolved)
  const body = JSON.stringify(payload)
  await postWithRetries(resolved, body, { sign: true, extraHeaders: callbackHeaders })
}

export function scheduleCallback(
  callbackUrl: string,
  payload: Record<string, unknown>,
  callbackHeaders?: Record<string, string> | null,
): void {
  if (pending.size >= MAX_PENDING_CALLBACKS) {
    console.error(
      `Callback queue full (${pending.size} pending), dropping callback for prompt_id=${payload.prompt_id ?? 'unknown'}`,
    )
    return
  }

  const task = notifyCallback(callbackUrl, payload, callbackHeaders)
    .catch((err) => {
      console.error(`Failed to send callback prompt_id=${payload.prompt_id ?? 'unknown'}:`, err)
    })
    .finally(() => {
      pending.delete(task)
    })

  pending.add(task)
}

export async function forwardChannelCallback(
  callbackUrl: string,
  messageEvent: Record<string, unknown>,
  callbackHeaders?: Record<string, string> | null,
): Promise<boolean> {
  const config = loadConfig()
  const resolved = resolveCallbackUrl(callbackUrl)

  try {
    validateCallbackUrl(resolved)
  } catch (err) {
    console.warn(`Invalid callback URL: ${err}`)
    return false
  }

  const body = JSON.stringify(messageEvent)
  const headers = buildHeaders(body, false, callbackHeaders)

  for (let attempt = 1; attempt <= config.CHANNEL_CALLBACK_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(resolved, {
        method: 'POST',
        headers,
        body,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    } catch (err) {
      console.warn(
        `Callback failed (attempt ${attempt}/${config.CHANNEL_CALLBACK_MAX_RETRIES}):`,
        err,
      )
      if (attempt < config.CHANNEL_CALLBACK_MAX_RETRIES) {
        await sleep(config.CHANNEL_CALLBACK_RETRY_DELAY * 1000)
      }
    }
  }

  return false
}
