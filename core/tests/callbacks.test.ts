import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { resetConfigForTests } from "../src/core/config.js";

function setupEnv(): void {
  process.env.DATABASE_URL = "postgresql://greenlight:greenlight@localhost:5432/greenlight";
  process.env.CALLBACK_SIGNING_SECRET = "test-secret-value";
  process.env.WEBHOOK_SECRET = "webhook-secret-value";
  resetConfigForTests();
}

describe("callbacks", () => {
  beforeEach(() => {
    setupEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("signs prompt callbacks with X-Signature", async () => {
    const { notifyCallback } = await import("../src/core/callbacks.js");
    await notifyCallback("https://example.com/hook", { prompt_id: "#1" });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-Signature"]).toMatch(/^sha256=/);
  });

  it("does not sign channel callbacks", async () => {
    const { forwardChannelCallback } = await import("../src/core/callbacks.js");
    const ok = await forwardChannelCallback("https://example.com/hook", {
      type: "message.created",
      platform: "slack",
      channel_id: "finance-bot",
      from: "alice",
      text: "hello",
    });

    expect(ok).toBe(true);
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-Signature"]).toBeUndefined();
  });
});
