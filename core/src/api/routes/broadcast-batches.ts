import type { Context } from 'hono'
import { Hono } from 'hono'
import { requireScope } from '../middleware/require-scope.js'
import { getOrganizationId } from '../middleware/org-context.js'
import { formatPromptId, type PromptRow } from '../../services/prompts/models.js'
import type { MessageRow } from '../../services/messages/models.js'
import { getFanOutSend } from '../../services/fan-out/service.js'

export const broadcastBatchRoutes = new Hono()

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
    broadcast_batch_id: row.broadcast_batch_id,
    broadcast_group_id: row.broadcast_group_id,
    broadcast_answer_mode: row.broadcast_answer_mode,
    broadcast_batch_status: row.broadcast_batch_status,
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
    broadcast_batch_id: row.broadcast_batch_id,
    broadcast_group_id: row.broadcast_group_id,
    created_at: row.created_at.toISOString(),
  }
}

async function handleGetBroadcastBatch(c: Context, broadcastBatchId: string) {
  const detail = await getFanOutSend(getOrganizationId(c), broadcastBatchId)
  if (!detail) {
    return c.json({ detail: 'not found' }, 404)
  }

  return c.json({
    ...detail.summary,
    prompts: detail.prompts.map(serializePromptRow),
    messages: detail.messages.map(serializeMessageRow),
  })
}

broadcastBatchRoutes.get(
  '/broadcast-batches/:broadcast_batch_id',
  requireScope('prompts:read', 'messages:read'),
  async (c) => {
    const broadcastBatchId = decodeURIComponent(c.req.param('broadcast_batch_id') ?? '')
    return handleGetBroadcastBatch(c, broadcastBatchId)
  },
)
