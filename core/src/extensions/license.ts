import { readFileSync } from 'node:fs'
import { importSPKI, jwtVerify } from 'jose'
import { DEV_PUBLIC_KEY, PRODUCTION_PUBLIC_KEY } from './license-keys.js'

export type LicensePayload = {
  sub: string
  features: string[]
  exp?: number
}

let cached: LicensePayload | null = null
let graceUntil: number | null = null

const GRACE_MS = 30 * 24 * 60 * 60 * 1000

function readLicenseToken(): string | null {
  const fromEnv = process.env.GREENLIGHT_LICENSE?.trim()
  if (fromEnv) return fromEnv

  const path = process.env.GREENLIGHT_LICENSE_FILE ?? '/etc/greenlight/license.jwt'
  try {
    const raw = readFileSync(path, 'utf-8').trim()
    return raw || null
  } catch {
    return null
  }
}

async function verifyWithKey(token: string, pem: string): Promise<LicensePayload | null> {
  try {
    const key = await importSPKI(pem, 'EdDSA')
    const { payload } = await jwtVerify(token, key)
    const features = payload.features
    if (!Array.isArray(features) || features.some((f) => typeof f !== 'string')) {
      return null
    }
    const sub = payload.sub
    if (typeof sub !== 'string' || !sub) {
      return null
    }
    return {
      sub,
      features,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    }
  } catch {
    return null
  }
}

async function verifyLicenseToken(token: string): Promise<LicensePayload | null> {
  const customKey = process.env.GREENLIGHT_LICENSE_VERIFY_KEY?.trim()
  if (customKey) {
    const verified = await verifyWithKey(token, customKey)
    if (verified) return verified
  }

  const prod = await verifyWithKey(token, PRODUCTION_PUBLIC_KEY)
  if (prod) return prod

  return verifyWithKey(token, DEV_PUBLIC_KEY)
}

export function getLoadedLicense(): LicensePayload | null {
  return cached
}

export function isInGracePeriod(): boolean {
  return graceUntil !== null && Date.now() < graceUntil
}

export async function loadLicense(): Promise<LicensePayload | null> {
  const token = readLicenseToken()
  if (!token) {
    if (isInGracePeriod()) {
      return cached
    }
    cached = null
    return null
  }

  const verified = await verifyLicenseToken(token)
  if (verified) {
    cached = verified
    graceUntil = null
    return verified
  }

  if (cached && isInGracePeriod()) {
    return cached
  }

  cached = null
  return null
}

export async function refreshLicenseFromServer(): Promise<void> {
  const baseUrl = process.env.LICENSE_SERVER_URL?.replace(/\/$/, '')
  if (!baseUrl) return

  const token = readLicenseToken()
  if (!token) return

  try {
    const res = await fetch(`${baseUrl}/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license: token }),
    })
    if (!res.ok) {
      if (cached) {
        graceUntil = Date.now() + GRACE_MS
      }
      return
    }
    const body = (await res.json()) as { valid?: boolean }
    if (body.valid) {
      await loadLicense()
      graceUntil = null
      return
    }
    if (cached) {
      graceUntil = Date.now() + GRACE_MS
    }
  } catch {
    if (cached) {
      graceUntil = Date.now() + GRACE_MS
    }
  }
}
