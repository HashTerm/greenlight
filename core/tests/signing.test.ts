import { describe, expect, it, beforeEach } from 'vitest'
import { signBody, verifySignature } from '../src/core/signing.js'
import { resetConfigForTests } from '../src/core/config.js'

describe('signing', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
    process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
    process.env.WEBHOOK_SECRET = 'webhook-secret-value'
    resetConfigForTests()
  })

  it('signs and verifies callback bodies', () => {
    const body = JSON.stringify({ prompt_id: '#1', answer: { type: 'option' } })
    const signature = signBody(body)
    expect(signature.startsWith('sha256=')).toBe(true)
    expect(verifySignature(body, signature)).toBe(true)
    expect(verifySignature(body, 'sha256=deadbeef')).toBe(false)
  })
})
