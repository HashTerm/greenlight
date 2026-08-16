import { describe, expect, it, beforeEach, vi } from 'vitest'
import type pg from 'pg'
import {
  parsePromptId,
  formatPromptId,
  canAcceptTextReply,
  markAnswered,
  formatStoredAnswerValue,
  formatRecordedReply,
  formatAlreadyAnsweredReply,
  formatExpiredPromptReply,
  PENDING,
  ANSWERED,
  type PromptRow,
} from '../src/services/prompts/models.js'
import {
  validateCallbackUrl,
  validateCallbackData,
  validateCallbackHeaders,
  validateMediaPath,
  ValueError,
  CALLBACK_DATA_MAX_BYTES,
  CALLBACK_HEADERS_MAX_BYTES,
} from '../src/core/security.js'
import { resetConfigForTests } from '../src/core/config.js'

function basePromptRow(overrides: Partial<PromptRow> = {}): PromptRow {
  return {
    id: 'uuid',
    organization_id: 'org-1',
    channel_id: 'telegram-prompts',
    prompt_num: 1,
    chat_id: '-100',
    message_id: 1,
    text: 'test',
    media_url: null,
    options: [],
    allow_text: false,
    callback_url: 'https://example.com/hook',
    callback_headers: { Authorization: 'Bearer test' },
    correlation_id: 'corr-1',
    callback_data: { build: 9182 },
    broadcast_batch_id: null,
    broadcast_group_id: null,
    broadcast_answer_mode: null,
    broadcast_batch_status: null,
    state: PENDING,
    created_at: new Date('2026-01-01'),
    expires_at: null,
    answered_at: null,
    answered_by_id: null,
    answered_by_username: null,
    answer: null,
    ...overrides,
  }
}

describe('prompt models', () => {
  it('parses prompt ids', () => {
    expect(parsePromptId('#123')).toBe(123)
    expect(parsePromptId('123')).toBe(123)
    expect(parsePromptId('bad')).toBeNull()
    expect(formatPromptId(42)).toBe('#42')
  })

  it('gates text replies on allow_text and pending state', () => {
    const base = {
      id: 'uuid',
      channel_id: 'telegram-prompts',
      prompt_num: 1,
      chat_id: '-100',
      message_id: 1,
      text: 'test',
      media_url: null,
      options: [],
      callback_url: null,
      correlation_id: null,
      callback_data: null,
    broadcast_batch_id: null,
    broadcast_group_id: null,
    created_at: new Date(),
      expires_at: null,
      answered_at: null,
      answered_by_id: null,
      answered_by_username: null,
      answer: null,
    } satisfies Omit<PromptRow, 'allow_text' | 'state' | 'organization_id'>

    expect(
      canAcceptTextReply({ ...base, organization_id: 'org', allow_text: true, state: PENDING }),
    ).toBe(true)
    expect(
      canAcceptTextReply({ ...base, organization_id: 'org', allow_text: false, state: PENDING }),
    ).toBe(false)
    expect(
      canAcceptTextReply({ ...base, organization_id: 'org', allow_text: true, state: ANSWERED }),
    ).toBe(false)
    expect(canAcceptTextReply(null)).toBe(false)
  })

  it('formats stored answer value and reply messages', () => {
    const answered = basePromptRow({
      state: ANSWERED,
      answer: { type: 'option', value: 'Approve' },
    })
    expect(formatStoredAnswerValue(answered)).toBe('Approve')
    expect(formatRecordedReply('#2', 'Approve')).toBe('Recorded answer for ID:#2 Approve')
    expect(formatAlreadyAnsweredReply('#1', answered)).toBe('Already answered for ID:#1: Approve')
    expect(formatExpiredPromptReply('#1')).toBe('Prompt expired for ID:#1')
  })

  it('formats already answered reply without stored value', () => {
    const answered = basePromptRow({ state: ANSWERED, answer: null })
    expect(formatAlreadyAnsweredReply('#1', answered)).toBe('Already answered for ID:#1')
  })

  describe('markAnswered', () => {
    const channelId = 'telegram-prompts'
    const answer = {
      type: 'option',
      value: 'Approve',
      userId: 42,
      username: 'alice',
    }

    it('returns recorded with callback when update succeeds', async () => {
      const prompt = basePromptRow({
        state: ANSWERED,
        answered_at: new Date('2026-01-02'),
        answer: { type: 'option', value: 'Approve' },
      })
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rowCount: 1 })
          .mockResolvedValueOnce({ rows: [prompt] })
          .mockResolvedValueOnce({ rows: [prompt] }),
      } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, '#1', answer)
      expect(result.status).toBe('recorded')
      if (result.status !== 'recorded') return

      expect(result.batchResolution).toBeNull()
      expect(result.callbackInfo).toEqual({
        callbackUrl: 'https://example.com/hook',
        callbackHeaders: { Authorization: 'Bearer test' },
        payload: {
          prompt_id: '#1',
          channel_id: 'telegram-prompts',
          correlation_id: 'corr-1',
          callback_data: { build: 9182 },
          text: 'test',
          answer: {
            type: 'option',
            value: 'Approve',
            user_id: 42,
            username: 'alice',
          },
          answered_at: '2026-01-02T00:00:00.000Z',
        },
      })
    })

    it('returns recorded without callback when prompt has no callback_url', async () => {
      const prompt = basePromptRow({ state: ANSWERED, callback_url: null })
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rowCount: 1 })
          .mockResolvedValueOnce({ rows: [prompt] })
          .mockResolvedValueOnce({ rows: [prompt] }),
      } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, '#1', answer)
      expect(result).toEqual({ status: 'recorded', callbackInfo: null, batchResolution: null })
    })

    it('returns already_answered when prompt is not pending', async () => {
      const prompt = basePromptRow({
        state: ANSWERED,
        answer: { type: 'option', value: 'Deploy' },
      })
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({ rows: [prompt] }),
      } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, '#1', answer)
      expect(result).toEqual({ status: 'already_answered', prompt })
    })

    it('returns expired when prompt has expired', async () => {
      const prompt = basePromptRow({ state: 'EXPIRED' })
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({ rows: [prompt] }),
      } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, '#1', answer)
      expect(result).toEqual({ status: 'expired', prompt })
    })

    it('returns not_found when prompt row is missing', async () => {
      const client = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] }),
      } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, '#1', answer)
      expect(result).toEqual({ status: 'not_found' })
      expect(client.query).toHaveBeenCalledTimes(2)
    })

    it('returns not_found for invalid prompt id without querying', async () => {
      const client = { query: vi.fn() } as unknown as pg.PoolClient

      const result = await markAnswered(client, 'org-1', channelId, 'bad', answer)
      expect(result).toEqual({ status: 'not_found' })
      expect(client.query).not.toHaveBeenCalled()
    })
  })
})

