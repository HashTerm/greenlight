import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sendToChannel } from '../../services/channels/service.js'
import { getMessage, listMessages } from '../../services/messages/service.js'
import { sendMessageSchema } from '../../services/messages/schemas.js'
import { getApiKeyId } from '../middleware/auth.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'

const listQuerySchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  channel_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const messageRoutes = new Hono()

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
      return c.json(message, 201)
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
    const { direction, channel_id: channelId, limit } = c.req.valid('query')
    const rows = await listMessages({
      organizationId: getOrganizationId(c),
      limit,
      channelId,
      direction,
    })
    return c.json(rows)
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
  return c.json(message)
})
