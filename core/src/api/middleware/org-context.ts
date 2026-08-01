import type { Context } from 'hono'
import { getApiKey } from './auth.js'
import { loadConfig } from '../../core/config.js'
import { DEFAULT_ORG_ID } from '../../core/org.js'

export function getOrganizationId(c: Context): string {
  if (!loadConfig().USE_AUTH) {
    return DEFAULT_ORG_ID
  }
  const apiKey = getApiKey(c)
  if (!apiKey.organizationId) {
    throw new Error('API key missing organization_id')
  }
  return apiKey.organizationId
}
