import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sendToChannel } from '../../services/channels/service.js'
import { getMessage, listMessages } from '../../services/messages/service.js'
import { sendMessageSchema } from '../../services/messages/schemas.js'

const listQuerySchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  channel_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const messageRoutes = new Hono()

messageRoutes.post('/messages/send', zValidator('json', sendMessageSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const result = await sendToChannel(body.channel_id, body.text, 'api')
    return c.json({
      status: 'sent',
      ...(result.messageId ? { message_id: result.messageId } : {}),
    })
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
})

messageRoutes.get('/messages', zValidator('query', listQuerySchema), async (c) => {
  const { direction, channel_id: channelId, limit } = c.req.valid('query')
  const rows = await listMessages({
    limit,
    channelId,
    direction,
  })
  return c.json(rows)
})

messageRoutes.get('/messages/:id', async (c) => {
  const id = c.req.param('id')
  if (id === 'send') {
    return c.json({ detail: 'Message not found' }, 404)
  }
  const message = await getMessage(id)
  if (!message) {
    return c.json({ detail: 'Message not found' }, 404)
  }
  return c.json(message)
})
