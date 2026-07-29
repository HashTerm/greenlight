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

type MessageChannel = {
  channel_id: string
  platform: string
}

function formatChannelLabel(channel: MessageChannel) {
  const { label } = getPlatformBrand(channel.platform as Platform)
  return `${channel.channel_id} · ${label}`
}

type MessageChannelSelectProps = {
  channels: MessageChannel[]
  defaultValue?: string
  id?: string
  name: string
}

export function MessageChannelSelect({
  channels,
  defaultValue,
  id,
  name,
}: MessageChannelSelectProps) {
  const [value, setValue] = useState(defaultValue ?? channels[0]?.channel_id ?? '')

  if (!channels.length) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue placeholder="No MESSAGE channels available" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <Select onValueChange={setValue} value={value}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select MESSAGE channel" />
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
