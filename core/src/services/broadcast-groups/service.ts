import { withClient } from '../../db/client.js'
import { ValueError } from '../../core/security.js'
import * as channelModels from '../channels/models.js'
import * as broadcastGroupModels from './models.js'

const MIN_CHANNELS = 1
const MAX_CHANNELS = 50

export type BroadcastGroupKind = broadcastGroupModels.BroadcastGroupKind

export type BroadcastGroup = {
  broadcast_group_id: string
  name: string
  kind: BroadcastGroupKind
  channel_ids: string[]
  prompt_answer_mode: string
  created_at: string
  updated_at: string
}

function serializeGroup(row: broadcastGroupModels.BroadcastGroupWithChannels): BroadcastGroup {
  return {
    broadcast_group_id: row.broadcast_group_id,
    name: row.name,
    kind: row.kind,
    channel_ids: row.channel_ids,
    prompt_answer_mode: row.prompt_answer_mode,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

function validateChannelIds(channelIds: string[]): string[] {
  if (channelIds.length < MIN_CHANNELS) {
    throw new ValueError(`At least ${MIN_CHANNELS} channel is required in a broadcast group`)
  }
  if (channelIds.length > MAX_CHANNELS) {
    throw new ValueError(`At most ${MAX_CHANNELS} channels are allowed per broadcast group`)
  }
  const unique = new Set(channelIds)
  if (unique.size !== channelIds.length) {
    throw new ValueError('channel_ids must be unique')
  }
  return channelIds
}

async function validateChannelsForKind(
  organizationId: string,
  channelIds: string[],
  kind: BroadcastGroupKind,
): Promise<void> {
  const expectedType = kind === 'prompt' ? 'PROMPT' : 'MESSAGE'

  await withClient(async (client) => {
    for (const channelId of channelIds) {
      const channel = await channelModels.getChannel(client, organizationId, channelId)
      if (!channel || !channel.is_active) {
        throw new ValueError(`Channel ${channelId} not found`)
      }
      if (channel.channel_type !== expectedType) {
        throw new ValueError(
          `Channel ${channelId} is not a ${expectedType} channel; group kind is ${kind}`,
        )
      }
    }
  })
}

export async function listBroadcastGroups(
  organizationId: string,
  limit: number,
  kind?: BroadcastGroupKind | null,
): Promise<BroadcastGroup[]> {
  const capped = Math.min(Math.max(limit, 1), 200)
  const rows = await withClient((client) =>
    broadcastGroupModels.listBroadcastGroups(client, organizationId, capped, kind),
  )
  return rows.map(serializeGroup)
}

export async function getBroadcastGroup(
  organizationId: string,
  broadcastGroupId: string,
): Promise<BroadcastGroup | null> {
  const row = await withClient((client) =>
    broadcastGroupModels.getBroadcastGroup(client, organizationId, broadcastGroupId),
  )
  return row ? serializeGroup(row) : null
}

export async function createBroadcastGroup(input: {
  organizationId: string
  name: string
  kind: BroadcastGroupKind
  channelIds: string[]
  promptAnswerMode?: string | null
}): Promise<BroadcastGroup> {
  const name = input.name.trim()
  if (!name) {
    throw new ValueError('name is required')
  }

  if (input.kind === 'prompt' && !input.promptAnswerMode?.trim()) {
    throw new ValueError('prompt_answer_mode is required for prompt broadcast groups')
  }

  const channelIds = validateChannelIds(input.channelIds)
  await validateChannelsForKind(input.organizationId, channelIds, input.kind)

  const broadcastGroupId = broadcastGroupModels.newBroadcastGroupId()
  const row = await withClient((client) =>
    broadcastGroupModels.createBroadcastGroup(client, {
      organizationId: input.organizationId,
      broadcastGroupId,
      name,
      kind: input.kind,
      channelIds,
      promptAnswerMode: input.promptAnswerMode,
    }),
  )
  return serializeGroup(row)
}

export async function updateBroadcastGroup(input: {
  organizationId: string
  broadcastGroupId: string
  name: string
  channelIds: string[]
  promptAnswerMode?: string | null
}): Promise<BroadcastGroup | null> {
  const name = input.name.trim()
  if (!name) {
    throw new ValueError('name is required')
  }

  const channelIds = validateChannelIds(input.channelIds)

  const existing = await getBroadcastGroup(input.organizationId, input.broadcastGroupId)
  if (!existing) return null

  await validateChannelsForKind(input.organizationId, channelIds, existing.kind)

  const row = await withClient((client) =>
    broadcastGroupModels.updateBroadcastGroup(client, {
      organizationId: input.organizationId,
      broadcastGroupId: input.broadcastGroupId,
      name,
      channelIds,
      promptAnswerMode:
        existing.kind === 'prompt'
          ? (input.promptAnswerMode ?? existing.prompt_answer_mode)
          : undefined,
    }),
  )
  return row ? serializeGroup(row) : null
}

export async function deleteBroadcastGroup(
  organizationId: string,
  broadcastGroupId: string,
): Promise<boolean> {
  return withClient((client) =>
    broadcastGroupModels.deleteBroadcastGroup(client, organizationId, broadcastGroupId),
  )
}
