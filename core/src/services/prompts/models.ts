import { randomUUID } from 'node:crypto'
import type pg from 'pg'

export const PENDING = 'PENDING'
export const ANSWERED = 'ANSWERED'
export const EXPIRED = 'EXPIRED'

export function canAcceptTextReply(prompt: PromptRow | null): boolean {
  if (!prompt) return false
  if (prompt.state !== PENDING) return false
  return prompt.allow_text
}

export interface PromptRow {
  id: string
  prompt_num: number
  chat_id: string
  message_id: number | null
  text: string
  media_url: string | null
  options: string[] | null
  allow_text: boolean
  callback_url: string | null
  correlation_id: string | null
  state: string
  created_at: Date
  expires_at: Date | null
  answered_at: Date | null
  answered_by_id: number | null
  answered_by_username: string | null
  answer: { type: string; value: string } | null
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
    chatId: string
    text: string
    mediaUrl: string | null
    options: string[]
    allowText: boolean
    callbackUrl: string | null
    correlationId: string | null
    ttlSec: number
  },
): Promise<{ promptId: string; row: PromptRow }> {
  const tempId = randomUUID()
  const expiresAt = input.ttlSec > 0 ? new Date(Date.now() + input.ttlSec * 1000) : null

  const result = await client.query<PromptRow>(
    `INSERT INTO prompts (id, chat_id, text, media_url, options, allow_text, callback_url,
      correlation_id, state, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      tempId,
      input.chatId,
      input.text,
      input.mediaUrl,
      JSON.stringify(input.options),
      input.allowText,
      input.callbackUrl,
      input.correlationId,
      PENDING,
      expiresAt,
    ],
  )

  const row = result.rows[0]
  return { promptId: formatPromptId(row.prompt_num), row }
}

export async function addOptionMap(
  client: pg.PoolClient,
  promptId: string,
  optionId: string,
  label: string,
): Promise<void> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) throw new Error(`Invalid prompt id: ${promptId}`)

  const prompt = await client.query<{ id: string }>(
    'SELECT id FROM prompts WHERE prompt_num = $1',
    [promptNum],
  )
  if (!prompt.rows[0]) throw new Error(`Prompt not found: ${promptId}`)

  await client.query(
    'INSERT INTO prompt_options(prompt_id, option_id, label) VALUES ($1, $2, $3)',
    [prompt.rows[0].id, optionId, label],
  )
}

export async function setMessageId(
  client: pg.PoolClient,
  promptId: string,
  messageId: number,
): Promise<void> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return
  await client.query('UPDATE prompts SET message_id = $1 WHERE prompt_num = $2', [
    messageId,
    promptNum,
  ])
}

export async function listPending(client: pg.PoolClient): Promise<PromptRow[]> {
  const result = await client.query<PromptRow>(
    'SELECT * FROM prompts WHERE state = $1 ORDER BY created_at DESC',
    [PENDING],
  )
  return result.rows
}

export type PromptListState = 'pending' | 'answered' | 'expired' | 'all'

export async function listPrompts(
  client: pg.PoolClient,
  state: PromptListState,
  limit: number,
): Promise<PromptRow[]> {
  if (state === 'all') {
    const result = await client.query<PromptRow>(
      'SELECT * FROM prompts ORDER BY created_at DESC LIMIT $1',
      [limit],
    )
    return result.rows
  }

  const stateMap = {
    pending: PENDING,
    answered: ANSWERED,
    expired: EXPIRED,
  } as const

  const result = await client.query<PromptRow>(
    'SELECT * FROM prompts WHERE state = $1 ORDER BY created_at DESC LIMIT $2',
    [stateMap[state], limit],
  )
  return result.rows
}

export async function getPrompt(
  client: pg.PoolClient,
  promptId: string,
): Promise<PromptRow | null> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return null
  const result = await client.query<PromptRow>('SELECT * FROM prompts WHERE prompt_num = $1', [
    promptNum,
  ])
  return result.rows[0] ?? null
}

export async function resolveOptionLabel(
  client: pg.PoolClient,
  promptId: string,
  optionId: string,
): Promise<string | null> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return null

  const prompt = await client.query<{ id: string }>(
    'SELECT id FROM prompts WHERE prompt_num = $1',
    [promptNum],
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
  payload: Record<string, unknown>
}

export async function markAnswered(
  client: pg.PoolClient,
  promptId: string,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
): Promise<CallbackInfo | null> {
  const promptNum = parsePromptId(promptId)
  if (!promptNum) return null

  await client.query(
    `UPDATE prompts
     SET state = $1,
         answer = jsonb_build_object('type', $2::text, 'value', $3::text),
         answered_by_id = $4,
         answered_by_username = $5,
         answered_at = now()
     WHERE prompt_num = $6 AND state = $7`,
    [ANSWERED, answer.type, answer.value, answer.userId, answer.username, promptNum, PENDING],
  )

  const prompt = await getPrompt(client, promptId)
  if (!prompt?.callback_url) return null

  return {
    callbackUrl: prompt.callback_url,
    payload: {
      prompt_id: promptId,
      correlation_id: prompt.correlation_id,
      text: prompt.text,
      answer: {
        type: answer.type,
        value: answer.value,
        user_id: answer.userId,
        username: answer.username,
      },
      answered_at: prompt.answered_at?.toISOString() ?? new Date().toISOString(),
    },
  }
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

export async function getPromptByActionKey(
  client: pg.PoolClient,
  actionKey: string,
): Promise<{ promptId: string; optionId: string } | null> {
  const idx = actionKey.indexOf(':')
  if (idx === -1) return null
  return {
    promptId: actionKey.slice(0, idx),
    optionId: actionKey.slice(idx + 1),
  }
}