describe('security', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
    process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
    process.env.WEBHOOK_SECRET = 'webhook-secret-value'
    delete process.env.MEDIA_ALLOWED_DIR
    resetConfigForTests()
  })

  it('rejects private callback URLs', () => {
    expect(() => validateCallbackUrl('http://127.0.0.1/hook')).toThrow(ValueError)
    expect(() => validateCallbackUrl('ftp://example.com/hook')).toThrow(ValueError)
    expect(() => validateCallbackUrl('https://example.com/hook')).not.toThrow()
  })

  it('validates callback_data size and shape', () => {
    expect(validateCallbackData({ build: 1 })).toEqual({ build: 1 })
    expect(validateCallbackData([1, 2])).toEqual([1, 2])
    expect(validateCallbackData(null)).toBeNull()
    expect(() => validateCallbackData('text')).toThrow(ValueError)
    const big = { key: 'x'.repeat(CALLBACK_DATA_MAX_BYTES) }
    expect(() => validateCallbackData(big)).toThrow(ValueError)
  })

  it('validates callback_headers size and shape', () => {
    expect(validateCallbackHeaders({ Authorization: 'Bearer x' })).toEqual({
      Authorization: 'Bearer x',
    })
    expect(validateCallbackHeaders(null)).toBeNull()
    expect(() => validateCallbackHeaders('text')).toThrow(ValueError)
    expect(() => validateCallbackHeaders({ 'Content-Type': 'text/plain' })).toThrow(ValueError)
    const big = { key: 'x'.repeat(CALLBACK_HEADERS_MAX_BYTES) }
    expect(() => validateCallbackHeaders(big)).toThrow(ValueError)
  })

  it('validates media paths when configured', () => {
    process.env.MEDIA_ALLOWED_DIR = '/tmp/greenlight-media'
    resetConfigForTests()
    expect(() => validateMediaPath('/etc/passwd')).toThrow(ValueError)
  })
})
