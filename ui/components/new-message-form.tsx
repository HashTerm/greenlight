'use client'

import Link from 'next/link'

import { createMessageAction } from '@/lib/actions'
import { MessageChannelSelect } from '@/components/message-channel-select'
import { MessageComposeFields } from '@/components/message-compose-fields'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Channel } from '@/lib/greenlight-client'

type NewMessageFormProps = {
  channels: Channel[]
  hasMessageChannels: boolean
}

export function NewMessageForm({ channels, hasMessageChannels }: NewMessageFormProps) {
  return (
    <form action={createMessageAction} className="space-y-4">
      <div className="space-y-2">
        <Label>MESSAGE channel</Label>
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
      <MessageComposeFields />
      <Button disabled={!hasMessageChannels} type="submit">
        Deliver
      </Button>
    </form>
  )
}
