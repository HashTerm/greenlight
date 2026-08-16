import { describe, expect, it } from 'vitest'
import {
  expandPreset,
  hasAnyScope,
  hasScope,
  normalizeScopes,
} from '../src/services/api-keys/scopes.js'

describe('api key scopes', () => {
  it('admin wildcard grants any scope', () => {
    expect(hasScope(['admin'], 'settings:write')).toBe(true)
    expect(hasScope(['admin'], 'keys:write')).toBe(true)
  })

  it('checks explicit scopes', () => {
    expect(hasScope(['messages:read'], 'messages:read')).toBe(true)
    expect(hasScope(['messages:read'], 'messages:send')).toBe(false)
  })

  it('hasAnyScope requires one match', () => {
    expect(hasAnyScope(['channels:read'], ['channels:read', 'channels:write'])).toBe(true)
    expect(hasAnyScope(['messages:read'], ['channels:read', 'channels:write'])).toBe(false)
  })

  it('expands presets', () => {
    expect(expandPreset('admin')).toEqual(['admin'])
    expect(expandPreset('agent')).toEqual([
      'prompts:read',
      'prompts:write',
      'messages:read',
      'messages:send',
      'channels:read',
      'channels:write',
    ])
    expect(expandPreset('agent')).not.toContain('settings:write')
    expect(expandPreset('readonly')).toContain('status:read')
    expect(expandPreset('readonly')).not.toContain('messages:send')
  })

  it('rejects invalid scopes', () => {
    expect(() => normalizeScopes(['not-a-scope'])).toThrow(/Invalid scope/)
  })

  it('accepts broadcast group and batch scopes', () => {
    expect(
      normalizeScopes(['broadcast_groups:read', 'broadcast_groups:write', 'broadcast_batches:read']),
    ).toEqual(['broadcast_groups:read', 'broadcast_groups:write', 'broadcast_batches:read'])
    expect(hasScope(['broadcast_batches:read'], 'broadcast_batches:read')).toBe(true)
    expect(hasScope(['broadcast_groups:read'], 'broadcast_groups:write')).toBe(false)
  })
})
