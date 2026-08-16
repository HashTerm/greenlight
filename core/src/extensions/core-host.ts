/**
 * Stable host surface for injected enterprise extensions.
 *
 * Enterprise code imports from `./core-host.js` only — never from `../core/` or
 * `../api/`. This file lives in the community tree and is not replaced during
 * image inject, so enterprise does not depend on repository layout.
 */
import type { Context } from 'hono'
import { getApiKey } from '../api/middleware/auth.js'
import { loadConfig } from '../core/config.js'
import { DEFAULT_ORG_ID } from '../core/org.js'
import { hasAnyScope, type Scope } from '../services/api-keys/scopes.js'

export { requireScope } from '../api/middleware/require-scope.js'
export { getApiKeyId, getApiKey } from '../api/middleware/auth.js'
export { hasAnyScope, type Scope }
export { getOrganizationId } from '../api/middleware/org-context.js'
export {
  getAuditActor,
  getAuditEventContext,
  type AuditActor,
  type AuditEventContext,
} from '../api/middleware/audit-actor.js'
export { withClient } from '../db/client.js'

export function resolveRequestOrganizationId(c: Context): string {
  const config = loadConfig()
  return config.USE_AUTH ? getApiKey(c).organizationId! : DEFAULT_ORG_ID
}
