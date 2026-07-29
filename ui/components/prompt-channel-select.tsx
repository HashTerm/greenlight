'use client'

import { useState } from 'react'

import { PlatformIcon } from '@/components/platform-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPlatformBrand } from '@/lib/brand-icons'
import type { Platform } from '@/lib/platform-fields'

type PromptChannel = {
  channel_id: string
  platform: string
}

function formatChannelLabel(channel: PromptChannel) {
  const { label } = getPlatformBrand(channel.platform as Platform)
  return `${channel.channel_id} · ${label}`
}

type PromptChannelSelectProps = {
  channels: PromptChannel[]
  defaultValue?: string
  id?: string
  name: string
  onValueChange?: (channelId: string) => void
}

export function PromptChannelSelect({
  channels,
  defaultValue,
  id,
  name,
  onValueChange,
}: PromptChannelSelectProps) {
  const [value, setValue] = useState(defaultValue ?? channels[0]?.channel_id ?? '')

  const handleValueChange = (channelId: string) => {
    setValue(channelId)
    onValueChange?.(channelId)
  }

  if (!channels.length) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue placeholder="No PROMPT channels available" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select PROMPT channel" />
        </SelectTrigger>
        <SelectContent>
          {channels.map((channel) => {
            const { iconSvg } = getPlatformBrand(channel.platform as Platform)

            return (
              <SelectItem key={channel.channel_id} value={channel.channel_id}>
                <PlatformIcon iconSvg={iconSvg} />
                {formatChannelLabel(channel)}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </>
  )
}
