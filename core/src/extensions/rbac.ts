import type { Context } from 'hono'
import { licenseGate } from './license-gate.js'
import { getMemberByEmail, countMembers, ensureBootstrapMember, type OrgMemberRow } from './members.js'
import { getRoleScopes, roleHasScope } from './roles.js'

export async function assertMemberRole(
  c: Context,
  allowedRoles: string[],
): Promise<Response | null> {
  if (!licenseGate.isEnabled('rbac') && !licenseGate.isEnabled('multi_user_admin')) {
    return null
  }

  const email = c.req.header('X-Greenlight-User-Email')?.toLowerCase()
  const userId = c.req.header('X-Greenlight-User-Id')
  if (!email) {
    return c.json({ detail: 'forbidden' }, 403)
  }

  const memberCount = await countMembers()
  if (memberCount === 0 && userId) {
    await ensureBootstrapMember(email, userId)
  }

  const member = await getMemberByEmail(email)
  if (!member || member.status !== 'active') {
    return c.json({ detail: 'forbidden' }, 403)
  }

  if (!allowedRoles.includes(member.role)) {
    return c.json({ detail: 'forbidden' }, 403)
  }

  c.set('member', member)
  return null
}

export async function assertMemberScope(c: Context, scope: string): Promise<Response | null> {
  if (!licenseGate.isEnabled('rbac')) {
    return null
  }

  const email = c.req.header('X-Greenlight-User-Email')?.toLowerCase()
  const userId = c.req.header('X-Greenlight-User-Id')
  if (!email) {
    return c.json({ detail: 'forbidden' }, 403)
  }

  const memberCount = await countMembers()
  if (memberCount === 0 && userId) {
    await ensureBootstrapMember(email, userId)
  }

  const member = await getMemberByEmail(email)
  if (!member || member.status !== 'active') {
    return c.json({ detail: 'forbidden' }, 403)
  }

  const scopes = await getRoleScopes(member.role)
  if (!roleHasScope(scopes, scope)) {
    return c.json({ detail: 'forbidden' }, 403)
  }

  c.set('member', member)
  return null
}

export function getMemberFromContext(c: Context): OrgMemberRow | undefined {
  return c.get('member') as OrgMemberRow | undefined
}
