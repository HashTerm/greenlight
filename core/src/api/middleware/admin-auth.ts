import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { loadConfig } from "../../core/config.js";

export async function adminAuthMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const config = loadConfig();
  if (!config.ADMIN_INTERNAL_TOKEN) {
    return c.json({ detail: "Admin API not configured" }, 503);
  }

  const adminToken = c.req.header("X-Admin-Token");
  if (!adminToken) {
    return c.json({ detail: "Invalid or missing admin token" }, 401);
  }

  try {
    const valid = timingSafeEqual(
      Buffer.from(adminToken),
      Buffer.from(config.ADMIN_INTERNAL_TOKEN),
    );
    if (!valid) {
      return c.json({ detail: "Invalid or missing admin token" }, 401);
    }
  } catch {
    return c.json({ detail: "Invalid or missing admin token" }, 401);
  }

  return next();
}
