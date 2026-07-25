/** @jsxImportSource chat */
import { readFile } from "node:fs/promises";
import { withClient } from "../../db/client.js";
import { validateCallbackUrl, validateMediaPath, ValueError } from "../../core/security.js";
import * as channelModels from "../channels/models.js";
import * as promptModels from "./models.js";
import { ensureBotForChannel, postToChat } from "../../chat/bot-manager.js";
import { buildPromptCard } from "../../chat/prompt-card.js";
import { loadConfig } from "../../core/config.js";
import { maxPromptOptionsForPlatform } from "../../core/platform.js";

export interface CreatePromptInput {
  channelId?: string | null;
  text: string;
  mediaPath?: string | null;
  mediaUrl?: string | null;
  options?: string[] | null;
  allowText?: boolean;
  callbackUrl?: string | null;
  correlationId?: string | null;
  ttlSec?: number | null;
  mediaFile?: Buffer | null;
  mediaFileName?: string | null;
}

function countMediaSources(input: CreatePromptInput): number {
  return [
    Boolean(input.mediaUrl?.trim()),
    Boolean(input.mediaPath?.trim()),
    Boolean(input.mediaFile),
  ].filter(Boolean).length;
}

function resolveChannelId(explicit: string | null | undefined): string {
  const config = loadConfig();
  const channelId = explicit ?? config.DEFAULT_PROMPT_CHANNEL_ID;
  if (!channelId) {
    throw new ValueError(
      "channel_id is required (or set DEFAULT_PROMPT_CHANNEL_ID)",
    );
  }
  return channelId;
}

export async function createAndPostPrompt(
  input: CreatePromptInput,
): Promise<{ promptId: string; channelId: string; messageId: number }> {
  if (countMediaSources(input) > 1) {
    throw new ValueError("Cannot provide multiple media sources");
  }

  if (input.mediaPath?.trim()) {
    validateMediaPath(input.mediaPath);
  }

  if (input.callbackUrl) {
    try {
      validateCallbackUrl(input.callbackUrl);
    } catch (err) {
      throw new ValueError(`Invalid callback_url: ${(err as Error).message}`);
    }
  }

  const resolvedChannelId = resolveChannelId(input.channelId);

  return withClient(async (client) => {
    const channel = await channelModels.getChannel(client, resolvedChannelId);
    if (!channel) {
      throw new ValueError(`Channel ${resolvedChannelId} not found`);
    }

    const options = input.options ?? [];
    const optionLimit = maxPromptOptionsForPlatform(channel.platform);
    if (optionLimit !== null && options.length > optionLimit) {
      throw new ValueError(
        `${channel.platform} supports at most ${optionLimit} prompt options`,
      );
    }

    const ttlSec = input.ttlSec ?? 3600;

    const { promptId, row } = await promptModels.createPrompt(client, {
      chatId: channel.target_chat_id,
      text: input.text,
      mediaUrl: input.mediaUrl ?? input.mediaPath ?? null,
      options,
      allowText: input.allowText ?? false,
      callbackUrl: input.callbackUrl ?? null,
      correlationId: input.correlationId ?? null,
      ttlSec,
    });

    const cardOptions: { optionId: string; label: string; actionKey: string }[] =
      [];
    for (let i = 0; i < options.length; i++) {
      const optId = String(i + 1);
      const label = options[i];
      const actionKey = `${promptId}:${optId}`;
      await promptModels.addOptionMap(client, promptId, optId, label);
      cardOptions.push({ optionId: optId, label, actionKey });
    }

    await ensureBotForChannel(channel);

    const card = buildPromptCard(input.text, cardOptions);
    let messageToSend: unknown = card;

    if (input.mediaFile) {
      messageToSend = {
        text: input.text,
        attachments: [
          {
            data: input.mediaFile,
            filename: input.mediaFileName ?? "image.jpg",
            contentType: "image/jpeg",
          },
        ],
        card,
      };
    } else if (input.mediaUrl?.trim()) {
      messageToSend = {
        text: input.text,
        attachments: [{ url: input.mediaUrl }],
        card,
      };
    } else if (input.mediaPath?.trim()) {
      const config = loadConfig();
      const maxBytes = config.MAX_MEDIA_SIZE_MB * 1024 * 1024;
      const data = await readFile(input.mediaPath);
      if (data.byteLength > maxBytes) {
        throw new ValueError(
          `File size exceeds the ${config.MAX_MEDIA_SIZE_MB} MB limit`,
        );
      }
      messageToSend = {
        text: input.text,
        attachments: [
          {
            data,
            filename: input.mediaPath.split("/").pop() ?? "image.jpg",
            contentType: "image/jpeg",
          },
        ],
        card,
      };
    }

    const sent = await postToChat(channel, messageToSend as never);

    const messageId = sent.messageId ? Number(sent.messageId) : 0;
    if (messageId) {
      await promptModels.setMessageId(client, promptId, messageId);
    }

    return {
      promptId,
      channelId: resolvedChannelId,
      messageId,
    };
  });
}

export async function getPrompt(promptId: string) {
  return withClient((client) => promptModels.getPrompt(client, promptId));
}

export async function listPendingPrompts() {
  return withClient((client) => promptModels.listPending(client));
}

export async function expirePrompts(): Promise<number> {
  return withClient((client) => promptModels.expireOld(client));
}
