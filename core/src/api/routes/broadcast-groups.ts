import type { Context } from 'hono'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { licenseGate } from '../../extensions/license-gate.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'
import { ValueError } from '../../core/security.js'
import {
  createBroadcastGroup,
  deleteBroadcastGroup,
  getBroadcastGroup,
  listBroadcastGroups,
  updateBroadcastGroup,
} from '../../services/broadcast-groups/service.js'

export const broadcastGroupRoutes = new Hono()

const kindSchema = z.enum(['prompt', 'message'])

const createSchema = z
  .object({
    name: z.string().min(1).max(255),
    kind: kindSchema,
    channel_ids: z.array(z.string()).min(1).max(50),
    prompt_answer_mode: z
      .enum(['first_answer', 'all_answer_same', 'all_answer_majority'])
      .optional(),
  })
  .refine((data) => data.kind !== 'prompt' || Boolean(data.prompt_answer_mode), {
    message: 'prompt_answer_mode is required for prompt broadcast groups',
  })

const updateSchema = z.object({
  name: z.string().min(1).max(255),
  channel_ids: z.array(z.string()).min(1).max(50),
  prompt_answer_mode: z
    .enum(['first_answer', 'all_answer_same', 'all_answer_majority'])
    .optional(),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  kind: kindSchema.optional(),
})

function broadcastGate(c: Context): Response | null {
  if (!licenseGate.isEnabled('broadcast')) {
    return c.json({ detail: 'not found' }, 404)
  }
  return null
}

broadcastGroupRoutes.get(
  '/broadcast-groups',
  requireScope('prompts:read', 'messages:read'),
  zValidator('query', listQuerySchema),
  async (c) => {
    const blocked = broadcastGate(c)
    if (blocked) return blocked

    const { limit, kind } = c.req.valid('query')
    const rows = await listBroadcastGroups(getOrganizationId(c), limit, kind)
    return c.json(rows)
  },
)

broadcastGroupRoutes.post(
  '/broadcast-groups',
  requireScope('prompts:write', 'messages:send'),
  zValidator('json', createSchema),
  async (c) => {
    const blocked = broadcastGate(c)
    if (blocked) return blocked

    const data = c.req.valid('json')
    try {
      const group = await createBroadcastGroup({
        organizationId: getOrganizationId(c),
        name: data.name,
        kind: data.kind,
        channelIds: data.channel_ids,
        promptAnswerMode: data.prompt_answer_mode,
      })
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'broadcast_group.created',
        resource_type: 'broadcast_group',
        resource_id: group.broadcast_group_id,
        metadata: { kind: group.kind, channel_ids: group.channel_ids },
      })
      return c.json(group, 201)
    } catch (err) {
      if (err instanceof ValueError) {
        return c.json({ detail: err.message }, 400)
      }
      console.error('create broadcast group error:', err)
      return c.json({ detail: String(err) }, 500)
    }
  },
)

broadcastGroupRoutes.get(
  '/broadcast-groups/:broadcast_group_id',
  requireScope('prompts:read', 'messages:read'),
  async (c) => {
    const blocked = broadcastGate(c)
    if (blocked) return blocked

    const id = decodeURIComponent(c.req.param('broadcast_group_id') ?? '')
  const group = await getBroadcastGroup(getOrganizationId(c), id)
  if (!group) {
    return c.json({ detail: 'not found' }, 404)
  }
  return c.json(group)
  },
)

broadcastGroupRoutes.patch(
  '/broadcast-groups/:broadcast_group_id',
  requireScope('prompts:write', 'messages:send'),
  zValidator('json', updateSchema),
  async (c) => {
    const blocked = broadcastGate(c)
    if (blocked) return blocked

    const id = decodeURIComponent(c.req.param('broadcast_group_id') ?? '')
    const data = c.req.valid('json')
    try {
      const group = await updateBroadcastGroup({
        organizationId: getOrganizationId(c),
        broadcastGroupId: id,
        name: data.name,
        channelIds: data.channel_ids,
        promptAnswerMode: data.prompt_answer_mode,
      })
      if (!group) {
        return c.json({ detail: 'not found' }, 404)
      }
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'broadcast_group.updated',
        resource_type: 'broadcast_group',
        resource_id: group.broadcast_group_id,
        metadata: { channel_ids: group.channel_ids },
      })
      return c.json(group)
    } catch (err) {
      if (err instanceof ValueError) {
        return c.json({ detail: err.message }, 400)
      }
      console.error('update broadcast group error:', err)
      return c.json({ detail: String(err) }, 500)
    }
  },
)

broadcastGroupRoutes.delete(
  '/broadcast-groups/:broadcast_group_id',
  requireScope('prompts:write', 'messages:send'),
  async (c) => {
    const blocked = broadcastGate(c)
    if (blocked) return blocked

    const id = decodeURIComponent(c.req.param('broadcast_group_id') ?? '')
    const deleted = await deleteBroadcastGroup(getOrganizationId(c), id)
    if (!deleted) {
      return c.json({ detail: 'not found' }, 404)
    }
    await recordAuditEvent({
      ...getAuditEventContext(c),
      action: 'broadcast_group.deleted',
      resource_type: 'broadcast_group',
      resource_id: id,
    })
    return c.json({ ok: true })
  },
)
