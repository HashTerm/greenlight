import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { PLATFORMS } from '../../core/platform.js'
import {
  ChannelAlreadyExistsError,
  ChannelNotFoundError,
  createChannel,
  listChannels,
  unregisterChannel,
  updateChannel,
} from '../../services/channels/service.js'
import { createChannelSchema, updateChannelSchema } from '../../services/channels/schemas.js'
import { requireScope } from '../middleware/require-scope.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'

const listQuerySchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  channel_type: z.enum(['MESSAGE', 'PROMPT']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const channelRoutes = new Hono()

channelRoutes.post(
  '/channels/new',
  requireScope('channels:write'),
  zValidator('json', createChannelSchema),
  async (c) => {
    const body = c.req.valid('json')

    if (body.channel_type === 'MESSAGE' && !body.callback_url) {
      return c.json({ detail: 'MESSAGE channels require callback_url' }, 400)
    }

    const organizationId = getOrganizationId(c)

    try {
      await createChannel({
        organizationId,
        channelId: body.channel_id,
        platform: body.platform,
        targetChatId: body.target_chat_id,
        credentials: body.credentials,
        callbackUrl: body.callback_url ?? null,
        channelType: body.channel_type,
      })
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'channel.created',
        resource_type: 'channel',
        resource_id: body.channel_id,
        metadata: { platform: body.platform, channel_type: body.channel_type },
      })
      return c.json({ status: `Channel ${body.channel_id} registered.` }, 201)
    } catch (err) {
      if (err instanceof ChannelAlreadyExistsError) {
        return c.json({ detail: err.message }, 409)
      }
      throw err
    }
  },
)

channelRoutes.get(
  '/channels',
  requireScope('channels:read'),
  zValidator('query', listQuerySchema),
  async (c) => {
    const { platform, channel_type: channelType, limit } = c.req.valid('query')
    const organizationId = getOrganizationId(c)
    const channels = await listChannels({
      organizationId,
      limit,
      ...(platform ? { platform } : {}),
      ...(channelType ? { channelType } : {}),
    })
    return c.json(channels)
  },
)

channelRoutes.patch('/channels/new', (c) => c.json({ detail: 'Channel not found' }, 404))
channelRoutes.delete('/channels/new', (c) => c.json({ detail: 'Channel not found' }, 404))

channelRoutes.patch(
  '/channels/:id',
  requireScope('channels:write'),
  zValidator('json', updateChannelSchema),
  async (c) => {
    const channelId = decodeURIComponent(c.req.param('id'))
    const body = c.req.valid('json')
    const organizationId = getOrganizationId(c)

    try {
      await updateChannel(organizationId, channelId, {
        targetChatId: body.target_chat_id,
        credentials: body.credentials,
        callbackUrl: body.callback_url,
      })
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'channel.updated',
        resource_type: 'channel',
        resource_id: channelId,
      })
      return c.json({ status: `Channel ${channelId} updated.` })
    } catch (err) {
      if (err instanceof ChannelNotFoundError) {
        return c.json({ detail: err.message }, 404)
      }
      if (err instanceof Error && err.message === 'MESSAGE channels require callback_url') {
        return c.json({ detail: err.message }, 400)
      }
      throw err
    }
  },
)

channelRoutes.delete('/channels/:id', requireScope('channels:write'), async (c) => {
  const channelId = decodeURIComponent(c.req.param('id') ?? '')
  const organizationId = getOrganizationId(c)
  try {
    await unregisterChannel(organizationId, channelId)
    await recordAuditEvent({
      ...getAuditEventContext(c),
      action: 'channel.deleted',
      resource_type: 'channel',
      resource_id: channelId,
    })
    return c.json({ status: `Channel ${channelId} unregistered.` })
  } catch (err) {
    if (err instanceof ChannelNotFoundError) {
      return c.json({ detail: err.message }, 404)
    }
    throw err
  }
})
