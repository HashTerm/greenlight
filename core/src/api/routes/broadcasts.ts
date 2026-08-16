import type { Context } from 'hono'
import { Hono } from 'hono'
import { z } from 'zod'
import { licenseGate } from '../../extensions/license-gate.js'
import { recordAuditEvent } from '../../extensions/audit.js'
import { getAuditEventContext } from '../middleware/audit-actor.js'
import { getOrganizationId } from '../middleware/org-context.js'
import { requireScope } from '../middleware/require-scope.js'
import { getApiKey, getApiKeyId } from '../middleware/auth.js'
import { loadConfig } from '../../core/config.js'
import { hasAnyScope, type Scope } from '../../services/api-keys/scopes.js'
import { ValueError } from '../../core/security.js'
import { createBroadcast, listBroadcasts, getBroadcast } from '../../services/broadcasts/service.js'
import { formatPromptId, type PromptRow } from '../../services/prompts/models.js'
import type { MessageRow } from '../../services/messages/models.js'

export const broadcastRoutes = new Hono()

const callbackDataSchema = z.record(z.string(), z.unknown()).or(z.array(z.unknown()))
const callbackHeadersSchema = z.record(z.string(), z.string())

const createBroadcastSchema = z.object({
  kind: z.enum(['prompt', 'message']),
  channel_ids: z.array(z.string()).min(2).max(50),
  text: z.string().max(4096),
  options: z.array(z.string().max(64)).max(10).optional().nullable(),
  allow_text: z.boolean().optional().default(false),
  callback_url: z.string().optional().nullable(),
  correlation_id: z.string().max(255).optional().nullable(),
  callback_data: callbackDataSchema.optional().nullable(),
  callback_headers: callbackHeadersSchema.optional().nullable(),
  ttl_sec: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 3600)
    .optional()
    .nullable(),
  media_url: z.string().optional().nullable(),
  media_path: z.string().optional().nullable(),
})

function serializePromptRow(row: PromptRow) {
  return {
    id: formatPromptId(row.prompt_num),
    prompt_num: row.prompt_num,
    chat_id: row.chat_id,
    channel_id: row.channel_id,
    message_id: row.message_id,
    text: row.text,
    media_url: row.media_url,
    options: row.options,
    allow_text: row.allow_text,
    callback_url: row.callback_url,
    correlation_id: row.correlation_id,
    callback_data: row.callback_data,
    callback_headers_configured: Boolean(
      row.callback_headers && Object.keys(row.callback_headers).length > 0,
    ),
    broadcast_id: row.broadcast_id,
    state: row.state,
    created_at: row.created_at.toISOString(),
    expires_at: row.expires_at?.toISOString() ?? null,
    answered_at: row.answered_at?.toISOString() ?? null,
    answered_by_id: row.answered_by_id,
    answered_by_username: row.answered_by_username,
    answer: row.answer,
  }
}

function serializeMessageRow(row: MessageRow) {
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

function broadcastGate(c: Context): Response | null {
  if (!licenseGate.isEnabled('broadcast')) {
    return c.json({ detail: 'not found' }, 404)
  }
  return null
}

function requireBroadcastCreateScope(c: Context, kind: 'prompt' | 'message'): Response | null {
  const config = loadConfig()
  if (!config.USE_AUTH) {
    return null
  }
  const required: Scope[] = kind === 'message' ? ['messages:send'] : ['prompts:write']
  const apiKey = getApiKey(c)
  if (!hasAnyScope(apiKey.scopes, required)) {
    return c.json({ detail: 'Insufficient scope' }, 403)
  }
  return null
}

broadcastRoutes.post('/broadcasts/new', async (c) => {
  const blocked = broadcastGate(c)
  if (blocked) return blocked

  const contentType = c.req.header('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return c.json({ detail: 'Unsupported Content-Type. Use application/json.' }, 415)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ detail: 'Invalid JSON body' }, 400)
  }

  const parsed = createBroadcastSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ detail: parsed.error.flatten() }, 400)
  }

  const data = parsed.data
  const scopeBlocked = requireBroadcastCreateScope(c, data.kind)
  if (scopeBlocked) return scopeBlocked

  try {
    const result = await createBroadcast({
      organizationId: getOrganizationId(c),
      kind: data.kind,
      channelIds: data.channel_ids,
      text: data.text,
      apiKeyId: getApiKeyId(c),
      options: data.options ?? [],
      allowText: data.allow_text,
      callbackUrl: data.callback_url,
      callbackHeaders: data.callback_headers,
      correlationId: data.correlation_id,
      callbackData: data.callback_data,
      ttlSec: data.ttl_sec ?? 3600,
      mediaUrl: data.media_url,
      mediaPath: data.media_path,
    })
    await recordAuditEvent({
      ...getAuditEventContext(c),
      action: 'broadcast.created',
      resource_type: 'broadcast',
      resource_id: result.broadcast_id,
      metadata: {
        kind: result.kind,
        channel_ids: data.channel_ids,
        child_count: result.channels.length,
      },
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof ValueError) {
      return c.json({ detail: err.message }, 400)
    }
    console.error('create broadcast error:', err)
    return c.json({ detail: String(err) }, 500)
  }
})

broadcastRoutes.get('/broadcasts', requireScope('prompts:read', 'messages:read'), async (c) => {
  const blocked = broadcastGate(c)
  if (blocked) return blocked

  const limit = Number(c.req.query('limit') ?? '50')
  const rows = await listBroadcasts(getOrganizationId(c), Number.isFinite(limit) ? limit : 50)
  return c.json(rows)
})

broadcastRoutes.get('/broadcasts/:id', requireScope('prompts:read', 'messages:read'), async (c) => {
  const blocked = broadcastGate(c)
  if (blocked) return blocked

  const broadcastId = decodeURIComponent(c.req.param('id') ?? '')
  const detail = await getBroadcast(getOrganizationId(c), broadcastId)
  if (!detail) {
    return c.json({ detail: 'not found' }, 404)
  }

  return c.json({
    ...detail.summary,
    prompts: detail.prompts.map(serializePromptRow),
    messages: detail.messages.map(serializeMessageRow),
  })
})
