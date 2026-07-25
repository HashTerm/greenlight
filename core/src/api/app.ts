import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth.js";
import { adminAuthMiddleware } from "./middleware/admin-auth.js";
import { healthRoutes } from "./routes/health.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { promptRoutes } from "./routes/prompts.js";
import { channelRoutes } from "./routes/channels.js";
import { adminRoutes } from "./routes/admin/index.js";
import { loadConfig } from "../core/config.js";

export function createApp(): Hono {
  const app = new Hono();
  const config = loadConfig();

  app.route("/", healthRoutes);
  app.route("/", webhookRoutes);

  if (config.ADMIN_INTERNAL_TOKEN) {
    const adminApp = new Hono();
    adminApp.use("*", adminAuthMiddleware);
    adminApp.route("/", adminRoutes);
    app.route("/admin/v1", adminApp);
  }

  app.use("*", async (c, next) => {
    const path = c.req.path;
    const isAgentRoute =
      path.startsWith("/v1") ||
      path === "/register-channel" ||
      path === "/send" ||
      path.startsWith("/channels");
    if (!isAgentRoute) {
      return next();
    }
    return authMiddleware(c, next);
  });
  app.route("/v1", promptRoutes);
  app.route("/", channelRoutes);

  if (config.ENABLE_DOCS) {
    app.get("/openapi.json", (c) =>
      c.json({
        openapi: "3.0.0",
        info: {
          title: "Greenlight — Multi-Platform Prompt & Channel Gateway",
          version: "0.1.0",
        },
        paths: {
          "/healthz": { get: { summary: "Health check" } },
          "/webhooks/{platform}/{channelId}": {
            get: {
              summary:
                "Platform webhook verification (whatsapp, messenger) or handler",
            },
            post: {
              summary:
                "Platform webhook (telegram, slack, teams, discord, gchat, whatsapp, messenger)",
            },
          },
          "/v1/prompts": { post: { summary: "Create prompt" } },
          "/v1/prompts/upload": { post: { summary: "Create prompt with upload" } },
          "/v1/prompts/pending": { get: { summary: "List pending prompts" } },
          "/v1/prompts/{id}": { get: { summary: "Get prompt" } },
          "/register-channel": { post: { summary: "Register channel" } },
          "/send": { post: { summary: "Send message" } },
          "/channels": { get: { summary: "List channels" } },
          "/channels/{id}": { delete: { summary: "Unregister channel" } },
        },
      }),
    );
  }

  return app;
}
