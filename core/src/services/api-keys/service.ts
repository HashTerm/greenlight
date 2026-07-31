import { withClient } from '../../db/client.js'
import { DEFAULT_ORG_ID } from '../../core/org.js'
import { loadConfig } from '../../core/config.js'
import * as settingsModels from '../settings/models.js'
import * as models from './models.js'
import { expandPreset, normalizeScopes, type ScopePreset } from './scopes.js'

export type AuthenticatedApiKey = {
  id: string
  name: string
  scopes: string[]
  organizationId: string
}

export async function authenticateApiKey(plaintext: string): Promise<AuthenticatedApiKey | null> {
  const hash = models.hashApiKey(plaintext)
  const row = await withClient((client) => models.findByHash(client, hash))
  if (!row || !row.organization_id) return null
  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    organizationId: row.organization_id,
  }
}

export function touchApiKeyLastUsed(id: string): void {
  withClient((client) => models.touchLastUsed(client, id)).catch((err) =>
    console.error('touch api key last_used error:', err),
  )
}

export async function listKeys(organizationId: string) {
  const rows = await withClient((client) => models.listApiKeys(client, organizationId))
  return rows.map(models.toPublic)
}

export async function getKey(organizationId: string, id: string) {
  const row = await withClient((client) => models.getApiKey(client, organizationId, id))
  return row ? models.toPublic(row) : null
}

export async function createKey(input: {
  organizationId: string
  name: string
  scopes?: string[]
  preset?: ScopePreset
}): Promise<{ key: models.ApiKeyPublic; plaintext: string }> {
  const scopes = input.preset ? expandPreset(input.preset) : normalizeScopes(input.scopes ?? [])
  if (scopes.length === 0) {
    throw new Error('At least one scope is required')
  }

  const material = models.generateApiKeyMaterial()
  const row = await withClient((client) =>
    models.insertApiKey(client, {
      name: input.name,
      prefix: material.prefix,
      hash: material.hash,
      scopes,
      organizationId: input.organizationId,
    }),
  )
  return { key: models.toPublic(row), plaintext: material.plaintext }
}

export class LastKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LastKeyError'
  }
}

export async function revokeKey(
  organizationId: string,
  id: string,
  currentKeyId?: string,
): Promise<void> {
  if (currentKeyId && id === currentKeyId) {
    throw new Error('Cannot revoke the API key used for this request')
  }

  await withClient(async (client) => {
    const row = await models.getApiKey(client, organizationId, id)
    if (!row || row.revoked_at) {
      throw new Error('API key not found')
    }

    const managers = await models.countActiveKeyManagers(client, organizationId)
    const isManager = row.scopes.includes('admin') || row.scopes.includes('keys:write')
    if (isManager && managers <= 1) {
      throw new LastKeyError('Cannot revoke the last active key with key management access')
    }

    const ok = await models.revokeApiKey(client, organizationId, id)
    if (!ok) {
      throw new Error('API key not found')
    }
  })
}

export async function bootstrapApiKeyFromEnv(): Promise<void> {
  const config = loadConfig()
  const apiKey = config.GREENLIGHT_API_KEY?.trim()
  if (!config.USE_AUTH || !apiKey) return

  const active = await withClient((client) => models.countActiveKeys(client))
  if (active > 0) return

  const hash = models.hashApiKey(apiKey)
  await withClient(async (client) => {
    await settingsModels.ensureSettings(client, DEFAULT_ORG_ID)
    await models.insertApiKey(client, {
      name: 'bootstrap',
      prefix: apiKey.slice(0, 12),
      hash,
      scopes: ['admin'],
      organizationId: DEFAULT_ORG_ID,
    })
  })
  console.warn(
    'Bootstrapped admin API key "bootstrap" from GREENLIGHT_API_KEY. Create a new key via POST /v1/keys/new and revoke this one.',
  )
}

export async function countActiveApiKeys(): Promise<number> {
  return withClient((client) => models.countActiveKeys(client))
}
