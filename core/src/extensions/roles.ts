import { withClient } from '../db/client.js'
import type { MemberRole } from './constants.js'

export type RoleDefinition = {
  role: MemberRole
  scopes: string[]
}

const DEFAULT_ROLES: RoleDefinition[] = [
  { role: 'admin', scopes: ['admin'] },
  {
    role: 'operator',
    scopes: [
      'channels:read',
      'channels:write',
      'prompts:read',
      'prompts:write',
      'messages:read',
      'messages:send',
      'settings:read',
      'audit:read',
    ],
  },
  {
    role: 'viewer',
    scopes: [
      'status:read',
      'settings:read',
      'keys:read',
      'channels:read',
      'prompts:read',
      'messages:read',
      'audit:read',
    ],
  },
  { role: 'member', scopes: ['settings:read'] },
]

export async function seedRolePermissions(): Promise<void> {
  await withClient(async (client) => {
    for (const def of DEFAULT_ROLES) {
      await client.query(
        `INSERT INTO role_permissions (role, scopes)
         VALUES ($1, $2)
         ON CONFLICT (role) DO NOTHING`,
        [def.role, def.scopes],
      )
    }
  })
}

export async function listRoles(): Promise<RoleDefinition[]> {
  const result = await withClient((client) =>
    client.query<RoleDefinition>('SELECT role, scopes FROM role_permissions ORDER BY role'),
  )
  return result.rows
}

export async function getRoleScopes(role: string): Promise<string[]> {
  const result = await withClient((client) =>
    client.query<{ scopes: string[] }>('SELECT scopes FROM role_permissions WHERE role = $1', [
      role,
    ]),
  )
  return result.rows[0]?.scopes ?? []
}

export function roleHasScope(roleScopes: string[], required: string): boolean {
  if (roleScopes.includes('admin')) return true
  return roleScopes.includes(required)
}

export function roleCanAccessRoute(role: string, route: string): boolean {
  switch (route) {
    case '/audit':
      return ['admin', 'operator', 'viewer'].includes(role)
    case '/settings/users':
      return ['admin'].includes(role)
    case '/settings/sso':
      return ['admin'].includes(role)
    default:
      return true
  }
}
