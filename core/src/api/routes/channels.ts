import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  listChannels,
  registerChannel,
  sendToChannel,
  unregisterChannel,
} from '../../services/channels/service.js'
import { registerChannelSchema } from '../../services/channels/schemas.js'

const sendSchema = z.object({
  channel_id: z.string(),
  text: z.string(),
})

export const channelRoutes = new Hono()

channelRoutes.post('/register-channel', zValidator('json', registerChannelSchema), async (c) => {
  const body = c.req.valid('json')

  if (body.channel_type === 'MESSAGE' && !body.callback_url) {
    return c.json({ detail: 'MESSAGE channels require callback_url' }, 400)
  }

  const status = await registerChannel({
    channelId: body.channel_id,
    platform: body.platform,
    targetChatId: body.target_chat_id,
    credentials: body.credentials,
    callbackUrl: body.callback_url ?? null,
    channelType: body.channel_type,
  })

  if (status === 'updated') {
    return c.json({
      status: `Channel ${body.channel_id} already registered (config updated).`,
    })
  }

  return c.json({ status: `Channel ${body.channel_id} registered.` })
})

channelRoutes.post('/send', zValidator('json', sendSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    await sendToChannel(body.channel_id, body.text)
    return c.json({ status: 'sent' })
  } catch (err) {
    return c.json({ detail: String(err) }, 404)
  }
})

channelRoutes.get('/channels', async (c) => {
  const channels = await listChannels()
  return c.json(channels)
})

channelRoutes.delete('/channels/:id', async (c) => {
  const channelId = c.req.param('id')
  try {
    await unregisterChannel(channelId)
    return c.json({ status: `Channel ${channelId} unregistered.` })
  } catch (err) {
    return c.json({ detail: String(err) }, 404)
  }
})
