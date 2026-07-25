import { loadConfig } from "../core/config.js";
import type { ChannelRow } from "../services/channels/models.js";
import type { Platform } from "../core/platform.js";

function telegramApiUrl(botToken: string, method: string): string {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

export function buildWebhookUrl(platform: Platform, channelId: string): string {
  const config = loadConfig();
  if (!config.PUBLIC_WEBHOOK_URL?.trim()) {
    throw new Error("PUBLIC_WEBHOOK_URL is required for webhook registration");
  }
  const base = config.PUBLIC_WEBHOOK_URL.replace(/\/$/, "");
  return `${base}/webhooks/${platform}/${encodeURIComponent(channelId)}`;
}

export async function registerPlatformWebhook(
  channel: ChannelRow,
): Promise<void> {
  const config = loadConfig();
  if (!config.PUBLIC_WEBHOOK_URL?.trim()) return;

  switch (channel.platform) {
    case "telegram":
      await registerTelegramWebhook(channel);
      break;
    case "slack":
    case "teams":
    case "discord":
    case "gchat":
    case "whatsapp":
    case "messenger":
      // Platform console must point to buildWebhookUrl(platform, channelId).
      // gchat: Google Chat App URL + optional Pub/Sub push endpoint
      // whatsapp/messenger: Meta Callback URL; verify_token must match credentials.verify_token
      // discord: Interactions Endpoint URL in developer portal
      break;
    default:
      break;
  }
}

async function registerTelegramWebhook(channel: ChannelRow): Promise<void> {
  const config = loadConfig();
  const botToken = channel.credentials.bot_token;
  const url = buildWebhookUrl("telegram", channel.channel_id);

  const res = await fetch(telegramApiUrl(botToken, "setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: config.WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `setWebhook failed for channel ${channel.channel_id}: ${text}`,
    );
  }

  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!data.ok) {
    throw new Error(
      `setWebhook failed for channel ${channel.channel_id}: ${data.description ?? "unknown error"}`,
    );
  }
}

export async function deletePlatformWebhook(channel: ChannelRow): Promise<void> {
  if (channel.platform !== "telegram") return;
  if (!loadConfig().PUBLIC_WEBHOOK_URL?.trim()) return;

  const botToken = channel.credentials.bot_token;
  const res = await fetch(telegramApiUrl(botToken, "deleteWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drop_pending_updates: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`deleteWebhook failed: ${text}`);
  }
}
