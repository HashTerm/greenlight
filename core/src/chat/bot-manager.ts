import type { Chat } from "chat";
import { createPostgresState } from "@chat-adapter/state-pg";
import { getPool } from "../db/client.js";
import { loadConfig } from "../core/config.js";
import type { ChannelRow } from "../services/channels/models.js";
import { channelInstanceKey } from "../services/channels/models.js";
import {
  instanceKey,
  platformChannelId,
  resolvePlatformChannelId,
  type Platform,
} from "../core/platform.js";
import { adapterName, createAdapterForChannel } from "./adapters.js";
import { wireHandlers } from "./handlers.js";
import {
  deletePlatformWebhook,
  registerPlatformWebhook,
} from "./platform-webhook.js";

export interface ManagedBot {
  bot: Chat;
  platform: Platform;
  instanceKey: string;
  channelIds: Set<string>;
  gatewayTask?: Promise<void>;
}

const botsByKey = new Map<string, ManagedBot>();
const channelToKey = new Map<string, string>();

function stateKeyPrefix(platform: Platform, credentials: Record<string, string>): string {
  return `greenlight:${instanceKey(platform, credentials)}`;
}

async function startDiscordGateway(managed: ManagedBot, channelId: string): Promise<void> {
  const config = loadConfig();
  if (!config.PUBLIC_WEBHOOK_URL?.trim()) return;

  const adapter = managed.bot.getAdapter("discord");
  if (!adapter || !("startGatewayListener" in adapter)) return;

  const webhookUrl = `${config.PUBLIC_WEBHOOK_URL.replace(/\/$/, "")}/webhooks/discord/${encodeURIComponent(channelId)}`;
  const durationMs = 10 * 60 * 1000;

  const runLoop = async (): Promise<void> => {
    while (managed.channelIds.size > 0) {
      try {
        await (
          adapter as {
            startGatewayListener: (
              options: object,
              durationMs?: number,
              abortSignal?: AbortSignal,
              webhookUrl?: string,
            ) => Promise<Response>;
          }
        ).startGatewayListener({}, durationMs, undefined, webhookUrl);
      } catch (err) {
        console.error(`Discord gateway listener error for ${channelId}:`, err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  managed.gatewayTask = runLoop();
}

async function createBotInstance(channel: ChannelRow): Promise<ManagedBot> {
  const { Chat } = await import("chat");
  const key = channelInstanceKey(channel);
  const adapter = createAdapterForChannel(channel);
  const name = adapterName(channel.platform);

  const state = createPostgresState({
    client: getPool(),
    keyPrefix: stateKeyPrefix(channel.platform, channel.credentials),
  });

  const userName = `bot_${channel.channel_id}`.slice(0, 32);
  const bot = new Chat({
    userName,
    adapters: { [name]: adapter },
    state,
  });

  wireHandlers(bot, channel.platform, channel.credentials);

  const managed: ManagedBot = {
    bot,
    platform: channel.platform,
    instanceKey: key,
    channelIds: new Set(),
  };

  await bot.initialize();
  botsByKey.set(key, managed);

  await registerPlatformWebhook(channel);

  if (channel.platform === "discord") {
    await startDiscordGateway(managed, channel.channel_id);
  }

  return managed;
}

export async function ensureBotForChannel(
  channel: ChannelRow,
): Promise<ManagedBot> {
  const key = channelInstanceKey(channel);
  const existing = botsByKey.get(key);
  if (existing) {
    existing.channelIds.add(channel.channel_id);
    channelToKey.set(channel.channel_id, key);
    return existing;
  }

  const managed = await createBotInstance(channel);
  managed.channelIds.add(channel.channel_id);
  channelToKey.set(channel.channel_id, key);
  return managed;
}

export function getBotForChannel(channelId: string): ManagedBot | undefined {
  const key = channelToKey.get(channelId);
  if (!key) return undefined;
  return botsByKey.get(key);
}

export function getBotByKey(key: string): ManagedBot | undefined {
  return botsByKey.get(key);
}

export async function stopBotForChannelWithRow(channel: ChannelRow): Promise<void> {
  const key = channelToKey.get(channel.channel_id);
  if (!key) return;

  const managed = botsByKey.get(key);
  if (!managed) return;

  managed.channelIds.delete(channel.channel_id);
  channelToKey.delete(channel.channel_id);

  if (managed.channelIds.size === 0) {
    await deletePlatformWebhook(channel);
    await managed.bot.shutdown();
    botsByKey.delete(key);
  }
}

export async function postToChat(
  channel: ChannelRow,
  message: unknown,
): Promise<{ messageId?: string }> {
  const key = channelInstanceKey(channel);
  const managed = botsByKey.get(key);
  if (!managed) {
    throw new Error(`Bot not initialized for channel ${channel.channel_id}`);
  }

  const ch = managed.bot.channel(resolvePlatformChannelId(channel));
  const sent = await ch.post(message as string);
  const messageId =
    sent && typeof sent === "object" && "id" in sent
      ? String((sent as { id: string }).id)
      : undefined;
  return { messageId };
}

export function getPlatformChannelId(
  platform: Platform,
  targetChatId: string,
): string {
  return platformChannelId(platform, targetChatId);
}

export async function shutdownAllBots(): Promise<void> {
  for (const managed of botsByKey.values()) {
    await managed.bot.shutdown();
  }
  botsByKey.clear();
  channelToKey.clear();
}
