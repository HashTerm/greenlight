import { withClient } from '../../db/client.js'
import { getRetentionSettings } from '../settings/service.js'
import * as messageModels from './models.js'

export async function recordInboundMessage(
  organizationId: string,
  channel: { channel_id: string; platform: string },
  text: string,
  fromUser: string,
): Promise<MessageRow | null> {
  const settings = await getRetentionSettings(organizationId)
  if (settings.messages_inbound_zero_retention) {
    return null
  }

  return withClient((client) =>
    messageModels.createMessage(client, {
      organizationId,
      channelId: channel.channel_id,
      direction: 'inbound',
      text,
      platform: channel.platform,
      fromUser,
    }),
  )
}

type MessageRow = messageModels.MessageRow

export async function listMessages(options: {
  organizationId: string
  limit: number
  channelId?: string
  direction?: messageModels.MessageListDirection
}) {
  const rows = await withClient((client) =>
    messageModels.listMessages(client, options.organizationId, {
      limit: options.limit,
      channelId: options.channelId,
      direction: options.direction,
    }),
  )
  return rows
}

export async function getMessage(organizationId: string, id: string) {
  const row = await withClient((client) => messageModels.getMessage(client, organizationId, id))
  return row
}

export async function purgeOldMessagesByDirection(
  organizationId: string,
  direction: messageModels.MessageDirection,
  days: number,
): Promise<number> {
  return withClient((client) =>
    messageModels.deleteOlderThanByDirection(client, organizationId, days, direction),
  )
}
