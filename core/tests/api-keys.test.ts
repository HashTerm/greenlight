import { describe, expect, it, beforeEach } from 'vitest'
import { generateApiKeyMaterial, hashApiKey } from '../src/services/api-keys/models.js'
import { bootstrapApiKeyFromEnv } from '../src/services/api-keys/bootstrap.js'
import { loadConfig, resetConfigForTests } from '../src/core/config.js'

describe('api key material', () => {
  it('hashes keys deterministically', () => {
    const hash1 = hashApiKey('gl_test_secret')
    const hash2 = hashApiKey('gl_test_secret')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('generates gl_ prefixed keys', () => {
    const material = generateApiKeyMaterial()
    expect(material.plaintext.startsWith('gl_')).toBe(true)
    expect(material.prefix).toBe(material.plaintext.slice(0, 12))
    expect(material.hash).toBe(hashApiKey(material.plaintext))
  })
})

describe('bootstrapApiKeyFromEnv', () => {
  beforeEach(() => {
    resetConfigForTests()
    delete process.env.GREENLIGHT_API_KEY
    process.env.DATABASE_URL = 'postgresql://greenlight:greenlight@localhost:5432/greenlight'
    process.env.CALLBACK_SIGNING_SECRET = 'test-secret-value'
    process.env.WEBHOOK_SECRET = 'webhook-secret-value'
  })

  it('is exported and callable', async () => {
    await expect(bootstrapApiKeyFromEnv()).resolves.toBeUndefined()
  })

  it('reads GREENLIGHT_API_KEY from config when USE_AUTH is false', () => {
    process.env.USE_AUTH = 'false'
    process.env.GREENLIGHT_API_KEY = 'gl_test_bootstrap'
    const config = loadConfig()
    expect(config.GREENLIGHT_API_KEY).toBe('gl_test_bootstrap')
  })
})
