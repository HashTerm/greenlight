const SCOPES = [
  'status:read',
  'keys:read',
  'keys:write',
  'prompts:read',
  'prompts:write',
  'messages:read',
  'messages:send',
  'channels:read',
  'channels:write',
  'broadcast_groups:read',
  'broadcast_groups:write',
  'broadcast_batches:read',
  'audit_log:read',
  'settings:read',
  'settings:write',
  'admin',
] as const

export type Scope = (typeof SCOPES)[number]

export type ScopePreset = 'admin' | 'agent' | 'readonly'

const AGENT_SCOPES: Scope[] = [
  'prompts:read',
  'prompts:write',
  'messages:read',
  'messages:send',
  'channels:read',
  'channels:write',
]

const READONLY_SCOPES: Scope[] = [
  'status:read',
  'keys:read',
  'prompts:read',
  'messages:read',
  'channels:read',
  'settings:read',
]

export function expandPreset(preset: ScopePreset): Scope[] {
  switch (preset) {
    case 'admin':
      return ['admin']
    case 'agent':
      return AGENT_SCOPES
    case 'readonly':
      return READONLY_SCOPES
  }
}

export function normalizeScopes(scopes: string[]): Scope[] {
  const valid = new Set<string>(SCOPES)
  const out = new Set<Scope>()
  for (const raw of scopes) {
    if (!valid.has(raw)) {
      throw new Error(`Invalid scope: ${raw}`)
    }
    out.add(raw as Scope)
  }
  return [...out]
}

export function hasScope(keyScopes: readonly string[], required: Scope): boolean {
  if (keyScopes.includes('admin')) return true
  return keyScopes.includes(required)
}

export function hasAnyScope(keyScopes: readonly string[], required: Scope[]): boolean {
  return required.some((s) => hasScope(keyScopes, s))
}
