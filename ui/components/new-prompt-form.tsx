'use client'

import Link from 'next/link'
import { useState } from 'react'

import { createPromptAction } from '@/lib/actions'
import { PromptChannelSelect } from '@/components/prompt-channel-select'
import { PromptComposeFields } from '@/components/prompt-compose-fields'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Channel } from '@/lib/greenlight-client'
import { maxPromptOptionLabelsForPlatform } from '@/lib/prompt-options'
import type { Platform } from '@/lib/platform-fields'

type NewPromptFormProps = {
  channels: Channel[]
  hasPromptChannels: boolean
}

export function NewPromptForm({ channels, hasPromptChannels }: NewPromptFormProps) {
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.channel_id ?? '')
  const [allowText, setAllowText] = useState(false)
  const [optionsOverLimit, setOptionsOverLimit] = useState(false)

  const selectedChannel = channels.find((channel) => channel.channel_id === selectedChannelId)
  const platform = (selectedChannel?.platform as Platform | undefined) ?? null
  const maxOptions = maxPromptOptionLabelsForPlatform(platform, allowText)

  return (
    <form action={createPromptAction} className="space-y-4">
      <div className="space-y-2">
        <Label>PROMPT channel</Label>
        <PromptChannelSelect
          channels={channels}
          defaultValue={selectedChannelId}
          id="channel_id"
          name="channel_id"
          onValueChange={setSelectedChannelId}
        />
        {!channels.length && (
          <p className="text-sm text-muted-foreground">
            No PROMPT channels.{' '}
            <Link href="/channels/add" className="text-primary hover:underline">
              Register one
            </Link>
          </p>
        )}
      </div>
      <PromptComposeFields
        allowText={allowText}
        maxOptions={maxOptions}
        onAllowTextChange={setAllowText}
        onOverLimitChange={setOptionsOverLimit}
        platform={platform}
      />
      <Button disabled={!hasPromptChannels || optionsOverLimit} type="submit">
        Create prompt
      </Button>
    </form>
  )
}
