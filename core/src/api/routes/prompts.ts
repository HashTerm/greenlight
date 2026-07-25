import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createAndPostPrompt,
  getPrompt,
  listPendingPrompts,
} from "../../services/prompts/service.js";
import { ValueError } from "../../core/security.js";

const promptInSchema = z.object({
  channel_id: z.string().optional().nullable(),
  text: z.string().max(4096),
  media_url: z.string().optional().nullable(),
  media_path: z.string().optional().nullable(),
  options: z.array(z.string().max(64)).max(10).optional().nullable(),
  allow_text: z.boolean().optional().default(false),
  callback_url: z.string().optional().nullable(),
  correlation_id: z.string().max(255).optional().nullable(),
  ttl_sec: z.number().int().min(0).max(7 * 24 * 3600).optional().nullable(),
});

export const promptRoutes = new Hono();

promptRoutes.post("/prompts", zValidator("json", promptInSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const result = await createAndPostPrompt({
      channelId: body.channel_id,
      text: body.text,
      mediaPath: body.media_path,
      mediaUrl: body.media_url,
      options: body.options ?? [],
      allowText: body.allow_text,
      callbackUrl: body.callback_url,
      correlationId: body.correlation_id,
      ttlSec: body.ttl_sec ?? 3600,
    });
    return c.json({
      prompt_id: result.promptId,
      channel_id: result.channelId,
      message_id: result.messageId,
    });
  } catch (err) {
    if (err instanceof ValueError) {
      return c.json({ detail: err.message }, 400);
    }
    console.error("create prompt error:", err);
    return c.json({ detail: String(err) }, 500);
  }
});

promptRoutes.post("/prompts/upload", async (c) => {
  try {
    const form = await c.req.parseBody();
    const text = String(form.text ?? "");
    if (!text) return c.json({ detail: "text is required" }, 400);

    let options: string[] = [];
    if (form.options) {
      try {
        options = JSON.parse(String(form.options));
      } catch {
        return c.json({ detail: "Invalid JSON format for options" }, 400);
      }
    }

    const file = form.file;
    const mediaUrl = form.media_url ? String(form.media_url) : null;
    if (file && mediaUrl) {
      return c.json({ detail: "Cannot provide both file upload and media_url" }, 400);
    }

    let mediaFile: Buffer | null = null;
    let mediaFileName: string | null = null;
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const blob = file as File;
      mediaFile = Buffer.from(await blob.arrayBuffer());
      mediaFileName = blob.name;
    }

    const result = await createAndPostPrompt({
      channelId: form.channel_id ? String(form.channel_id) : null,
      text,
      mediaPath: form.media_path ? String(form.media_path) : null,
      mediaUrl,
      options,
      allowText: String(form.allow_text ?? "false") === "true",
      callbackUrl: form.callback_url ? String(form.callback_url) : null,
      correlationId: form.correlation_id ? String(form.correlation_id) : null,
      ttlSec: form.ttl_sec ? Number(form.ttl_sec) : 3600,
      mediaFile,
      mediaFileName,
    });

    return c.json({
      prompt_id: result.promptId,
      channel_id: result.channelId,
      message_id: result.messageId,
    });
  } catch (err) {
    if (err instanceof ValueError) {
      return c.json({ detail: err.message }, 400);
    }
    console.error("upload prompt error:", err);
    return c.json({ detail: String(err) }, 500);
  }
});

promptRoutes.get("/prompts/pending", async (c) => {
  const rows = await listPendingPrompts();
  return c.json(
    rows.map((row: Awaited<ReturnType<typeof listPendingPrompts>>[number]) => ({
      id: `#${row.prompt_num}`,
      channel_id: row.chat_id,
      message_id: row.message_id,
      text: row.text,
      state: row.state,
      created_at: row.created_at,
      expires_at: row.expires_at,
      answer: row.answer,
    })),
  );
});

promptRoutes.get("/prompts/:id", async (c) => {
  const promptId = decodeURIComponent(c.req.param("id"));
  const row = await getPrompt(promptId);
  if (!row) return c.json({ detail: "not found" }, 404);

  return c.json({
    id: `#${row.prompt_num}`,
    prompt_num: row.prompt_num,
    chat_id: row.chat_id,
    channel_id: row.chat_id,
    message_id: row.message_id,
    text: row.text,
    media_url: row.media_url,
    options: row.options,
    allow_text: row.allow_text,
    callback_url: row.callback_url,
    correlation_id: row.correlation_id,
    state: row.state,
    created_at: row.created_at,
    expires_at: row.expires_at,
    answered_at: row.answered_at,
    answered_by_id: row.answered_by_id,
    answered_by_username: row.answered_by_username,
    answer: row.answer,
  });
});
