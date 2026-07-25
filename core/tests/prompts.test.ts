import { describe, expect, it, beforeEach } from "vitest";
import {
  parsePromptId,
  formatPromptId,
  canAcceptTextReply,
  PENDING,
  ANSWERED,
} from "../src/services/prompts/models.js";
import type { PromptRow } from "../src/services/prompts/models.js";
import {
  validateCallbackUrl,
  validateMediaPath,
  ValueError,
} from "../src/core/security.js";
import { resetConfigForTests } from "../src/core/config.js";

describe("prompt models", () => {
  it("parses prompt ids", () => {
    expect(parsePromptId("#123")).toBe(123);
    expect(parsePromptId("123")).toBe(123);
    expect(parsePromptId("bad")).toBeNull();
    expect(formatPromptId(42)).toBe("#42");
  });

  it("gates text replies on allow_text and pending state", () => {
    const base = {
      id: "uuid",
      prompt_num: 1,
      chat_id: "-100",
      message_id: 1,
      text: "test",
      media_url: null,
      options: [],
      callback_url: null,
      correlation_id: null,
      created_at: new Date(),
      expires_at: null,
      answered_at: null,
      answered_by_id: null,
      answered_by_username: null,
      answer: null,
    } satisfies Omit<PromptRow, "allow_text" | "state">;

    expect(
      canAcceptTextReply({ ...base, allow_text: true, state: PENDING }),
    ).toBe(true);
    expect(
      canAcceptTextReply({ ...base, allow_text: false, state: PENDING }),
    ).toBe(false);
    expect(
      canAcceptTextReply({ ...base, allow_text: true, state: ANSWERED }),
    ).toBe(false);
    expect(canAcceptTextReply(null)).toBe(false);
  });
});

describe("security", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://greenlight:greenlight@localhost:5432/greenlight";
    process.env.CALLBACK_SIGNING_SECRET = "test-secret-value";
    process.env.WEBHOOK_SECRET = "webhook-secret-value";
    delete process.env.MEDIA_ALLOWED_DIR;
    resetConfigForTests();
  });

  it("rejects private callback URLs", () => {
    expect(() => validateCallbackUrl("http://127.0.0.1/hook")).toThrow(ValueError);
    expect(() => validateCallbackUrl("ftp://example.com/hook")).toThrow(ValueError);
    expect(() => validateCallbackUrl("https://example.com/hook")).not.toThrow();
  });

  it("validates media paths when configured", () => {
    process.env.MEDIA_ALLOWED_DIR = "/tmp/greenlight-media";
    resetConfigForTests();
    expect(() => validateMediaPath("/etc/passwd")).toThrow(ValueError);
  });
});
