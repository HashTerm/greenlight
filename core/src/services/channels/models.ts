import type pg from "pg";
import type { Platform } from "../../core/platform.js";
import {
  credentialFingerprint,
  instanceKey,
} from "../../core/platform.js";

export interface ChannelRow {
  channel_id: string;
  platform: Platform;
  target_chat_id: string;
  credentials: Record<string, string>;
  callback_url: string | null;
  is_active: boolean;
  registered_at: Date;
  channel_type: string;
}

export function channelInstanceKey(channel: ChannelRow): string {
  return instanceKey(channel.platform, channel.credentials);
}

export function channelCredentialFingerprint(channel: ChannelRow): string {
  return credentialFingerprint(channel.platform, channel.credentials);
}

export async function registerChannel(
  client: pg.PoolClient,
  data: {
    channelId: string;
    platform: Platform;
    targetChatId: string;
    credentials: Record<string, string>;
    callbackUrl: string | null;
    channelType: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO channels (channel_id, platform, target_chat_id, credentials, callback_url, channel_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (channel_id)
     DO UPDATE SET
       platform = EXCLUDED.platform,
       target_chat_id = EXCLUDED.target_chat_id,
       credentials = EXCLUDED.credentials,
       callback_url = EXCLUDED.callback_url,
       channel_type = EXCLUDED.channel_type,
       is_active = true`,
    [
      data.channelId,
      data.platform,
      data.targetChatId,
      JSON.stringify(data.credentials),
      data.callbackUrl,
      data.channelType,
    ],
  );
}

export async function getChannel(
  client: pg.PoolClient,
  channelId: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>(
    "SELECT * FROM channels WHERE channel_id = $1",
    [channelId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    credentials:
      typeof row.credentials === "string"
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  };
}

export async function listActiveChannels(
  client: pg.PoolClient,
): Promise<ChannelRow[]> {
  const result = await client.query<ChannelRow>(
    "SELECT * FROM channels WHERE is_active = true",
  );
  return result.rows.map((row) => ({
    ...row,
    credentials:
      typeof row.credentials === "string"
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }));
}

export async function listAllChannels(
  client: pg.PoolClient,
): Promise<ChannelRow[]> {
  const result = await client.query<ChannelRow>("SELECT * FROM channels ORDER BY registered_at DESC");
  return result.rows.map((row) => ({
    ...row,
    credentials:
      typeof row.credentials === "string"
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials,
  }));
}

export async function deactivateChannel(
  client: pg.PoolClient,
  channelId: string,
): Promise<void> {
  await client.query("UPDATE channels SET is_active = false WHERE channel_id = $1", [
    channelId,
  ]);
}

export async function findChannelByTarget(
  client: pg.PoolClient,
  platform: Platform,
  targetChatId: string,
  credFingerprint: string,
): Promise<ChannelRow | null> {
  const result = await client.query<ChannelRow>(
    `SELECT * FROM channels
     WHERE platform = $1
       AND target_chat_id = $2
       AND is_active = true`,
    [platform, targetChatId],
  );

  for (const row of result.rows) {
    const credentials =
      typeof row.credentials === "string"
        ? (JSON.parse(row.credentials) as Record<string, string>)
        : row.credentials;
    if (credentialFingerprint(platform, credentials) === credFingerprint) {
      return { ...row, credentials };
    }
  }
  return null;
}
