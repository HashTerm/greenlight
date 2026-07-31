import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireScope } from '../api/middleware/require-scope.js'
import { getAuditActor } from '../api/middleware/audit-actor.js'
import { recordAuditEvent } from './audit.js'
import { licenseGate } from './license-gate.js'
import { MEMBER_ROLES } from './constants.js'
import {
  activateMember,
  deleteMember,
  ensureBootstrapMember,
  getMemberByEmail,
  inviteMember,
  listMembers,
  updateMember,
} from './members.js'
import { assertMemberRole } from './rbac.js'

export const memberRoutes = new Hono()

memberRoutes.get('/members', requireScope('settings:read'), async (c) => {
  if (!licenseGate.isEnabled('multi_user_admin')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const email = c.req.header('X-Greenlight-User-Email')
  const userId = c.req.header('X-Greenlight-User-Id')
  if (email && userId) {
    await ensureBootstrapMember(email, userId)
  }

  const members = await listMembers()
  return c.json(members)
})

memberRoutes.post(
  '/members/invite',
  requireScope('settings:write'),
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      role: z.enum(MEMBER_ROLES).optional(),
    }),
  ),
  async (c) => {
    if (!licenseGate.isEnabled('multi_user_admin')) {
      return c.json({ detail: 'not found' }, 404)
    }

    const denied = await assertMemberRole(c, ['admin'])
    if (denied) return denied

    const body = c.req.valid('json')
    const invitedBy = c.req.header('X-Greenlight-User-Id') ?? undefined

    try {
      const member = await inviteMember({
        email: body.email,
        role: body.role,
        invitedBy,
      })
      const actor = getAuditActor(c)
      await recordAuditEvent({
        ...actor,
        action: 'member.invited',
        resource_type: 'org_member',
        resource_id: member.id,
        metadata: { email: member.email, role: member.role },
      })
      return c.json(member, 201)
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)

memberRoutes.patch(
  '/members/:id',
  requireScope('settings:write'),
  zValidator(
    'json',
    z.object({
      role: z.enum(MEMBER_ROLES).optional(),
      status: z.enum(['invited', 'active', 'disabled']).optional(),
    }),
  ),
  async (c) => {
    if (!licenseGate.isEnabled('multi_user_admin')) {
      return c.json({ detail: 'not found' }, 404)
    }

    const denied = await assertMemberRole(c, ['admin'])
    if (denied) return denied

    const id = c.req.param('id') ?? ''
    const body = c.req.valid('json')

    try {
      const member = await updateMember(id, body)
      if (!member) {
        return c.json({ detail: 'not found' }, 404)
      }
      const actor = getAuditActor(c)
      await recordAuditEvent({
        ...actor,
        action: 'member.updated',
        resource_type: 'org_member',
        resource_id: member.id,
        metadata: body,
      })
      return c.json(member)
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)

memberRoutes.delete('/members/:id', requireScope('settings:write'), async (c) => {
  if (!licenseGate.isEnabled('multi_user_admin')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const denied = await assertMemberRole(c, ['admin'])
  if (denied) return denied

  const id = c.req.param('id') ?? ''
  const ok = await deleteMember(id)
  if (!ok) {
    return c.json({ detail: 'not found' }, 404)
  }

  const actor = getAuditActor(c)
  await recordAuditEvent({
    ...actor,
    action: 'member.deleted',
    resource_type: 'org_member',
    resource_id: id,
  })
  return c.json({ status: 'deleted' })
})

memberRoutes.post('/members/activate', requireScope('settings:read'), async (c) => {
  if (!licenseGate.isEnabled('multi_user_admin')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const email = c.req.header('X-Greenlight-User-Email')
  if (!email) {
    return c.json({ detail: 'email required' }, 400)
  }

  await activateMember(email)
  const member = await getMemberByEmail(email)
  return c.json(member ?? { status: 'activated' })
})
