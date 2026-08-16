import { randomUUID } from 'node:crypto'
import type pg from 'pg'

export const PENDING = 'PENDING'
export const ANSWERED = 'ANSWERED'
export const EXPIRED = 'EXPIRED'

export const BATCH_COLLECTING = 'COLLECTING'
export const BATCH_RESOLVED = 'RESOLVED'
export const BATCH_CONFLICT = 'CONFLICT'
export const BATCH_EXPIRED = 'EXPIRED'

export const PROMPT_ANSWER_MODES = [
  'first_answer',
  'all_answer_same',
  'all_answer_majority',
] as const

export type PromptAnswerMode = (typeof PROMPT_ANSWER_MODES)[number]

export interface PromptAnswer {
  type: string
  value: string
  origin?: 'direct' | 'broadcast_sync'
  source_channel_id?: string
}

export function canAcceptTextReply(prompt: PromptRow | null): boolean {
  if (!prompt) return false
  if (prompt.state !== PENDING) return false
  return prompt.allow_text
}

export interface PromptRow {
  id: string
  organization_id: string
  channel_id: string
  prompt_num: number
  chat_id: string
  message_id: number | null
  text: string
  media_url: string | null
  options: string[] | null
  allow_text: boolean
  callback_url: string | null
  callback_headers: Record<string, string> | null
  correlation_id: string | null
  callback_data: unknown | null
  broadcast_batch_id: string | null
  broadcast_group_id: string | null
  broadcast_answer_mode: string | null
  broadcast_batch_status: string | null
  state: string
  created_at: Date
  expires_at: Date | null
  answered_at: Date | null
  answered_by_id: number | null
  answered_by_username: string | null
  answer: PromptAnswer | null
}

export function parsePromptId(promptId: string): number | null {
  if (promptId.startsWith('#')) {
    const n = Number(promptId.slice(1))
    return Number.isFinite(n) ? n : null
  }
  if (/^\d+$/.test(promptId)) return Number(promptId)
  return null
}

export function formatPromptId(promptNum: number): string {
  return `#${promptNum}`
}

