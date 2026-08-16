import { randomUUID } from 'node:crypto'
import { withClient } from '../../db/client.js'
import { ValueError } from '../../core/security.js'
import { sendToChannel } from '../channels/service.js'
import * as channelModels from '../channels/models.js'
import { createAndPostPrompt, type CreatePromptInput } from '../prompts/service.js'
import * as promptModels from '../prompts/models.js'
import * as messageModels from '../messages/models.js'
import * as broadcastModels from './models.js'

const MIN_CHANNELS = 2
const MAX_CHANNELS = 50

export type BroadcastKind = broadcastModels.BroadcastKind

export interface CreateBroadcastInput {
  organizationId: string
  kind: BroadcastKind
  channelIds: string[]
  text: string
  apiKeyId?: string | null
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
}

export interface BroadcastChannelResult {
  channel_id: string
  prompt_id?: string
  message_id?: string
}

export interface CreateBroadcastResult {
  broadcast_id: string
  kind: BroadcastKind
  channels: BroadcastChannelResult[]
}

export interface BroadcastSummary {
  broadcast_id: string
  kind: BroadcastKind
  text: string
  correlation_id: string | null
  created_at: string
  channel_count: number
  pending_count: number | null
  answered_count: number | null
  expired_count: number | null
}

function serializeSummary(row: broadcastModels.BroadcastSummaryRow): BroadcastSummary {
  return {
    broadcast_id: row.broadcast_id,
    kind: row.kind,
    text: row.text,
    correlation_id: row.correlation_id,
    created_at: row.created_at.toISOString(),
    channel_count: row.channel_count,
    pending_count: row.pending_count,
    answered_count: row.answered_count,
    expired_count: row.expired_count,
  }
}

function newBroadcastId(): string {
  return `brd_${randomUUID()}`
}

function validateChannelIds(channelIds: string[]): void {
  if (channelIds.length < MIN_CHANNELS) {
    throw new ValueError(`At least ${MIN_CHANNELS} channel_ids are required for a broadcast`)
  }
  if (channelIds.length > MAX_CHANNELS) {
    throw new ValueError(`At most ${MAX_CHANNELS} channel_ids are allowed per broadcast`)
  }
  const unique = new Set(channelIds)
  if (unique.size !== channelIds.length) {
    throw new ValueError('channel_ids must be unique')
  }
}

export async function createBroadcast(input: CreateBroadcastInput): Promise<CreateBroadcastResult> {
  validateChannelIds(input.channelIds)

  const expectedType = input.kind === 'prompt' ? 'PROMPT' : 'MESSAGE'
  const broadcastId = newBroadcastId()

  await withClient(async (client) => {
    for (const channelId of input.channelIds) {
      const channel = await channelModels.getChannel(client, input.organizationId, channelId)
      if (!channel || !channel.is_active) {
        throw new ValueError(`Channel ${channelId} not found`)
      }
      if (channel.channel_type !== expectedType) {
        throw new ValueError(
          `Channel ${channelId} is not a ${expectedType} channel; broadcast kind is ${input.kind}`,
        )
      }
    }
  })

  const channels: BroadcastChannelResult[] = []

  if (input.kind === 'prompt') {
    const promptInput: Omit<CreatePromptInput, 'organizationId' | 'channelId' | 'broadcastId'> = {
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
    }

    for (const channelId of input.channelIds) {
      const result = await createAndPostPrompt({
        organizationId: input.organizationId,
        channelId,
        broadcastId,
        ...promptInput,
      })
      channels.push({
        channel_id: result.channelId,
        prompt_id: result.promptId,
      })
    }
  } else {
    for (const channelId of input.channelIds) {
      const result = await sendToChannel(
        input.organizationId,
        channelId,
        input.text,
        input.apiKeyId ?? null,
        { broadcastId },
      )
      channels.push({
        channel_id: channelId,
        message_id: result.messageId,
      })
    }
  }

  return {
    broadcast_id: broadcastId,
    kind: input.kind,
    channels,
  }
}

export async function listBroadcasts(
  organizationId: string,
  limit: number,
): Promise<BroadcastSummary[]> {
  const capped = Math.min(Math.max(limit, 1), 200)
  const rows = await withClient(async (client) => {
    const promptRows = await broadcastModels.listPromptBroadcastSummaries(
      client,
      organizationId,
      capped,
    )
    const messageRows = await broadcastModels.listMessageBroadcastSummaries(
      client,
      organizationId,
      capped,
    )
    return [...promptRows, ...messageRows]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, capped)
  })
  return rows.map(serializeSummary)
}

export async function getBroadcast(
  organizationId: string,
  broadcastId: string,
): Promise<{
  summary: BroadcastSummary
  prompts: promptModels.PromptRow[]
  messages: messageModels.MessageRow[]
} | null> {
  return withClient(async (client) => {
    const promptCount = await broadcastModels.countPromptBroadcast(
      client,
      organizationId,
      broadcastId,
    )
    const messageCount = await broadcastModels.countMessageBroadcast(
      client,
      organizationId,
      broadcastId,
    )

    if (promptCount === 0 && messageCount === 0) {
      return null
    }

    if (promptCount > 0 && messageCount > 0) {
      return null
    }

    if (promptCount > 0) {
      const summary = await broadcastModels.getPromptBroadcastSummary(
        client,
        organizationId,
        broadcastId,
      )
      if (!summary) return null
      const prompts = await promptModels.listPrompts(
        client,
        organizationId,
        'all',
        200,
        null,
        broadcastId,
      )
      return { summary: serializeSummary(summary), prompts, messages: [] }
    }

    const summary = await broadcastModels.getMessageBroadcastSummary(
      client,
      organizationId,
      broadcastId,
    )
    if (!summary) return null
    const messages = await messageModels.listMessages(client, organizationId, {
      limit: 200,
      broadcastId,
      direction: 'outbound',
    })
    return { summary: serializeSummary(summary), prompts: [], messages }
  })
}
