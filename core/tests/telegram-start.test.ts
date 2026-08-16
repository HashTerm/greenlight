import { describe, expect, it } from 'vitest'
import { isTelegramPrivateChat, isTelegramStartCommand } from '../src/chat/telegram-start.js'

describe('telegram start helpers', () => {
  describe('isTelegramStartCommand', () => {
    it('matches bare /start variants', () => {
      expect(isTelegramStartCommand('/start')).toBe(true)
      expect(isTelegramStartCommand('/START')).toBe(true)
      expect(isTelegramStartCommand('  /start  ')).toBe(true)
      expect(isTelegramStartCommand('/start@MyBot')).toBe(true)
      expect(isTelegramStartCommand('/start@mybot')).toBe(true)
    })

    it('rejects start with extra text', () => {
      expect(isTelegramStartCommand('/start hello')).toBe(false)
      expect(isTelegramStartCommand('/starting')).toBe(false)
      expect(isTelegramStartCommand('start')).toBe(false)
    })
  })

  describe('isTelegramPrivateChat', () => {
    it('detects private vs group chat ids', () => {
      expect(isTelegramPrivateChat('123456789')).toBe(true)
      expect(isTelegramPrivateChat('-1001234567890')).toBe(false)
      expect(isTelegramPrivateChat('0')).toBe(false)
      expect(isTelegramPrivateChat('not-a-number')).toBe(false)
    })
  })
})
