import type { Chat } from 'chat'
import { withClient } from '../db/client.js'
import { scheduleCallback, forwardChannelCallback } from '../core/callbacks.js'
import { loadConfig } from '../core/config.js'
import { credentialFingerprint, parseThreadChannelId, type Platform } from '../core/platform.js'
import * as promptModels from '../services/prompts/models.js'
import * as pendingText from '../services/prompts/pending-text.js'
import * as channelModels from '../services/channels/models.js'
import { recordInboundMessage } from '../services/messages/service.js'
import { recordAuditEvent } from '../extensions/audit-log.js'
import { ensureBotForChannel, postToChat } from '../chat/bot-manager.js'
import { getBotByKey } from './bot-registry.js'
import { instanceKey } from '../core/platform.js'
import { isTelegramPrivateChat, isTelegramStartCommand } from './telegram-start.js'

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

async function postBatchNotifications(
  organizationId: string,
  notifications: import('../services/prompts/broadcast-resolution.js').BatchNotification[],
): Promise<void> {
  for (const notification of notifications) {
    if (notification.skipPost) continue
    const channel = await withClient((client) =>
      channelModels.getChannel(client, organizationId, notification.channelId),
    )
    if (!channel) continue
    await ensureBotForChannel(channel)
    await postToChat(channel, notification.message)
  }
}

