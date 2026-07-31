import { withClient } from '../db/client.js'
import { decryptSecret, encryptSecret, getSsoAuthSecret } from './crypto.js'

export type SsoConfigRow = {
  id: string
  provider: string
  issuer: string
  client_id: string
  client_secret_encrypted: string
  enabled: boolean
  updated_at: string
}

export type SsoConfigPublic = {
  id: string
  provider: string
  issuer: string
  client_id: string
  enabled: boolean
  updated_at: string
  has_client_secret: boolean
}

function toPublic(row: SsoConfigRow): SsoConfigPublic {
  return {
    id: row.id,
    provider: row.provider,
    issuer: row.issuer,
    client_id: row.client_id,
    enabled: row.enabled,
    updated_at:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : (row.updated_at as unknown as Date).toISOString(),
    has_client_secret: Boolean(row.client_secret_encrypted),
  }
}

export async function getSsoConfig(): Promise<SsoConfigPublic | null> {
  const result = await withClient((client) =>
    client.query<SsoConfigRow>(
      `SELECT id, provider, issuer, client_id, client_secret_encrypted, enabled, updated_at
       FROM sso_config WHERE id = 'default'`,
    ),
  )
  const row = result.rows[0]
  return row ? toPublic(row) : null
}

export async function getSsoConfigWithSecret(): Promise<(SsoConfigRow & { client_secret: string }) | null> {
  const result = await withClient((client) =>
    client.query<SsoConfigRow>(
      `SELECT id, provider, issuer, client_id, client_secret_encrypted, enabled, updated_at
       FROM sso_config WHERE id = 'default' AND enabled = true`,
    ),
  )
  const row = result.rows[0]
  if (!row) return null

  const secret = decryptSecret(row.client_secret_encrypted, getSsoAuthSecret())
  return { ...row, client_secret: secret }
}

export async function upsertSsoConfig(input: {
  issuer: string
  client_id: string
  client_secret?: string
  enabled: boolean
}): Promise<SsoConfigPublic> {
  const secret = input.client_secret ?? ''
  const encrypted = secret ? encryptSecret(secret, getSsoAuthSecret()) : null

  const existing = await withClient((client) =>
    client.query<SsoConfigRow>(
      `SELECT id, provider, issuer, client_id, client_secret_encrypted, enabled, updated_at
       FROM sso_config WHERE id = 'default'`,
    ),
  )

  if (existing.rows[0]) {
    const current = existing.rows[0]
    const result = await withClient((client) =>
      client.query<SsoConfigRow>(
        `UPDATE sso_config
         SET issuer = $1,
             client_id = $2,
             client_secret_encrypted = COALESCE($3, client_secret_encrypted),
             enabled = $4,
             updated_at = now()
         WHERE id = 'default'
         RETURNING id, provider, issuer, client_id, client_secret_encrypted, enabled, updated_at`,
        [input.issuer, input.client_id, encrypted, input.enabled],
      ),
    )
    return toPublic(result.rows[0] ?? current)
  }

  if (!encrypted) {
    throw new Error('client_secret is required for initial SSO configuration')
  }

  const result = await withClient((client) =>
    client.query<SsoConfigRow>(
      `INSERT INTO sso_config (id, provider, issuer, client_id, client_secret_encrypted, enabled)
       VALUES ('default', 'oidc', $1, $2, $3, $4)
       RETURNING id, provider, issuer, client_id, client_secret_encrypted, enabled, updated_at`,
      [input.issuer, input.client_id, encrypted, input.enabled],
    ),
  )
  return toPublic(result.rows[0])
}

export async function testSsoConnection(): Promise<{ ok: boolean; detail?: string }> {
  const config = await getSsoConfigWithSecret()
  if (!config) {
    return { ok: false, detail: 'SSO is not configured or not enabled' }
  }

  try {
    const wellKnown = config.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration'
    const res = await fetch(wellKnown, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      return { ok: false, detail: `OIDC discovery failed (${res.status})` }
    }
    const body = (await res.json()) as { issuer?: string }
    if (!body.issuer) {
      return { ok: false, detail: 'Invalid OIDC discovery document' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, detail: String(err) }
  }
}
