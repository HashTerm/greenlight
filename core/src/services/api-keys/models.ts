import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type pg from 'pg'
import { DEFAULT_ORG_ID } from '../../core/org.js'

export interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  key_hash: string
  scopes: string[]
  organization_id: string
  created_at: Date
  revoked_at: Date | null
  last_used_at: Date | null
}

export interface ApiKeyPublic {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  organization_id: string
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateApiKeyMaterial(): { plaintext: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString('base64url')
  const plaintext = `gl_${secret}`
  const prefix = plaintext.slice(0, 12)
  return { plaintext, prefix, hash: hashApiKey(plaintext) }
}

export function toPublic(row: ApiKeyRow): ApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    scopes: row.scopes,
    organization_id: row.organization_id,
    created_at: row.created_at.toISOString(),
    revoked_at: row.revoked_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
  }
}

export async function countActiveKeys(
  client: pg.PoolClient,
  organizationId?: string,
): Promise<number> {
  if (organizationId) {
    const result = await client.query<{ c: string }>(
      'SELECT count(*)::text AS c FROM api_keys WHERE revoked_at IS NULL AND organization_id = $1',
      [organizationId],
    )
    return Number(result.rows[0]?.c ?? 0)
  }
  const result = await client.query<{ c: string }>(
    'SELECT count(*)::text AS c FROM api_keys WHERE revoked_at IS NULL',
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function countActiveKeyManagers(
  client: pg.PoolClient,
  organizationId: string,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM api_keys
     WHERE revoked_at IS NULL
       AND organization_id = $1
       AND ('admin' = ANY(scopes) OR 'keys:write' = ANY(scopes))`,
    [organizationId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function insertApiKey(
  client: pg.PoolClient,
  input: {
    name: string
    prefix: string
    hash: string
    scopes: string[]
    organizationId?: string
  },
): Promise<ApiKeyRow> {
  const id = randomUUID()
  const organizationId = input.organizationId ?? DEFAULT_ORG_ID
  const result = await client.query<ApiKeyRow>(
    `INSERT INTO api_keys (id, name, key_prefix, key_hash, scopes, organization_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.name, input.prefix, input.hash, input.scopes, organizationId],
  )
  return result.rows[0]!
}

export async function findByHash(client: pg.PoolClient, hash: string): Promise<ApiKeyRow | null> {
  const result = await client.query<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL',
    [hash],
  )
  return result.rows[0] ?? null
}

export async function listApiKeys(
  client: pg.PoolClient,
  organizationId: string,
): Promise<ApiKeyRow[]> {
  const result = await client.query<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC',
    [organizationId],
  )
  return result.rows
}

export async function getApiKey(
  client: pg.PoolClient,
  organizationId: string,
  id: string,
): Promise<ApiKeyRow | null> {
  const result = await client.query<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE organization_id = $1 AND id = $2',
    [organizationId, id],
  )
  return result.rows[0] ?? null
}

export async function revokeApiKey(
  client: pg.PoolClient,
  organizationId: string,
  id: string,
): Promise<boolean> {
  const result = await client.query(
    'UPDATE api_keys SET revoked_at = now() WHERE organization_id = $1 AND id = $2 AND revoked_at IS NULL',
    [organizationId, id],
  )
  return (result.rowCount ?? 0) > 0
}

export async function touchLastUsed(client: pg.PoolClient, id: string): Promise<void> {
  await client.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [id])
}
