import { withClient } from '../../db/client.js'
import type { ChannelRow } from '../channels/models.js'
import { getRetentionSettings } from '../settings/service.js'
import * as messageModels from './models.js'
import type { MessageDirection, MessageListDirection } from './models.js'

export type MessageRecord = {
  id: string
  channel_id: string
  direction: messageModels.MessageDirection
  text: string
  platform: string
  from_user: string | null
  api_key_id: string | null
  platform_message_id: string | null
  created_at: string
}

function toRecord(row: messageModels.MessageRow): MessageRecord {
  return {
    id: row.id,
    channel_id: row.channel_id,
    direction: row.direction,
    text: row.text,
    platform: row.platform,
    from_user: row.from_user,
    api_key_id: row.api_key_id,
    platform_message_id: row.platform_message_id,
    created_at: row.created_at.toISOString(),
  }
}

export async function recordOutboundMessage(
  channel: ChannelRow,
  text: string,
  apiKeyId: string | null,
  platformMessageId?: string | null,
): Promise<MessageRecord> {
  const row = await withClient((client) =>
    messageModels.createMessage(client, {
      channelId: channel.channel_id,
      direction: 'outbound',
      text,
      platform: channel.platform,
      apiKeyId,
      platformMessageId,
    }),
  )
  return toRecord(row)
}

export async function recordInboundMessage(
  channel: ChannelRow,
  text: string,
  fromUser: string,
): Promise<MessageRecord | null> {
  const settings = await getRetentionSettings()
  if (settings.messages_inbound_zero_retention) {
    return null
  }

  const row = await withClient((client) =>
    messageModels.createMessage(client, {
      channelId: channel.channel_id,
      direction: 'inbound',
      text,
      platform: channel.platform,
      fromUser,
    }),
  )
  return toRecord(row)
}

export async function listMessages(options: {
  limit: number
  channelId?: string
  direction?: MessageListDirection
}): Promise<MessageRecord[]> {
  const rows = await withClient((client) => messageModels.listMessages(client, options))
  return rows.map(toRecord)
}

export async function getMessage(id: string): Promise<MessageRecord | null> {
  const row = await withClient((client) => messageModels.getMessage(client, id))
  return row ? toRecord(row) : null
}

export async function purgeOldMessagesByDirection(
  direction: MessageDirection,
  days: number,
): Promise<number> {
  return withClient((client) => messageModels.deleteOlderThanByDirection(client, days, direction))
}

export async function purgeOldMessages(days: number): Promise<number> {
  return withClient((client) => messageModels.deleteOlderThan(client, days))
}
