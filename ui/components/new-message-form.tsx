'use client'

import Link from 'next/link'

import { createMessageAction } from '@/lib/actions'
import { MessageChannelSelect } from '@/components/message-channel-select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MESSAGE_TEXT_PLACEHOLDER } from '@/lib/form-placeholders'
import type { Channel } from '@/lib/greenlight-client'

type NewMessageFormProps = {
  channels: Channel[]
  hasMessageChannels: boolean
}

export function NewMessageForm({ channels, hasMessageChannels }: NewMessageFormProps) {
  return (
    <form action={createMessageAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="channel_id">MESSAGE channel</Label>
        <MessageChannelSelect channels={channels} id="channel_id" name="channel_id" />
        {!channels.length && (
          <p className="text-sm text-muted-foreground">
            No MESSAGE channels.{' '}
            <Link href="/channels/add" className="text-primary hover:underline">
              Register one
            </Link>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="text">Message</Label>
        <Textarea id="text" name="text" placeholder={MESSAGE_TEXT_PLACEHOLDER} required />
      </div>
      <Button disabled={!hasMessageChannels} type="submit">
        Deliver
      </Button>
    </form>
  )
}
