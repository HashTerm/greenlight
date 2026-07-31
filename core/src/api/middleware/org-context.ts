import type { Context } from 'hono'
import { getApiKey } from './auth.js'
import { loadConfig } from '../../core/config.js'

export function getOrganizationId(c: Context): string {
  if (!loadConfig().USE_AUTH) {
    throw new Error('Organization context requires USE_AUTH=true')
  }
  const apiKey = getApiKey(c)
  if (!apiKey.organizationId) {
    throw new Error('API key missing organization_id')
  }
  return apiKey.organizationId
}
