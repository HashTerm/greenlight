import { describe, expect, it } from 'vitest'
import { generateApiKeyMaterial, hashApiKey } from '../src/services/api-keys/models.js'
import { bootstrapApiKeyFromEnv } from '../src/services/api-keys/bootstrap.js'

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
  it('is exported and callable', async () => {
    await expect(bootstrapApiKeyFromEnv()).resolves.toBeUndefined()
  })
})
