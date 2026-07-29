import { describe, expect, it } from 'vitest'
import { updateRetentionSettings } from '../src/services/settings/service.js'

describe('retention settings', () => {
  it('rejects invalid retention days when enabled', async () => {
    await expect(
      updateRetentionSettings({
        promptsRetentionEnabled: true,
        promptsRetentionDays: 0,
        messagesInboundRetentionEnabled: false,
        messagesOutboundRetentionEnabled: false,
        messagesInboundRetentionDays: 30,
        messagesOutboundRetentionDays: 30,
        messagesInboundZeroRetention: false,
        messagesOutboundZeroRetention: false,
      }),
    ).rejects.toThrow(/Retention days/)
  })

  it('rejects invalid inbound retention days when enabled', async () => {
    await expect(
      updateRetentionSettings({
        promptsRetentionEnabled: false,
        promptsRetentionDays: 30,
        messagesInboundRetentionEnabled: true,
        messagesOutboundRetentionEnabled: false,
        messagesInboundRetentionDays: 0,
        messagesOutboundRetentionDays: 30,
        messagesInboundZeroRetention: false,
        messagesOutboundZeroRetention: false,
      }),
    ).rejects.toThrow(/Retention days/)
  })
})
