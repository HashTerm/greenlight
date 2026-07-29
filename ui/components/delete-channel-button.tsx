'use client'

import { useState } from 'react'

import { deleteChannelAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function DeleteChannelButton({ channelId }: { channelId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete channel</DialogTitle>
          <DialogDescription>
            This permanently removes the channel and its webhook configuration. This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Cancel
          </Button>
          <form action={deleteChannelAction.bind(null, channelId)}>
            <Button type="submit" variant="destructive">
              Delete channel
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
