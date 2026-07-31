import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getRetentionSettings, updateRetentionSettings } from '../../services/settings/service.js'
import { requireScope } from '../middleware/require-scope.js'
import { getApiKeyId } from '../middleware/auth.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'

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

export const settingsRoutes = new Hono()

settingsRoutes.get('/settings', requireScope('settings:read'), async (c) => {
  const settings = await getRetentionSettings(getOrganizationId(c))
  return c.json(settings)
})

settingsRoutes.patch(
  '/settings',
  requireScope('settings:write'),
  zValidator('json', patchSchema),
  async (c) => {
    const body = c.req.valid('json')
    try {
      const settings = await updateRetentionSettings(getOrganizationId(c), {
        promptsRetentionEnabled: body.prompts_retention_enabled,
        promptsRetentionDays: body.prompts_retention_days,
        messagesInboundRetentionEnabled: body.messages_inbound_retention_enabled,
        messagesOutboundRetentionEnabled: body.messages_outbound_retention_enabled,
        messagesInboundRetentionDays: body.messages_inbound_retention_days,
        messagesOutboundRetentionDays: body.messages_outbound_retention_days,
        messagesInboundZeroRetention: body.messages_inbound_zero_retention,
        messagesOutboundZeroRetention: body.messages_outbound_zero_retention,
      })
      await recordAuditEvent({
        ...getAuditEventContext(c),
        action: 'settings.updated',
        resource_type: 'settings',
        metadata: body,
      })
      return c.json(settings)
    } catch (err) {
      return c.json({ detail: String(err) }, 400)
    }
  },
)
