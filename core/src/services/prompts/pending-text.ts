import type pg from 'pg'
import type { PromptRow } from './models.js'

export const TEXT_OPTION_ID = 'text'
export const TYPE_ANSWER_BUTTON_LABEL = 'Type answer'

export interface PendingTextReplyRow {
  organization_id: string
  chat_id: string
  user_id: number
  prompt_id: string
  expires_at: Date
  created_at: Date
}

export function formatTypeAnswerInstruction(promptId: string): string {
  return `Type your answer for Prompt ${promptId}. Your next message will be recorded as the answer.`
}

export function formatTypeAnswerSwitched(fromPromptId: string, toPromptId: string): string {
  return `Switched to Prompt ${toPromptId} for text answer.`
}

export function computeTextArmExpiresAt(prompt: PromptRow, armTtlSec: number): Date {
  const cap = new Date(Date.now() + armTtlSec * 1000)
  if (prompt.expires_at && prompt.expires_at < cap) {
    return prompt.expires_at
  }
  return cap
}

export async function armPendingTextReply(
  client: pg.PoolClient,
  input: {
    organizationId: string
    chatId: string
    userId: number
    promptId: string
    expiresAt: Date
  },
): Promise<string | null> {
  const existing = await client.query<{ prompt_id: string }>(
    `SELECT prompt_id FROM pending_text_replies
     WHERE organization_id = $1 AND chat_id = $2 AND user_id = $3`,
    [input.organizationId, input.chatId, input.userId],
  )
  const previousPromptId = existing.rows[0]?.prompt_id ?? null

  await client.query(
    `INSERT INTO pending_text_replies (organization_id, chat_id, user_id, prompt_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (organization_id, chat_id, user_id)
     DO UPDATE SET prompt_id = EXCLUDED.prompt_id, expires_at = EXCLUDED.expires_at, created_at = now()`,
    [input.organizationId, input.chatId, input.userId, input.promptId, input.expiresAt],
  )

  if (previousPromptId && previousPromptId !== input.promptId) {
    return previousPromptId
  }
  return null
}

export async function getPendingTextReply(
  client: pg.PoolClient,
  organizationId: string,
  chatId: string,
  userId: number,
): Promise<PendingTextReplyRow | null> {
  const result = await client.query<PendingTextReplyRow>(
    `SELECT organization_id, chat_id, user_id, prompt_id, expires_at, created_at
     FROM pending_text_replies
     WHERE organization_id = $1 AND chat_id = $2 AND user_id = $3 AND expires_at > now()`,
    [organizationId, chatId, userId],
  )
  return result.rows[0] ?? null
}

export async function clearPendingTextReply(
  client: pg.PoolClient,
  organizationId: string,
  chatId: string,
  userId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM pending_text_replies
     WHERE organization_id = $1 AND chat_id = $2 AND user_id = $3`,
    [organizationId, chatId, userId],
  )
}

export async function clearPendingTextRepliesForPrompt(
  client: pg.PoolClient,
  organizationId: string,
  chatId: string,
  promptId: string,
): Promise<void> {
  await client.query(
    `DELETE FROM pending_text_replies
     WHERE organization_id = $1 AND chat_id = $2 AND prompt_id = $3`,
    [organizationId, chatId, promptId],
  )
}

export async function deleteExpiredPendingTextReplies(client: pg.PoolClient): Promise<number> {
  const result = await client.query<{ c: string }>(
    `WITH del AS (
       DELETE FROM pending_text_replies WHERE expires_at <= now() RETURNING 1
     ) SELECT count(*)::text AS c FROM del`,
  )
  return Number(result.rows[0]?.c ?? 0)
}