async function handlePromptAnswer(
  organizationId: string,
  channelId: string,
  promptId: string,
  answer: {
    type: string
    value: string
    userId: number | null
    username: string | null
  },
  thread: { post: (msg: string) => Promise<unknown> } | null,
  chatId?: string,
): Promise<void> {
  const result = await withClient((client) =>
    promptModels.markAnswered(client, organizationId, channelId, promptId, {
      type: answer.type,
      value: answer.value,
      userId: answer.userId,
      username: answer.username,
    }),
  )

  switch (result.status) {
    case 'recorded': {
      if (result.callbackInfo) {
        scheduleCallback(
          result.callbackInfo.callbackUrl,
          result.callbackInfo.payload,
          result.callbackInfo.callbackHeaders,
        )
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

      if (chatId) {
        await withClient((client) =>
          pendingText.clearPendingTextRepliesForPrompt(client, organizationId, chatId, promptId),
        )
      }

      if (thread) {
        const skipRecordedOnAnswering =
          result.batchResolution?.notifications.some(
            (n) => n.channelId === channelId && n.skipPost,
          ) ?? false
        if (!skipRecordedOnAnswering) {
          await thread.post(promptModels.formatRecordedReply(promptId, answer.value))
        }
      }

      if (result.batchResolution?.notifications.length) {
        await postBatchNotifications(organizationId, result.batchResolution.notifications)
      }
      break
    }
    case 'already_answered': {
      if (thread) {
        const reply =
          result.prompt.answer?.origin === 'broadcast_sync'
            ? promptModels.formatBroadcastAlreadyAnsweredReply(result.prompt)
            : promptModels.formatAlreadyAnsweredReply(promptId, result.prompt)
        await thread.post(reply)
      }
      break
    }
    case 'expired': {
      if (thread) {
        await thread.post(promptModels.formatExpiredPromptReply(promptId))
      }
      break
    }
    case 'not_found':
      break
  }
}

async function handleTypeAnswerArm(
  channel: channelModels.ChannelRow,
  promptId: string,
  user: { userId?: string; userName?: string; fullName?: string } | undefined,
  thread: { post: (msg: string) => Promise<unknown> },
): Promise<void> {
  const userId = user?.userId ? Number(user.userId) : null
  if (userId === null || !Number.isFinite(userId)) return

  const prompt = await withClient((client) =>
    promptModels.getPrompt(client, channel.organization_id, channel.channel_id, promptId),
  )
  if (!prompt?.allow_text) return

  if (prompt.state === promptModels.ANSWERED) {
    await thread.post(promptModels.formatAlreadyAnsweredReply(promptId, prompt))
    return
  }
  if (prompt.state === 'EXPIRED') {
    await thread.post(promptModels.formatExpiredPromptReply(promptId))
    return
  }
  if (prompt.state !== promptModels.PENDING) return

  const config = loadConfig()
  const expiresAt = pendingText.computeTextArmExpiresAt(prompt, config.TEXT_REPLY_ARM_TTL_SEC)

  const previousPromptId = await withClient((client) =>
    pendingText.armPendingTextReply(client, {
      organizationId: channel.organization_id,
      chatId: channel.target_chat_id,
      userId,
      promptId,
      expiresAt,
    }),
  )

  if (previousPromptId && previousPromptId !== promptId) {
    await thread.post(pendingText.formatTypeAnswerSwitched(previousPromptId, promptId))
  }
  await thread.post(pendingText.formatTypeAnswerInstruction(promptId))
}

export function wireHandlers(
  bot: Chat,
  platform: Platform,
  credentials: Record<string, string>,
): void {
  const botKey = instanceKey(platform, credentials)

  bot.onAction(async (event) => {
    if (!event.thread) return

    const channel = await resolveChannelForMessage(
      platform,
      parseThreadChannelId(event.thread.id)?.targetChatId ?? '',
      credentials,
    )
    if (!channel) return

    const parsed = await withClient((client) =>
      promptModels.getPromptByActionKey(
        client,
        channel.organization_id,
        channel.channel_id,
        event.actionId,
      ),
    )
    if (!parsed) return

    if (parsed.optionId === pendingText.TEXT_OPTION_ID) {
      await handleTypeAnswerArm(channel, parsed.promptId, event.user, event.thread)
      return
    }

    const label = await withClient((client) =>
      promptModels.resolveOptionLabel(
        client,
        channel.organization_id,
        channel.channel_id,
        parsed.promptId,
        parsed.optionId,
      ),
    )
    if (!label) return

    await handlePromptAnswer(
      channel.organization_id,
      channel.channel_id,
      parsed.promptId,
      {
        type: 'option',
        value: label,
        userId: event.user?.userId ? Number(event.user.userId) : null,
        username: event.user?.userName ?? event.user?.fullName ?? null,
      },
      event.thread,
      channel.target_chat_id,
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

    if (
      platform === 'telegram' &&
      channel.channel_type === 'PROMPT' &&
      isTelegramPrivateChat(channel.target_chat_id) &&
      isTelegramStartCommand(trimmed)
    ) {
      const startReply = loadConfig().TELEGRAM_CHANNEL_START_REPLY
      if (startReply && thread) {
        await thread.post(startReply)
      }
      return
    }

    const idMatch = ID_REPLY_RE.exec(trimmed)
    if (idMatch && channel.channel_type === 'PROMPT') {
      const promptId = idMatch[1]
      const replyText = idMatch[2]

      const prompt = await withClient((client) =>
        promptModels.getPrompt(client, channel.organization_id, channel.channel_id, promptId),
      )
      if (!promptModels.canAcceptTextReply(prompt)) return

      await handlePromptAnswer(
        channel.organization_id,
        channel.channel_id,
        promptId,
        {
          type: 'text',
          value: replyText,
          userId: user?.userId ? Number(user.userId) : null,
          username: user?.userName ?? user?.fullName ?? null,
        },
        thread,
        channel.target_chat_id,
      )
      return
    }

    if (channel.channel_type === 'PROMPT' && user?.userId) {
      const userId = Number(user.userId)
      if (Number.isFinite(userId)) {
        const pending = await withClient((client) =>
          pendingText.getPendingTextReply(
            client,
            channel.organization_id,
            channel.target_chat_id,
            userId,
          ),
        )
        if (pending) {
          await withClient((client) =>
            pendingText.clearPendingTextReply(
              client,
              channel.organization_id,
              channel.target_chat_id,
              userId,
            ),
          )

          const prompt = await withClient((client) =>
            promptModels.getPrompt(
              client,
              channel.organization_id,
              channel.channel_id,
              pending.prompt_id,
            ),
          )
          if (!promptModels.canAcceptTextReply(prompt)) {
            if (prompt?.state === promptModels.ANSWERED) {
              if (thread) {
                await thread.post(
                  promptModels.formatAlreadyAnsweredReply(pending.prompt_id, prompt),
                )
              }
            } else if (prompt?.state === 'EXPIRED') {
              if (thread) {
                await thread.post(promptModels.formatExpiredPromptReply(pending.prompt_id))
              }
            }
            return
          }

          await handlePromptAnswer(
            channel.organization_id,
            channel.channel_id,
            pending.prompt_id,
            {
              type: 'text',
              value: trimmed,
              userId,
              username: user?.userName ?? user?.fullName ?? null,
            },
            thread,
            channel.target_chat_id,
          )
          return
        }
      }
    }

    if (channel.channel_type === 'MESSAGE') {
      const from =
        user?.userName ?? user?.fullName ?? (user?.userId ? `user_${user.userId}` : 'unknown')

      await recordInboundMessage(channel.organization_id, channel, trimmed, from).catch((err) =>
        console.error('record inbound message error:', err),
      )

      if (!channel.callback_url) return

      const messageEvent: Record<string, unknown> = {
        type: 'message.created',
        platform: channel.platform,
        channel_id: channel.channel_id,
        from,
        text: trimmed,
      }
      if (channel.callback_data !== null && channel.callback_data !== undefined) {
        messageEvent.callback_data = channel.callback_data
      }

      const ok = await forwardChannelCallback(
        channel.callback_url,
        messageEvent,
        channel.callback_headers,
      )

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