export async function createPrompt(
  client: pg.PoolClient,
  input: {
    organizationId: string
    channelId: string
    chatId: string
    text: string
    mediaUrl: string | null
    options: string[]
    allowText: boolean
    callbackUrl: string | null
    callbackHeaders: Record<string, string> | null
    correlationId: string | null
    callbackData: unknown | null
    broadcastBatchId: string | null
    broadcastGroupId?: string | null
    broadcastAnswerMode?: string | null
    broadcastBatchStatus?: string | null
    ttlSec: number
  },
): Promise<{ promptId: string; row: PromptRow }> {
  const tempId = randomUUID()
  const expiresAt = input.ttlSec > 0 ? new Date(Date.now() + input.ttlSec * 1000) : null

  await client.query(
    'SELECT 1 FROM channels WHERE organization_id = $1 AND channel_id = $2 FOR UPDATE',
    [input.organizationId, input.channelId],
  )

  const nextResult = await client.query<{ next: number }>(
    `SELECT COALESCE(MAX(prompt_num), 0) + 1 AS next
     FROM prompts WHERE organization_id = $1 AND channel_id = $2`,
    [input.organizationId, input.channelId],
  )
  const promptNum = nextResult.rows[0]?.next ?? 1

  const result = await client.query<PromptRow>(
    `INSERT INTO prompts (
       id, organization_id, channel_id, prompt_num, chat_id, text, media_url, options,
       allow_text, callback_url, callback_headers, correlation_id, callback_data,
       broadcast_batch_id, broadcast_group_id, broadcast_answer_mode, broadcast_batch_status,
       state, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12::jsonb, $13, $14::jsonb,
       $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      tempId,
      input.organizationId,
      input.channelId,
      promptNum,
      input.chatId,
      input.text,
      input.mediaUrl,
      JSON.stringify(input.options),
      input.allowText,
      input.callbackUrl,
      input.callbackHeaders !== null ? JSON.stringify(input.callbackHeaders) : null,
      input.correlationId,
      input.callbackData !== null ? JSON.stringify(input.callbackData) : null,
      input.broadcastBatchId,
      input.broadcastGroupId ?? null,
      input.broadcastAnswerMode ?? null,
      input.broadcastBatchStatus ?? null,
      PENDING,
      expiresAt,
    ],
  )

  const row = result.rows[0]
  return { promptId: formatPromptId(row.prompt_num), row }
}

export async function addOptionMap(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
  optionId: string,
  label: string,
): Promise<void> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) throw new Error(`Invalid prompt id: ${promptId}`)

  const prompt = await client.query<{ id: string }>(
    'SELECT id FROM prompts WHERE organization_id = $1 AND channel_id = $2 AND prompt_num = $3',
    [organizationId, channelId, promptNum],
  )
  if (!prompt.rows[0]) throw new Error(`Prompt not found: ${promptId}`)

  await client.query(
    'INSERT INTO prompt_options(prompt_id, option_id, label) VALUES ($1, $2, $3)',
    [prompt.rows[0].id, optionId, label],
  )
}

export async function setMessageId(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
  messageId: number,
): Promise<void> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return
  await client.query(
    `UPDATE prompts SET message_id = $1
     WHERE organization_id = $2 AND channel_id = $3 AND prompt_num = $4`,
    [messageId, organizationId, channelId, promptNum],
  )
}

export type PromptListState = 'pending' | 'answered' | 'expired' | 'all'

export async function listPrompts(
  client: pg.PoolClient,
  organizationId: string,
  state: PromptListState,
  limit: number,
  channelId?: string | null,
  broadcastBatchId?: string | null,
  broadcastGroupId?: string | null,
): Promise<PromptRow[]> {
  const stateMap = {
    pending: PENDING,
    answered: ANSWERED,
    expired: EXPIRED,
  } as const

  const conditions: string[] = ['organization_id = $1']
  const params: unknown[] = [organizationId]
  let paramIndex = 2

  if (channelId) {
    conditions.push(`channel_id = $${paramIndex++}`)
    params.push(channelId)
  }

  if (state !== 'all') {
    conditions.push(`state = $${paramIndex++}`)
    params.push(stateMap[state])
  }

  if (broadcastBatchId) {
    conditions.push(`broadcast_batch_id = $${paramIndex++}`)
    params.push(broadcastBatchId)
  }

  if (broadcastGroupId) {
    conditions.push(`broadcast_group_id = $${paramIndex++}`)
    params.push(broadcastGroupId)
  }

  params.push(limit)

  const result = await client.query<PromptRow>(
    `SELECT * FROM prompts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIndex}`,
    params,
  )
  return result.rows
}

export async function getPrompt(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
): Promise<PromptRow | null> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return null
  const result = await client.query<PromptRow>(
    'SELECT * FROM prompts WHERE organization_id = $1 AND channel_id = $2 AND prompt_num = $3',
    [organizationId, channelId, promptNum],
  )
  return result.rows[0] ?? null
}

export async function resolveOptionLabel(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
  optionId: string,
): Promise<string | null> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return null

  const prompt = await client.query<{ id: string }>(
    'SELECT id FROM prompts WHERE organization_id = $1 AND channel_id = $2 AND prompt_num = $3',
    [organizationId, channelId, promptNum],
  )
  if (!prompt.rows[0]) return null

  const result = await client.query<{ label: string }>(
    'SELECT label FROM prompt_options WHERE prompt_id = $1 AND option_id = $2',
    [prompt.rows[0].id, optionId],
  )
  return result.rows[0]?.label ?? null
}

export interface CallbackInfo {
  callbackUrl: string
  callbackHeaders: Record<string, string> | null
  payload: Record<string, unknown>
}

export type MarkAnsweredResult =
  | {
      status: 'recorded'
      callbackInfo: CallbackInfo | null
      batchResolution: import('./broadcast-resolution.js').BatchResolutionResult | null
    }
  | { status: 'already_answered'; prompt: PromptRow }
  | { status: 'expired'; prompt: PromptRow }
  | { status: 'not_found' }

export function formatStoredAnswerValue(prompt: PromptRow): string | null {
  return prompt.answer?.value ?? null
}

export function formatRecordedReply(promptId: string, answerValue: string): string {
  return `Recorded answer for ID:${promptId} ${answerValue}`
}

export function formatAlreadyAnsweredReply(promptId: string, prompt: PromptRow): string {
  const value = formatStoredAnswerValue(prompt)
  if (value) {
    return `Already answered for ID:${promptId}: ${value}`
  }
  return `Already answered for ID:${promptId}`
}

export function formatBroadcastAlreadyAnsweredReply(prompt: PromptRow): string {
  const value = formatStoredAnswerValue(prompt)
  const source = prompt.answer?.source_channel_id
  if (source && value) {
    return `Already answered on ${source}: ${value}`
  }
  return formatAlreadyAnsweredReply(formatPromptId(prompt.prompt_num), prompt)
}

export function formatExpiredPromptReply(promptId: string): string {
  return `Prompt expired for ID:${promptId}`
}

function buildCallbackInfo(
  promptId: string,
  prompt: PromptRow,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
): CallbackInfo | null {
  if (!prompt.callback_url) return null

  const payload: Record<string, unknown> = {
    prompt_id: promptId,
    channel_id: prompt.channel_id,
    correlation_id: prompt.correlation_id,
    text: prompt.text,
    answer: {
      type: answer.type,
      value: answer.value,
      user_id: answer.userId,
      username: answer.username,
    },
    answered_at: prompt.answered_at?.toISOString() ?? new Date().toISOString(),
  }
  if (prompt.callback_data !== null && prompt.callback_data !== undefined) {
    payload.callback_data = prompt.callback_data
  }
  if (prompt.broadcast_batch_id) {
    payload.broadcast_batch_id = prompt.broadcast_batch_id
  }
  if (prompt.broadcast_answer_mode) {
    payload.broadcast_answer_mode = prompt.broadcast_answer_mode
  }
  if (prompt.broadcast_batch_status) {
    payload.broadcast_batch_status = prompt.broadcast_batch_status
  }

  return {
    callbackUrl: prompt.callback_url,
    callbackHeaders: prompt.callback_headers,
    payload,
  }
}

export async function markAnswered(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
): Promise<MarkAnsweredResult> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return { status: 'not_found' }

  const updateResult = await client.query(
    `UPDATE prompts
     SET state = $1,
         answer = jsonb_build_object('type', $2::text, 'value', $3::text, 'origin', 'direct'),
         answered_by_id = $4,
         answered_by_username = $5,
         answered_at = now()
     WHERE organization_id = $6 AND channel_id = $7 AND prompt_num = $8 AND state = $9`,
    [
      ANSWERED,
      answer.type,
      answer.value,
      answer.userId,
      answer.username,
      organizationId,
      channelId,
      promptNum,
      PENDING,
    ],
  )

  if (updateResult.rowCount && updateResult.rowCount > 0) {
    const { evaluateBroadcastBatch } = await import('./broadcast-resolution.js')
    const batchResolution = await evaluateBroadcastBatch(
      client,
      organizationId,
      channelId,
      promptId,
      answer,
    )

    const prompt = await getPrompt(client, organizationId, channelId, promptId)
    const callbackInfo =
      batchResolution?.callbackInfo ?? (prompt ? buildCallbackInfo(promptId, prompt, answer) : null)

    return {
      status: 'recorded',
      callbackInfo,
      batchResolution,
    }
  }

  const prompt = await getPrompt(client, organizationId, channelId, promptId)
  if (!prompt) return { status: 'not_found' }
  if (prompt.state === ANSWERED) return { status: 'already_answered', prompt }
  if (prompt.state === EXPIRED) return { status: 'expired', prompt }
  return { status: 'not_found' }
}

export async function expireOld(client: pg.PoolClient): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH upd AS (
       UPDATE prompts SET state = $1
       WHERE state = $2 AND expires_at IS NOT NULL AND now() > expires_at
       RETURNING 1
     ) SELECT count(*)::text AS c FROM upd`,
    [EXPIRED, PENDING],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function cleanOnBoot(client: pg.PoolClient): Promise<void> {
  await client.query('DELETE FROM prompts WHERE state = $1 AND message_id IS NULL', [PENDING])
}

export async function deleteOlderThan(
  client: pg.PoolClient,
  organizationId: string,
  days: number,
): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH del AS (
       DELETE FROM prompts
       WHERE organization_id = $2
         AND created_at < now() - ($1::int * interval '1 day')
       RETURNING 1
     ) SELECT count(*)::text AS c FROM del`,
    [days, organizationId],
  )
  return Number(result.rows[0]?.c ?? 0)
}

export async function getPromptByActionKey(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  actionKey: string,
): Promise<{ promptId: string; optionId: string } | null> {
  const idx = actionKey.indexOf(':')
  if (idx === -1) return null
  const promptId = actionKey.slice(0, idx)
  const optionId = actionKey.slice(idx + 1)
  const prompt = await getPrompt(client, organizationId, channelId, promptId)
  if (!prompt) return null
  return { promptId, optionId }
}
