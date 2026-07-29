import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sendToChannel } from '../../../services/channels/service.js'
import { getMessage, listMessages } from '../../../services/messages/service.js'

const listQuerySchema = z.object({
  direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  channel_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const createSchema = z.object({
  channel_id: z.string(),
  text: z.string().min(1),
})

export const adminMessageRoutes = new Hono()

adminMessageRoutes.get('/messages', zValidator('query', listQuerySchema), async (c) => {
  const { direction, channel_id: channelId, limit } = c.req.valid('query')
  const rows = await listMessages({
    limit,
    channelId,
    direction,
  })
  return c.json(rows)
})

adminMessageRoutes.get('/messages/:id', async (c) => {
  const message = await getMessage(c.req.param('id'))
  if (!message) {
    return c.json({ detail: 'Message not found' }, 404)
  }
  return c.json(message)
})

adminMessageRoutes.post('/messages', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const result = await sendToChannel(body.channel_id, body.text, 'admin')
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
    const message = await getMessage(result.messageId)
    if (!message) {
      return c.json({ detail: 'Message not found after send' }, 500)
    }
    return c.json(message, 201)
  } catch (err) {
    return c.json({ detail: String(err) }, 400)
  }
})
