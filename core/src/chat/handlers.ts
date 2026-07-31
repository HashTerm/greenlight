import type { Chat } from 'chat'
import { withClient } from '../db/client.js'
import { scheduleCallback, forwardChannelCallback } from '../core/callbacks.js'
import { loadConfig } from '../core/config.js'
import { credentialFingerprint, parseThreadChannelId, type Platform } from '../core/platform.js'
import * as promptModels from '../services/prompts/models.js'
import * as channelModels from '../services/channels/models.js'
import { recordInboundMessage } from '../services/messages/service.js'
import { recordAuditEvent } from '../extensions/audit.js'
import { getBotByKey } from './bot-registry.js'
import { instanceKey } from '../core/platform.js'

const ID_REPLY_RE = /^ID\s*[:#-]?\s*(#?\w+)\s+(.+)$/i

async function resolveChannelForMessage(
  platform: Platform,
  targetChatId: string,
  credentials: Record<string, string>,
): Promise<channelModels.ChannelRow | null> {
  const fingerprint = credentialFingerprint(platform, credentials)
  return withClient((client) =>
    channelModels.findChannelByTargetAndFingerprint(client, platform, targetChatId, fingerprint),
  )
}

async function handlePromptAnswer(
  organizationId: string,
  promptId: string,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
  thread: { post: (msg: string) => Promise<unknown> } | null,
): Promise<void> {
  const callbackInfo = await withClient((client) =>
    promptModels.markAnswered(client, organizationId, promptId, {
      type: answer.type,
      value: answer.value,
      userId: answer.userId,
      username: answer.username,
    }),
  )

  if (callbackInfo) {
    scheduleCallback(callbackInfo.callbackUrl, callbackInfo.payload)
  }

  await recordAuditEvent({
    actor_type: 'system',
    action: 'prompt.answered',
    resource_type: 'prompt',
    resource_id: promptId,
    metadata: {
      organization_id: organizationId,
      answer_type: answer.type,
      answered_by_id: answer.userId,
      answered_by_username: answer.username,
    },
  })

  if (thread) {
    await thread.post(`Recorded answer for ID:${promptId}`)
  }
}

export function wireHandlers(
  bot: Chat,
  platform: Platform,
  credentials: Record<string, string>,
): void {
  const botKey = instanceKey(platform, credentials)

  bot.onAction(async (event) => {
    const channel = await resolveChannelForMessage(
      platform,
      parseThreadChannelId(event.thread.id)?.targetChatId ?? '',
      credentials,
    )
    if (!channel) return

    const parsed = await withClient((client) =>
      promptModels.getPromptByActionKey(client, channel.organization_id, event.actionId),
    )
    if (!parsed) return

    const label = await withClient((client) =>
      promptModels.resolveOptionLabel(
        client,
        channel.organization_id,
        parsed.promptId,
        parsed.optionId,
      ),
    )
    if (!label) return

    await handlePromptAnswer(
      channel.organization_id,
      parsed.promptId,
      {
        type: 'option',
        value: label,
        userId: event.user?.userId ? Number(event.user.userId) : null,
        username: event.user?.userName ?? event.user?.fullName ?? null,
      },
      event.thread,
    )
  })

  const handleText = async (
    text: string,
    user: { userId?: string; userName?: string; fullName?: string } | undefined,
    threadId: string,
    thread: { post: (msg: string) => Promise<unknown> } | null,
  ) => {
    const parsed = parseThreadChannelId(threadId)
    if (!parsed || parsed.platform !== platform) return

    const channel = await resolveChannelForMessage(platform, parsed.targetChatId, credentials)
    if (!channel) return

    const trimmed = text.trim()
    const idMatch = ID_REPLY_RE.exec(trimmed)
    if (idMatch && channel.channel_type === 'PROMPT') {
      const promptId = idMatch[1]
      const replyText = idMatch[2]

      const prompt = await withClient((client) =>
        promptModels.getPrompt(client, channel.organization_id, promptId),
      )
      if (!promptModels.canAcceptTextReply(prompt)) return

      await handlePromptAnswer(
        channel.organization_id,
        promptId,
        {
          type: 'text',
          value: replyText,
          userId: user?.userId ? Number(user.userId) : null,
          username: user?.userName ?? user?.fullName ?? null,
        },
        thread,
      )
      return
    }

    if (channel.channel_type === 'MESSAGE') {
      const from =
        user?.userName ?? user?.fullName ?? (user?.userId ? `user_${user.userId}` : 'unknown')

      await recordInboundMessage(channel.organization_id, channel, trimmed, from).catch((err) =>
        console.error('record inbound message error:', err),
      )

      if (!channel.callback_url) return

      const ok = await forwardChannelCallback(channel.callback_url, {
        type: 'message.created',
        platform: channel.platform,
        channel_id: channel.channel_id,
        from,
        text: trimmed,
      })

      if (!ok) {
        const config = loadConfig()
        const managed = getBotByKey(botKey)
        if (managed) {
          const ch = managed.bot.channel(threadId)
          await ch.post(`\u26a0\ufe0f ${config.CHANNEL_OFFLINE_NOTIFICATION}`)
        }
      }
    }
  }

  bot.onSubscribedMessage(async (thread, message) => {
    if (!message.text) return
    await handleText(message.text, message.author, thread.id, thread)
  })

  bot.onNewMessage(/.*/s, async (thread, message) => {
    await thread.subscribe()
    if (!message.text) return
    await handleText(message.text, message.author, thread.id, thread)
  })
}
