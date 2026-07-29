import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  getRetentionSettings,
  updateRetentionSettings,
} from '../../../services/settings/service.js'

const patchSchema = z.object({
  prompts_retention_enabled: z.boolean(),
  prompts_retention_days: z.coerce.number().int(),
  messages_inbound_retention_enabled: z.boolean(),
  messages_outbound_retention_enabled: z.boolean(),
  messages_inbound_retention_days: z.coerce.number().int(),
  messages_outbound_retention_days: z.coerce.number().int(),
  messages_inbound_zero_retention: z.boolean(),
  messages_outbound_zero_retention: z.boolean(),
})

export const adminSettingsRoutes = new Hono()

adminSettingsRoutes.get('/settings', async (c) => {
  const settings = await getRetentionSettings()
  return c.json(settings)
})

adminSettingsRoutes.patch('/settings', zValidator('json', patchSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const settings = await updateRetentionSettings({
      promptsRetentionEnabled: body.prompts_retention_enabled,
      promptsRetentionDays: body.prompts_retention_days,
      messagesInboundRetentionEnabled: body.messages_inbound_retention_enabled,
      messagesOutboundRetentionEnabled: body.messages_outbound_retention_enabled,
      messagesInboundRetentionDays: body.messages_inbound_retention_days,
      messagesOutboundRetentionDays: body.messages_outbound_retention_days,
      messagesInboundZeroRetention: body.messages_inbound_zero_retention,
      messagesOutboundZeroRetention: body.messages_outbound_zero_retention,
    })
    return c.json(settings)
  } catch (err) {
    return c.json({ detail: String(err) }, 400)
  }
})
