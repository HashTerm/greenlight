export const SCOPES = [
  'status:read',
  'settings:read',
  'settings:write',
  'audit:read',
  'keys:read',
  'keys:write',
  'channels:read',
  'channels:write',
  'prompts:read',
  'prompts:write',
  'messages:read',
  'messages:send',
  'admin',
] as const

export type Scope = (typeof SCOPES)[number]

export type ScopePreset = 'admin' | 'agent' | 'readonly'

const AGENT_SCOPES: Scope[] = [
  'channels:read',
  'channels:write',
  'prompts:read',
  'prompts:write',
  'messages:read',
  'messages:send',
]

const READONLY_SCOPES: Scope[] = [
  'status:read',
  'settings:read',
  'keys:read',
  'channels:read',
  'prompts:read',
  'messages:read',
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
  for (const s of scopes) {
    if (!valid.has(s)) {
      throw new Error(`Invalid scope: ${s}`)
    }
    out.add(s as Scope)
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

export function canManageKeys(scopes: readonly string[]): boolean {
  return hasScope(scopes, 'admin') || hasScope(scopes, 'keys:write')
}
