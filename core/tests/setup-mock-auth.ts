import { vi } from 'vitest'
import type { AuthenticatedApiKey } from '../src/services/api-keys/service.js'

export const TEST_API_KEYS: Record<string, AuthenticatedApiKey> = {
  'agent-api-key': {
    id: 'test-admin-key',
    name: 'test-admin',
    scopes: ['admin'],
    organizationId: 'default',
  },
  'agent-only-key': {
    id: 'test-agent-key',
    name: 'test-agent',
    scopes: [
      'prompts:read',
      'prompts:write',
      'messages:read',
      'messages:send',
      'channels:read',
      'channels:write',
    ],
    organizationId: 'default',
  },
  'readonly-key': {
    id: 'test-readonly-key',
    name: 'test-readonly',
    scopes: [
      'status:read',
      'keys:read',
      'prompts:read',
      'messages:read',
      'channels:read',
      'settings:read',
    ],
    organizationId: 'default',
  },
  'broadcast-test-key': {
    id: 'test-broadcast-key',
    name: 'test-broadcast',
    scopes: ['broadcast_groups:read', 'broadcast_groups:write', 'broadcast_batches:read'],
    organizationId: 'default',
  },
  'org-b-key': {
    id: 'test-org-b-key',
    name: 'test-org-b',
    scopes: ['admin'],
    organizationId: 'org-b',
  },
}

vi.mock('../src/services/api-keys/service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/api-keys/service.js')>()
  return {
    ...actual,
    authenticateApiKey: vi.fn(async (plaintext: string) => TEST_API_KEYS[plaintext] ?? null),
    touchApiKeyLastUsed: vi.fn(),
    bootstrapApiKeyFromEnv: vi.fn(async () => {}),
  }
})
