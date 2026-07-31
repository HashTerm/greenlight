import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireScope } from '../api/middleware/require-scope.js'
import { getAuditActor } from '../api/middleware/audit-actor.js'
import { recordAuditEvent } from './audit.js'
import { licenseGate } from './license-gate.js'
import { MEMBER_ROLES } from './constants.js'
import { updateMember } from './members.js'
import { listRoles } from './roles.js'
import { assertMemberRole } from './rbac.js'

export const roleRoutes = new Hono()

roleRoutes.get('/roles', requireScope('settings:read'), async (c) => {
  if (!licenseGate.isEnabled('rbac')) {
    return c.json({ detail: 'not found' }, 404)
  }

  const roles = await listRoles()
  return c.json(roles)
})

roleRoutes.patch(
  '/members/:id/role',
  requireScope('settings:write'),
  zValidator(
    'json',
    z.object({
      role: z.enum(MEMBER_ROLES),
    }),
  ),
  async (c) => {
    if (!licenseGate.isEnabled('rbac')) {
      return c.json({ detail: 'not found' }, 404)
    }

    const denied = await assertMemberRole(c, ['admin'])
    if (denied) return denied

    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      const member = await updateMember(id, { role: body.role })
      if (!member) {
        return c.json({ detail: 'not found' }, 404)
      }
      const actor = getAuditActor(c)
      await recordAuditEvent({
        ...actor,
        action: 'member.role_changed',
        resource_type: 'org_member',
        resource_id: member.id,
        metadata: { role: body.role },
      })
      return c.json(member)
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)
