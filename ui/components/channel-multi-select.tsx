'use client'

import { useState } from 'react'

import { PlatformIcon } from '@/components/platform-icon'
import { Label } from '@/components/ui/label'
import { getPlatformBrand } from '@/lib/brand-icons'
import type { Platform } from '@/lib/platform-fields'

type ChannelOption = {
  channel_id: string
  platform: string
}

type ChannelMultiSelectProps = {
  channels: ChannelOption[]
  id?: string
  onSelectionChange?: (channelIds: string[]) => void
}

function formatChannelLabel(channel: ChannelOption) {
  const { label } = getPlatformBrand(channel.platform as Platform)
  return `${channel.channel_id} · ${label}`
}

export function ChannelMultiSelect({
  channels,
  id,
  onSelectionChange,
}: ChannelMultiSelectProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    channels[0] ? [channels[0].channel_id] : [],
  )

  function toggleChannel(channelId: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((item) => item !== channelId)
        : [...prev, channelId]
      onSelectionChange?.(next)
      return next
    })
  }

  if (!channels.length) {
    return <p className="text-sm text-muted-foreground">No channels available.</p>
  }

  return (
    <div className="space-y-2" id={id}>
      {channels.map((channel) => {
        const { iconSvg } = getPlatformBrand(channel.platform as Platform)
        const checked = selectedIds.includes(channel.channel_id)

        return (
          <label
            key={channel.channel_id}
            className="flex items-center gap-2 rounded-md border p-2 text-sm"
          >
            <input
              checked={checked}
              name="channel_ids"
              type="checkbox"
              value={channel.channel_id}
              onChange={() => toggleChannel(channel.channel_id)}
            />
            <PlatformIcon iconSvg={iconSvg} />
            {formatChannelLabel(channel)}
          </label>
        )
      })}
      <Label className="text-xs text-muted-foreground">
        Select one or more channels. Multiple selections fan out with a shared broadcast_batch_id.
      </Label>
    </div>
  )
}
