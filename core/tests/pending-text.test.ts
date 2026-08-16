import { describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import type { PromptRow } from '../src/services/prompts/models.js'
import {
  armPendingTextReply,
  clearPendingTextReply,
  clearPendingTextRepliesForPrompt,
  computeTextArmExpiresAt,
  deleteExpiredPendingTextReplies,
  formatTypeAnswerInstruction,
  formatTypeAnswerSwitched,
  getPendingTextReply,
  TEXT_OPTION_ID,
  TYPE_ANSWER_BUTTON_LABEL,
} from '../src/services/prompts/pending-text.js'
import { PENDING } from '../src/services/prompts/models.js'

describe('pending text replies', () => {
  it('exports text action constants', () => {
    expect(TEXT_OPTION_ID).toBe('text')
    expect(TYPE_ANSWER_BUTTON_LABEL).toBe('Type answer')
  })

  it('formats instruction and switch messages', () => {
    expect(formatTypeAnswerInstruction('#2')).toBe(
      'Type your answer for Prompt #2. Your next message will be recorded as the answer.',
    )
    expect(formatTypeAnswerSwitched('#1', '#3')).toBe('Switched to Prompt #3 for text answer.')
  })

  it('computes arm expiry capped by prompt TTL', () => {
    const base = {
      id: 'uuid',
      organization_id: 'org',
      channel_id: 'telegram-prompts',
      prompt_num: 1,
      chat_id: '-100',
      message_id: 1,
      text: 'test',
      media_url: null,
      options: [],
      allow_text: true,
      callback_url: null,
      correlation_id: null,
      callback_data: null,
      broadcast_id: null,
      state: PENDING,
      created_at: new Date('2026-01-01'),
      expires_at: new Date('2026-01-01T00:10:00Z'),
      answered_at: null,
      answered_by_id: null,
      answered_by_username: null,
      answer: null,
    } satisfies PromptRow

    const soon = computeTextArmExpiresAt(base, 900)
    expect(soon.toISOString()).toBe('2026-01-01T00:10:00.000Z')

    const later = computeTextArmExpiresAt({ ...base, expires_at: null }, 60)
    expect(later.getTime()).toBeGreaterThan(Date.now() + 59_000)
  })

  describe('db helpers', () => {
    it('arms and reads pending reply', async () => {
      const expiresAt = new Date('2026-12-01T00:00:00Z')
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rowCount: 1 })
          .mockResolvedValueOnce({
            rows: [
              {
                organization_id: 'org-1',
                chat_id: '-100',
                user_id: 42,
                prompt_id: '#2',
                expires_at: expiresAt,
                created_at: new Date('2026-01-01'),
              },
            ],
          }),
      } as unknown as pg.PoolClient

      const switched = await armPendingTextReply(client, {
        organizationId: 'org-1',
        chatId: '-100',
        userId: 42,
        promptId: '#2',
        expiresAt,
      })
      expect(switched).toBeNull()

      const pending = await getPendingTextReply(client, 'org-1', '-100', 42)
      expect(pending?.prompt_id).toBe('#2')
    })

    it('returns previous prompt id when switching arms', async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ prompt_id: '#1' }] })
          .mockResolvedValueOnce({ rowCount: 1 }),
      } as unknown as pg.PoolClient

      const switched = await armPendingTextReply(client, {
        organizationId: 'org-1',
        chatId: '-100',
        userId: 42,
        promptId: '#2',
        expiresAt: new Date('2026-12-01'),
      })
      expect(switched).toBe('#1')
    })

    it('clears pending replies', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rowCount: 1 }),
      } as unknown as pg.PoolClient

      await clearPendingTextReply(client, 'org-1', '-100', 42)
      await clearPendingTextRepliesForPrompt(client, 'org-1', '-100', '#2')
      expect(client.query).toHaveBeenCalledTimes(2)
    })

    it('deletes expired rows', async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [{ c: '3' }] }),
      } as unknown as pg.PoolClient

      const count = await deleteExpiredPendingTextReplies(client)
      expect(count).toBe(3)
    })
  })
})
