import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sendToChannel } from '../../services/channels/service.js'
import { getMessage, listMessages } from '../../services/messages/service.js'
import { sendMessageSchema } from '../../services/messages/schemas.js'
import { ValueError } from '../../core/security.js'
import { licenseGate } from '../../extensions/license-gate.js'
import { getApiKeyId } from '../middleware/auth.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'
import { resolveSendTargets } from '../../services/fan-out/targets.js'
import { fanOutMessages } from '../../services/fan-out/service.js'

const listQuerySchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  channel_id: z.string().optional(),
  broadcast_batch_id: z.string().optional(),
  broadcast_group_id: z.string().optional(),
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
  broadcast_batch_id: string | null
  broadcast_group_id: string | null
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
    broadcast_batch_id: row.broadcast_batch_id,
    broadcast_group_id: row.broadcast_group_id,
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
    const apiKeyId = getApiKeyId(c)

    try {
      const targets = await resolveSendTargets(
        organizationId,
        {
          channel_id: body.channel_id,
          broadcast_group: body.broadcast_group,
          broadcast_group_id: body.broadcast_group_id,
        },
        'MESSAGE',
      )

      if (!targets.isFanOut) {
        const channelId = targets.channelIds[0]!
        const result = await sendToChannel(organizationId, channelId, body.text, apiKeyId)
        if (!result.messageId) {
          return c.json(
            {
              status: 'sent',
              stored: false,
              channel_id: channelId,
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
          metadata: { channel_id: channelId },
        })
        return c.json(serializeMessageRow(message), 201)
      }

      const fanOut = await fanOutMessages({
        organizationId,
        channelIds: targets.channelIds,
        broadcastGroupId: targets.broadcastGroupId,
        text: body.text,
        apiKeyId,
      })

      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'message.sent',
        resource_type: 'broadcast_batch',
        resource_id: fanOut.broadcast_batch_id,
        metadata: {
          channel_ids: targets.channelIds,
          child_count: fanOut.channels.length,
          broadcast_group_id: targets.broadcastGroupId,
        },
      })

      if (fanOut.channels.length === 1) {
        const single = fanOut.channels[0]!
        if (!single.message_id) {
          return c.json(
            {
              status: 'sent',
              stored: false,
              channel_id: single.channel_id,
              text: body.text,
              direction: 'outbound',
              broadcast_batch_id: fanOut.broadcast_batch_id,
            },
            201,
          )
        }
        const message = await getMessage(organizationId, single.message_id)
        if (!message) {
          return c.json({ detail: 'Message not found after send' }, 500)
        }
        return c.json(
          {
            ...serializeMessageRow(message),
            broadcast_batch_id: fanOut.broadcast_batch_id,
          },
          201,
        )
      }

      return c.json(fanOut, 201)
    } catch (err) {
      if (err instanceof ValueError) {
        return c.json({ detail: err.message }, 400)
      }
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
    const {
      direction,
      channel_id: channelId,
      broadcast_batch_id,
      broadcast_group_id,
      limit,
    } = c.req.valid('query')
    if (broadcast_group_id && !licenseGate.isEnabled('broadcast_groups')) {
      return c.json({ detail: 'not found' }, 404)
    }
    const rows = await listMessages({
      organizationId: getOrganizationId(c),
      limit,
      channelId,
      direction,
      broadcastBatchId: broadcast_batch_id,
      broadcastGroupId: broadcast_group_id,
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
