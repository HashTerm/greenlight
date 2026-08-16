import { withClient } from '../../db/client.js'
import { ValueError } from '../../core/security.js'
import { licenseGate } from '../../extensions/license-gate.js'
import * as channelModels from '../channels/models.js'
import * as broadcastGroupModels from '../broadcast-groups/models.js'
import { PROMPT_ANSWER_MODES, type PromptAnswerMode } from '../prompts/models.js'

const MIN_CHANNELS = 1
const MAX_CHANNELS = 50

export type InlineBroadcastGroup = {
  channel_ids: string[]
  prompt_answer_mode?: string | null
}

export type SendTargetBody = {
  channel_id?: string | null
  broadcast_group_id?: string | null
  broadcast_group?: InlineBroadcastGroup | null
}

export type ResolvedSendTargets = {
  channelIds: string[]
  broadcastGroupId: string | null
  isFanOut: boolean
  promptAnswerMode: PromptAnswerMode | null
}

function validateChannelIdList(channelIds: string[]): string[] {
  if (channelIds.length < MIN_CHANNELS) {
    throw new ValueError(`At least ${MIN_CHANNELS} channel_id is required in channel_ids`)
  }
  if (channelIds.length > MAX_CHANNELS) {
    throw new ValueError(`At most ${MAX_CHANNELS} channel_ids are allowed`)
  }
  const unique = new Set(channelIds)
  if (unique.size !== channelIds.length) {
    throw new ValueError('channel_ids must be unique')
  }
  return channelIds
}

function parsePromptAnswerMode(
  value: string | null | undefined,
  required: boolean,
): PromptAnswerMode | null {
  if (!value?.trim()) {
    if (required) {
      throw new ValueError('prompt_answer_mode is required in broadcast_group for prompt sends')
    }
    return null
  }
  const mode = value.trim()
  if (!PROMPT_ANSWER_MODES.includes(mode as PromptAnswerMode)) {
    throw new ValueError(`prompt_answer_mode must be one of: ${PROMPT_ANSWER_MODES.join(', ')}`)
  }
  return mode as PromptAnswerMode
}

async function validateChannelsExist(
  organizationId: string,
  channelIds: string[],
  expectedChannelType?: 'MESSAGE' | 'PROMPT',
): Promise<void> {
  await withClient(async (client) => {
    for (const channelId of channelIds) {
      const channel = await channelModels.getChannel(client, organizationId, channelId)
      if (!channel || !channel.is_active) {
        throw new ValueError(`Channel ${channelId} not found`)
      }
      if (expectedChannelType && channel.channel_type !== expectedChannelType) {
        throw new ValueError(`Channel ${channelId} is not a ${expectedChannelType} channel`)
      }
    }
  })
}

export async function resolveSendTargets(
  organizationId: string,
  body: SendTargetBody,
  expectedChannelType?: 'MESSAGE' | 'PROMPT',
): Promise<ResolvedSendTargets> {
  const channelId = body.channel_id?.trim() ?? ''
  const inlineGroup = body.broadcast_group
  const inlineChannelIds = inlineGroup?.channel_ids ?? []
  const groupId = body.broadcast_group_id?.trim() ?? ''

  const modes = [Boolean(channelId), inlineChannelIds.length > 0, Boolean(groupId)].filter(
    Boolean,
  ).length

  if (modes !== 1) {
    throw new ValueError(
      'Provide exactly one of channel_id, broadcast_group, or broadcast_group_id',
    )
  }

  if (channelId) {
    await validateChannelsExist(organizationId, [channelId], expectedChannelType)
    return {
      channelIds: [channelId],
      broadcastGroupId: null,
      isFanOut: false,
      promptAnswerMode: null,
    }
  }

  if (inlineChannelIds.length > 0) {
    const validated = validateChannelIdList(inlineChannelIds)
    const promptAnswerMode =
      expectedChannelType === 'PROMPT'
        ? parsePromptAnswerMode(inlineGroup?.prompt_answer_mode, true)
        : null
    await validateChannelsExist(organizationId, validated, expectedChannelType)
    return {
      channelIds: validated,
      broadcastGroupId: null,
      isFanOut: true,
      promptAnswerMode,
    }
  }

  if (!licenseGate.isEnabled('broadcast_groups')) {
    throw new ValueError(
      'broadcast_group_id requires an enterprise license with the broadcast_groups feature',
    )
  }

  const group = await withClient((client) =>
    broadcastGroupModels.getBroadcastGroup(client, organizationId, groupId),
  )
  if (!group) {
    throw new ValueError(`Broadcast group ${groupId} not found`)
  }

  if (expectedChannelType) {
    const expectedKind = expectedChannelType === 'PROMPT' ? 'prompt' : 'message'
    if (group.kind !== expectedKind) {
      throw new ValueError(`Broadcast group kind is ${group.kind}; expected ${expectedKind} send`)
    }
  }

  if (group.channel_ids.length < MIN_CHANNELS) {
    throw new ValueError('Broadcast group has no channels')
  }

  await validateChannelsExist(organizationId, group.channel_ids, expectedChannelType)

  const promptAnswerMode =
    group.kind === 'prompt' ? parsePromptAnswerMode(group.prompt_answer_mode, true) : null

  return {
    channelIds: group.channel_ids,
    broadcastGroupId: groupId,
    isFanOut: true,
    promptAnswerMode,
  }
}
