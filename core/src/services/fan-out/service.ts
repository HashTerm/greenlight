import { randomUUID } from 'node:crypto'
import { withClient } from '../../db/client.js'
import { sendToChannel } from '../channels/service.js'
import { createAndPostPrompt, type CreatePromptInput } from '../prompts/service.js'
import * as promptModels from '../prompts/models.js'
import * as messageModels from '../messages/models.js'
import * as fanOutModels from './models.js'

export type FanOutKind = fanOutModels.FanOutKind

export interface FanOutChannelResult {
  channel_id: string
  prompt_id?: string
  message_id?: string
}

export interface FanOutResult {
  broadcast_batch_id: string
  channels: FanOutChannelResult[]
}

export interface FanOutSummary {
  broadcast_batch_id: string
  kind: FanOutKind
  text: string
  correlation_id: string | null
  broadcast_group_id: string | null
  broadcast_batch_status: string | null
  created_at: string
  channel_count: number
  pending_count: number | null
  answered_count: number | null
  expired_count: number | null
}

function serializeSummary(row: fanOutModels.FanOutSummaryRow): FanOutSummary {
  return {
    broadcast_batch_id: row.broadcast_batch_id,
    kind: row.kind,
    text: row.text,
    correlation_id: row.correlation_id,
    broadcast_group_id: row.broadcast_group_id,
    broadcast_batch_status: row.broadcast_batch_status,
    created_at: row.created_at.toISOString(),
    channel_count: row.channel_count,
    pending_count: row.pending_count,
    answered_count: row.answered_count,
    expired_count: row.expired_count,
  }
}

export function newBroadcastBatchId(): string {
  return `brd_${randomUUID()}`
}

export async function fanOutPrompts(input: {
  organizationId: string
  channelIds: string[]
  broadcastGroupId?: string | null
  broadcastBatchId?: string | null
  promptAnswerMode?: string | null
  text: string
  options?: string[] | null
  allowText?: boolean
  callbackUrl?: string | null
  callbackHeaders?: Record<string, string> | null
  correlationId?: string | null
  callbackData?: unknown | null
  ttlSec?: number | null
  mediaUrl?: string | null
  mediaPath?: string | null
  mediaFile?: Buffer | null
  mediaFileName?: string | null
}): Promise<FanOutResult> {
  const broadcastBatchId = input.broadcastBatchId ?? newBroadcastBatchId()
  const broadcastGroupId = input.broadcastGroupId ?? null
  const broadcastAnswerMode = input.promptAnswerMode ?? null
  const broadcastBatchStatus = broadcastAnswerMode ? promptModels.BATCH_COLLECTING : null

  const promptFields: Omit<
    CreatePromptInput,
    'organizationId' | 'channelId' | 'broadcastBatchId' | 'broadcastGroupId'
  > = {
    text: input.text,
    options: input.options ?? [],
    allowText: input.allowText ?? false,
    callbackUrl: input.callbackUrl ?? null,
    callbackHeaders: input.callbackHeaders ?? null,
    correlationId: input.correlationId ?? null,
    callbackData: input.callbackData ?? null,
    ttlSec: input.ttlSec ?? 3600,
    mediaUrl: input.mediaUrl ?? null,
    mediaPath: input.mediaPath ?? null,
    mediaFile: input.mediaFile ?? null,
    mediaFileName: input.mediaFileName ?? null,
    broadcastAnswerMode,
    broadcastBatchStatus,
  }

  const channels: FanOutChannelResult[] = []

  for (const channelId of input.channelIds) {
    const result = await createAndPostPrompt({
      organizationId: input.organizationId,
      channelId,
      broadcastBatchId,
      broadcastGroupId,
      ...promptFields,
    })
    channels.push({
      channel_id: result.channelId,
      prompt_id: result.promptId,
    })
  }

  return { broadcast_batch_id: broadcastBatchId, channels }
}

export async function fanOutMessages(input: {
  organizationId: string
  channelIds: string[]
  broadcastGroupId?: string | null
  broadcastBatchId?: string | null
  text: string
  apiKeyId?: string | null
}): Promise<FanOutResult> {
  const broadcastBatchId = input.broadcastBatchId ?? newBroadcastBatchId()
  const broadcastGroupId = input.broadcastGroupId ?? null
  const channels: FanOutChannelResult[] = []

  for (const channelId of input.channelIds) {
    const result = await sendToChannel(
      input.organizationId,
      channelId,
      input.text,
      input.apiKeyId ?? null,
      { broadcastBatchId, broadcastGroupId },
    )
    channels.push({
      channel_id: channelId,
      message_id: result.messageId,
    })
  }

  return { broadcast_batch_id: broadcastBatchId, channels }
}

export async function listFanOutSends(
  organizationId: string,
  limit: number,
  broadcastGroupId?: string | null,
): Promise<FanOutSummary[]> {
  const capped = Math.min(Math.max(limit, 1), 200)
  const rows = await withClient(async (client) => {
    const promptRows = await fanOutModels.listPromptFanOutSummaries(
      client,
      organizationId,
      capped,
      broadcastGroupId,
    )
    const messageRows = await fanOutModels.listMessageFanOutSummaries(
      client,
      organizationId,
      capped,
      broadcastGroupId,
    )
    return [...promptRows, ...messageRows]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, capped)
  })
  return rows.map(serializeSummary)
}

export async function getFanOutSend(
  organizationId: string,
  broadcastBatchId: string,
): Promise<{
  summary: FanOutSummary
  prompts: promptModels.PromptRow[]
  messages: messageModels.MessageRow[]
} | null> {
  return withClient(async (client) => {
    const promptCount = await fanOutModels.countPromptFanOut(
      client,
      organizationId,
      broadcastBatchId,
    )
    const messageCount = await fanOutModels.countMessageFanOut(
      client,
      organizationId,
      broadcastBatchId,
    )

    if (promptCount === 0 && messageCount === 0) {
      return null
    }

    if (promptCount > 0 && messageCount > 0) {
      return null
    }

    if (promptCount > 0) {
      const summary = await fanOutModels.getPromptFanOutSummary(
        client,
        organizationId,
        broadcastBatchId,
      )
      if (!summary) return null
      const prompts = await promptModels.listPrompts(
        client,
        organizationId,
        'all',
        200,
        null,
        broadcastBatchId,
        null,
      )
      return { summary: serializeSummary(summary), prompts, messages: [] }
    }

    const summary = await fanOutModels.getMessageFanOutSummary(
      client,
      organizationId,
      broadcastBatchId,
    )
    if (!summary) return null
    const messages = await messageModels.listMessages(client, organizationId, {
      limit: 200,
      broadcastBatchId,
      direction: 'outbound',
    })
    return { summary: serializeSummary(summary), prompts: [], messages }
  })
}
