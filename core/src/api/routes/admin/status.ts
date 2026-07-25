import { Hono } from "hono";
import { withClient } from "../../../db/client.js";
import { ANSWERED, PENDING } from "../../../services/prompts/models.js";

export const adminStatusRoutes = new Hono();

adminStatusRoutes.get("/status", async (c) => {
  try {
    const stats = await withClient(async (client) => {
      const dbCheck = await client.query("SELECT 1 AS ok");
      const database = dbCheck.rows[0]?.ok === 1 ? "ok" : "error";

      const channelsResult = await client.query<{ c: string }>(
        "SELECT count(*)::text AS c FROM channels WHERE is_active = true",
      );
      const channelsActive = Number(channelsResult.rows[0]?.c ?? 0);

      const pendingResult = await client.query<{ c: string }>(
        "SELECT count(*)::text AS c FROM prompts WHERE state = $1",
        [PENDING],
      );
      const promptsPending = Number(pendingResult.rows[0]?.c ?? 0);

      const answeredResult = await client.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM prompts
         WHERE state = $1 AND answered_at > now() - interval '24 hours'`,
        [ANSWERED],
      );
      const promptsAnswered24h = Number(answeredResult.rows[0]?.c ?? 0);

      const platformResult = await client.query<{ platform: string; c: string }>(
        `SELECT platform, count(*)::text AS c
         FROM channels WHERE is_active = true
         GROUP BY platform`,
      );
      const platforms: Record<string, number> = {};
      for (const row of platformResult.rows) {
        platforms[row.platform] = Number(row.c);
      }

      return {
        status: "ok" as const,
        database,
        channels_active: channelsActive,
        prompts_pending: promptsPending,
        prompts_answered_24h: promptsAnswered24h,
        platforms,
      };
    });

    return c.json(stats);
  } catch {
    return c.json({
      status: "error",
      database: "error",
      channels_active: 0,
      prompts_pending: 0,
      prompts_answered_24h: 0,
      platforms: {},
    });
  }
});
