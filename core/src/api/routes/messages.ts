import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sendToChannel } from '../../services/channels/service.js'
import { getMessage, listMessages } from '../../services/messages/service.js'
import { sendMessageSchema } from '../../services/messages/schemas.js'
import { licenseGate } from '../../extensions/license-gate.js'
import { getApiKeyId } from '../middleware/auth.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'

const listQuerySchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  channel_id: z.string().optional(),
  broadcast_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const messageRoutes = new Hono()

function serializeMessageRow(row: {
  id: string
  channel_id: string
  direction: string
  text: string
  platform: string
  from_user: string | null
  api_key_id: string | null
  platform_message_id: string | null
  broadcast_id: string | null
  created_at: Date
}) {
  return {
    id: row.id,
    channel_id: row.channel_id,
    direction: row.direction,
    text: row.text,
    platform: row.platform,
    from_user: row.from_user,
    api_key_id: row.api_key_id,
    platform_message_id: row.platform_message_id,
    broadcast_id: row.broadcast_id,
    created_at: row.created_at.toISOString(),
  }
}

messageRoutes.post(
  '/messages/send',
  requireScope('messages:send'),
  zValidator('json', sendMessageSchema),
  async (c) => {
    const body = c.req.valid('json')
    const organizationId = getOrganizationId(c)
    try {
      const result = await sendToChannel(organizationId, body.channel_id, body.text, getApiKeyId(c))
      if (!result.messageId) {
        return c.json(
          {
            status: 'sent',
            stored: false,
            channel_id: body.channel_id,
            text: body.text,
            direction: 'outbound',
          },
          201,
        )
      }
      const message = await getMessage(organizationId, result.messageId)
      if (!message) {
        return c.json({ detail: 'Message not found after send' }, 500)
      }
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'message.sent',
        resource_type: 'message',
        resource_id: message.id,
        metadata: { channel_id: body.channel_id },
      })
      return c.json(serializeMessageRow(message), 201)
    } catch (err) {
      const message = String(err)
      if (message.includes('not registered') || message.includes('not found')) {
        return c.json({ detail: message }, 404)
      }
      if (message.includes('not a MESSAGE channel')) {
        return c.json({ detail: message }, 400)
      }
      return c.json({ detail: message }, 400)
    }
  },
)

messageRoutes.get(
  '/messages',
  requireScope('messages:read'),
  zValidator('query', listQuerySchema),
  async (c) => {
    const { direction, channel_id: channelId, broadcast_id, limit } = c.req.valid('query')
    if (broadcast_id && !licenseGate.isEnabled('broadcast')) {
      return c.json({ detail: 'not found' }, 404)
    }
    const rows = await listMessages({
      organizationId: getOrganizationId(c),
      limit,
      channelId,
      direction,
      broadcastId: broadcast_id,
    })
    return c.json(rows.map(serializeMessageRow))
  },
)

messageRoutes.get('/messages/:id', requireScope('messages:read'), async (c) => {
  const id = c.req.param('id')
  if (id === 'send') {
    return c.json({ detail: 'Message not found' }, 404)
  }
  const message = await getMessage(getOrganizationId(c), id ?? '')
  if (!message) {
    return c.json({ detail: 'Message not found' }, 404)
  }
  return c.json(serializeMessageRow(message))
})
