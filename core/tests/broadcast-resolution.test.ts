import { describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import {
  evaluateBroadcastBatch,
  formatBroadcastConflictReply,
  formatBroadcastDecidedReply,
  formatBroadcastMajorityReply,
} from '../src/services/prompts/broadcast-resolution.js'
import {
  ANSWERED,
  BATCH_COLLECTING,
  BATCH_CONFLICT,
  BATCH_RESOLVED,
  PENDING,
  type PromptRow,
} from '../src/services/prompts/models.js'

function siblingRow(channelId: string, overrides: Partial<PromptRow> = {}): PromptRow {
  return {
    id: `id-${channelId}`,
    organization_id: 'org-1',
    channel_id: channelId,
    prompt_num: channelId === 'slack-ops' ? 1 : 2,
    chat_id: '-100',
    message_id: 1,
    text: 'Approve deploy?',
    media_url: null,
    options: ['Approve', 'Reject'],
    allow_text: false,
    callback_url: 'https://example.com/hook',
    callback_headers: null,
    correlation_id: 'corr-1',
    callback_data: null,
    broadcast_batch_id: 'brd_test',
    broadcast_group_id: null,
    broadcast_answer_mode: 'first_answer',
    broadcast_batch_status: BATCH_COLLECTING,
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

describe('broadcast-resolution formatters', () => {
  it('formats decided, majority, and conflict replies', () => {
    expect(formatBroadcastDecidedReply('Approve', 'slack-ops')).toBe(
      'Broadcast decided: Approve (answered on slack-ops)',
    )
    expect(formatBroadcastMajorityReply('Approve')).toBe('Majority decided: Approve')
    expect(formatBroadcastConflictReply()).toBe(
      'Prompt was not processed — channel answers did not agree.',
    )
  })
})

describe('evaluateBroadcastBatch', () => {
  const organizationId = 'org-1'
  const broadcastBatchId = 'brd_test'
  const directAnswer = {
    type: 'option',
    value: 'Approve',
    userId: 42,
    username: 'alice',
  }

  it('first_answer sync-closes siblings and notifies all channels', async () => {
    const answeringChannel = 'slack-ops'
    const otherChannel = 'telegram-alerts'
    const answeredPrompt = siblingRow(answeringChannel, {
      state: ANSWERED,
      answered_at: new Date('2026-01-02'),
      answer: { type: 'option', value: 'Approve', origin: 'direct' },
      broadcast_answer_mode: 'first_answer',
    })
    const siblings = [answeredPrompt, siblingRow(otherChannel)]

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('prompt_num = $3')) {
          return { rows: [answeredPrompt] }
        }
        if (sql.includes('broadcast_batch_id = $2') && sql.includes('ORDER BY')) {
          return { rows: siblings }
        }
        if (sql.includes('UPDATE prompts') && sql.includes('broadcast_sync')) {
          return { rowCount: 1 }
        }
        if (sql.includes('SET broadcast_batch_status')) {
          return { rowCount: 2 }
        }
        return { rows: [], rowCount: 0 }
      }),
    } as unknown as pg.PoolClient

    const result = await evaluateBroadcastBatch(
      client,
      organizationId,
      answeringChannel,
      '#1',
      directAnswer,
    )

    expect(result).not.toBeNull()
    expect(result!.batchStatus).toBe(BATCH_RESOLVED)
    expect(result!.winningValue).toBe('Approve')
    expect(result!.callbackInfo?.payload.broadcast_batch_id).toBe(broadcastBatchId)
    expect(result!.callbackInfo?.payload.broadcast_answer_mode).toBe('first_answer')
    expect(result!.callbackInfo?.payload.broadcast_batch_status).toBe(BATCH_RESOLVED)
    expect(result!.notifications).toHaveLength(2)
    expect(result!.notifications.find((n) => n.channelId === answeringChannel)?.skipPost).toBe(true)
    expect(result!.notifications.find((n) => n.channelId === otherChannel)?.message).toContain(
      'Broadcast decided: Approve',
    )
  })

  it('all_answer_same stays collecting until every channel answers', async () => {
    const channelA = 'slack-ops'
    const answeredPrompt = siblingRow(channelA, {
      state: ANSWERED,
      answered_at: new Date('2026-01-02'),
      answer: { type: 'option', value: 'Approve', origin: 'direct' },
      broadcast_answer_mode: 'all_answer_same',
    })
    const siblings = [answeredPrompt, siblingRow('telegram-alerts')]

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('prompt_num = $3')) {
          return { rows: [answeredPrompt] }
        }
        if (sql.includes('ORDER BY channel_id')) {
          return { rows: siblings }
        }
        if (sql.includes('SET broadcast_batch_status')) {
          return { rowCount: 2 }
        }
        return { rows: [], rowCount: 0 }
      }),
    } as unknown as pg.PoolClient

    const result = await evaluateBroadcastBatch(
      client,
      organizationId,
      channelA,
      '#1',
      directAnswer,
    )

    expect(result!.batchStatus).toBe(BATCH_COLLECTING)
    expect(result!.callbackInfo).toBeNull()
    expect(result!.notifications).toHaveLength(0)
  })

  it('all_answer_same conflict notifies all when answers disagree', async () => {
    const channelA = 'slack-ops'
    const channelB = 'telegram-alerts'
    const answeredA = siblingRow(channelA, {
      state: ANSWERED,
      answer: { type: 'option', value: 'Approve', origin: 'direct' },
      broadcast_answer_mode: 'all_answer_same',
    })
    const answeredB = siblingRow(channelB, {
      prompt_num: 2,
      state: ANSWERED,
      answer: { type: 'option', value: 'Reject', origin: 'direct' },
      broadcast_answer_mode: 'all_answer_same',
    })
    const siblings = [answeredA, answeredB]

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('prompt_num = $3')) {
          return { rows: [answeredB] }
        }
        if (sql.includes('ORDER BY channel_id')) {
          return { rows: siblings }
        }
        if (sql.includes('SET broadcast_batch_status')) {
          return { rowCount: 2 }
        }
        return { rows: [], rowCount: 0 }
      }),
    } as unknown as pg.PoolClient

    const result = await evaluateBroadcastBatch(client, organizationId, channelB, '#2', {
      type: 'option',
      value: 'Reject',
      userId: 99,
      username: 'bob',
    })

    expect(result!.batchStatus).toBe(BATCH_CONFLICT)
    expect(result!.callbackInfo).toBeNull()
    expect(result!.notifications).toHaveLength(2)
    expect(result!.notifications[0].message).toContain('did not agree')
  })

  it('all_answer_majority resolves when strict majority exists', async () => {
    const channels = ['slack-ops', 'telegram-alerts', 'discord-ops']
    const answeredA = siblingRow(channels[0], {
      state: ANSWERED,
      answer: { type: 'option', value: 'Approve', origin: 'direct' },
      broadcast_answer_mode: 'all_answer_majority',
    })
    const answeredB = siblingRow(channels[1], {
      prompt_num: 2,
      state: ANSWERED,
      answer: { type: 'option', value: 'Approve', origin: 'direct' },
      broadcast_answer_mode: 'all_answer_majority',
    })
    const pendingC = siblingRow(channels[2], {
      prompt_num: 3,
      broadcast_answer_mode: 'all_answer_majority',
    })
    const siblings = [answeredA, answeredB, pendingC]

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('prompt_num = $3')) {
          return { rows: [answeredB] }
        }
        if (sql.includes('ORDER BY channel_id')) {
          return { rows: siblings }
        }
        if (sql.includes('broadcast_sync')) {
          return { rowCount: 1 }
        }
        if (sql.includes('SET broadcast_batch_status')) {
          return { rowCount: 3 }
        }
        return { rows: [], rowCount: 0 }
      }),
    } as unknown as pg.PoolClient

    const result = await evaluateBroadcastBatch(
      client,
      organizationId,
      channels[1],
      '#2',
      directAnswer,
    )

    expect(result!.batchStatus).toBe(BATCH_RESOLVED)
    expect(result!.winningValue).toBe('Approve')
    expect(result!.callbackInfo).not.toBeNull()
    expect(result!.notifications).toHaveLength(3)
    expect(result!.notifications[0].message).toContain('Majority decided')
  })

  it('returns null when prompt has no broadcast batch', async () => {
    const prompt = siblingRow('slack-ops', {
      broadcast_batch_id: null,
      broadcast_answer_mode: null,
    })
    const client = {
      query: vi.fn(async () => ({ rows: [prompt] })),
    } as unknown as pg.PoolClient

    const result = await evaluateBroadcastBatch(
      client,
      organizationId,
      'slack-ops',
      '#1',
      directAnswer,
    )
    expect(result).toBeNull()
  })
})
