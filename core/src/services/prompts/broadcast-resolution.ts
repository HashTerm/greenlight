import type pg from 'pg'
import * as promptModels from './models.js'

export type PromptAnswerMode = 'first_answer' | 'all_answer_same' | 'all_answer_majority'

export type BatchNotification = {
  channelId: string
  message: string
  skipPost?: boolean
}

export type BatchResolutionResult = {
  batchStatus: string | null
  callbackInfo: promptModels.CallbackInfo | null
  notifications: BatchNotification[]
  answeringChannelId: string
  winningValue: string
}

function strictMajority(count: number, total: number): boolean {
  return count > total / 2
}

export function formatBroadcastDecidedReply(value: string, sourceChannelId: string): string {
  return `Broadcast decided: ${value} (answered on ${sourceChannelId})`
}

export function formatBroadcastMajorityReply(value: string): string {
  return `Majority decided: ${value}`
}

export function formatBroadcastConflictReply(): string {
  return 'Prompt was not processed — channel answers did not agree.'
}

export async function listBatchSiblings(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
): Promise<promptModels.PromptRow[]> {
  const result = await client.query<promptModels.PromptRow>(
    `SELECT * FROM prompts
     WHERE organization_id = $1 AND broadcast_batch_id = $2
     ORDER BY channel_id`,
    [organizationId, broadcastBatchId],
  )
  return result.rows
}

async function syncClosePendingSiblings(
  client: pg.PoolClient,
  organizationId: string,
  broadcastBatchId: string,
  sourceChannelId: string,
  answer: { type: string; value: string },
  batchStatus: string,
): Promise<void> {
  await client.query(
    `UPDATE prompts
     SET state = $1,
         answer = jsonb_build_object(
           'type', $2::text,
           'value', $3::text,
           'origin', 'broadcast_sync',
           'source_channel_id', $4::text
         ),
         answered_at = now(),
         answered_by_id = NULL,
         answered_by_username = NULL,
         broadcast_batch_status = $5
     WHERE organization_id = $6
       AND broadcast_batch_id = $7
       AND state = $8
       AND channel_id <> $4`,
    [
      promptModels.ANSWERED,
      answer.type,
      answer.value,
      sourceChannelId,
      batchStatus,
      organizationId,
      broadcastBatchId,
      promptModels.PENDING,
    ],
  )

  await client.query(
    `UPDATE prompts
     SET broadcast_batch_status = $1
     WHERE organization_id = $2 AND broadcast_batch_id = $3`,
    [batchStatus, organizationId, broadcastBatchId],
  )
}

