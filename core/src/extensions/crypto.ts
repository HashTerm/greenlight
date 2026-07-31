import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(`greenlight-sso:${secret}`).digest()
}

export function encryptSecret(plaintext: string, authSecret: string): string {
  const key = deriveKey(authSecret)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(payload: string, authSecret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format')
  }
  const key = deriveKey(authSecret)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export function getSsoAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.GREENLIGHT_SSO_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET or GREENLIGHT_SSO_ENCRYPTION_SECRET is required for SSO')
  }
  return secret
}
