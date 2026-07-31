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
      'channels:read',
      'channels:write',
      'prompts:read',
      'prompts:write',
      'messages:read',
      'messages:send',
    ],
    organizationId: 'default',
  },
  'readonly-key': {
    id: 'test-readonly-key',
    name: 'test-readonly',
    scopes: [
      'status:read',
      'settings:read',
      'keys:read',
      'channels:read',
      'prompts:read',
      'messages:read',
    ],
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