function buildBatchCallback(
  promptId: string,
  prompt: promptModels.PromptRow,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
): promptModels.CallbackInfo | null {
  if (!prompt.callback_url) return null

  const payload: Record<string, unknown> = {
    prompt_id: promptId,
    channel_id: prompt.channel_id,
    correlation_id: prompt.correlation_id,
    text: prompt.text,
    broadcast_batch_id: prompt.broadcast_batch_id,
    broadcast_answer_mode: prompt.broadcast_answer_mode,
    broadcast_batch_status: prompt.broadcast_batch_status,
    answering_channel_id: prompt.channel_id,
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

  return {
    callbackUrl: prompt.callback_url,
    callbackHeaders: prompt.callback_headers,
    payload,
  }
}

function buildBatchNotifications(
  siblings: promptModels.PromptRow[],
  answeringChannelId: string,
  message: string,
): BatchNotification[] {
  return siblings.map((row) => ({
    channelId: row.channel_id,
    message,
    skipPost: row.channel_id === answeringChannelId,
  }))
}

export async function evaluateBroadcastBatch(
  client: pg.PoolClient,
  organizationId: string,
  channelId: string,
  promptId: string,
  directAnswer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
): Promise<BatchResolutionResult | null> {
  const prompt = await promptModels.getPrompt(client, organizationId, channelId, promptId)
  if (!prompt?.broadcast_batch_id || !prompt.broadcast_answer_mode) {
    return null
  }

  const siblings = await listBatchSiblings(client, organizationId, prompt.broadcast_batch_id)
  const mode = prompt.broadcast_answer_mode as PromptAnswerMode
  const answeringChannelId = channelId
  const winningValue = directAnswer.value

  if (mode === 'first_answer') {
    await syncClosePendingSiblings(
      client,
      organizationId,
      prompt.broadcast_batch_id,
      answeringChannelId,
      directAnswer,
      promptModels.BATCH_RESOLVED,
    )

    const updated = await promptModels.getPrompt(client, organizationId, channelId, promptId)
    const callbackInfo = updated
      ? buildBatchCallback(
          promptId,
          { ...updated, broadcast_batch_status: promptModels.BATCH_RESOLVED },
          directAnswer,
        )
      : null

    const message = formatBroadcastDecidedReply(winningValue, answeringChannelId)
    return {
      batchStatus: promptModels.BATCH_RESOLVED,
      callbackInfo,
      notifications: buildBatchNotifications(siblings, answeringChannelId, message),
      answeringChannelId,
      winningValue,
    }
  }

  if (mode === 'all_answer_majority') {
    const answeredRows = siblings.filter((row) => row.state === promptModels.ANSWERED)
    const counts = new Map<string, number>()
    for (const row of answeredRows) {
      const value = row.answer?.value
      if (!value) continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    const totalChannels = siblings.length
    let majorityValue: string | null = null
    for (const [value, count] of counts) {
      if (strictMajority(count, totalChannels)) {
        majorityValue = value
        break
      }
    }

    if (majorityValue) {
      await syncClosePendingSiblings(
        client,
        organizationId,
        prompt.broadcast_batch_id,
        answeringChannelId,
        { type: directAnswer.type, value: majorityValue },
        promptModels.BATCH_RESOLVED,
      )

      const updated = await promptModels.getPrompt(client, organizationId, channelId, promptId)
      const callbackInfo = updated
        ? buildBatchCallback(
            promptId,
            { ...updated, broadcast_batch_status: promptModels.BATCH_RESOLVED },
            { ...directAnswer, value: majorityValue },
          )
        : null

      const message = formatBroadcastMajorityReply(majorityValue)
      return {
        batchStatus: promptModels.BATCH_RESOLVED,
        callbackInfo,
        notifications: buildBatchNotifications(siblings, answeringChannelId, message),
        answeringChannelId,
        winningValue: majorityValue,
      }
    }

    await client.query(
      `UPDATE prompts
       SET broadcast_batch_status = $1
       WHERE organization_id = $2 AND broadcast_batch_id = $3`,
      [promptModels.BATCH_COLLECTING, organizationId, prompt.broadcast_batch_id],
    )

    return {
      batchStatus: promptModels.BATCH_COLLECTING,
      callbackInfo: null,
      notifications: [],
      answeringChannelId,
      winningValue,
    }
  }

  if (mode === 'all_answer_same') {
    const answeredRows = siblings.filter((row) => row.state === promptModels.ANSWERED)
    const allAnswered = answeredRows.length === siblings.length

    if (!allAnswered) {
      await client.query(
        `UPDATE prompts
         SET broadcast_batch_status = $1
         WHERE organization_id = $2 AND broadcast_batch_id = $3`,
        [promptModels.BATCH_COLLECTING, organizationId, prompt.broadcast_batch_id],
      )
      return {
        batchStatus: promptModels.BATCH_COLLECTING,
        callbackInfo: null,
        notifications: [],
        answeringChannelId,
        winningValue,
      }
    }

    const values = answeredRows.map((row) => row.answer?.value).filter(Boolean) as string[]
    const unanimous = values.length > 0 && values.every((value) => value === values[0])

    if (unanimous) {
      const unanimousValue = values[0]!
      await client.query(
        `UPDATE prompts
         SET broadcast_batch_status = $1
         WHERE organization_id = $2 AND broadcast_batch_id = $3`,
        [promptModels.BATCH_RESOLVED, organizationId, prompt.broadcast_batch_id],
      )

      const updated = await promptModels.getPrompt(client, organizationId, channelId, promptId)
      const callbackInfo = updated
        ? buildBatchCallback(
            promptId,
            { ...updated, broadcast_batch_status: promptModels.BATCH_RESOLVED },
            { ...directAnswer, value: unanimousValue },
          )
        : null

      const message = formatBroadcastDecidedReply(unanimousValue, answeringChannelId)
      return {
        batchStatus: promptModels.BATCH_RESOLVED,
        callbackInfo,
        notifications: buildBatchNotifications(siblings, answeringChannelId, message),
        answeringChannelId,
        winningValue: unanimousValue,
      }
    }

    await client.query(
      `UPDATE prompts
       SET broadcast_batch_status = $1
       WHERE organization_id = $2 AND broadcast_batch_id = $3`,
      [promptModels.BATCH_CONFLICT, organizationId, prompt.broadcast_batch_id],
    )

    const message = formatBroadcastConflictReply()
    return {
      batchStatus: promptModels.BATCH_CONFLICT,
      callbackInfo: null,
      notifications: buildBatchNotifications(siblings, answeringChannelId, message),
      answeringChannelId,
      winningValue,
    }
  }

  return null
}
