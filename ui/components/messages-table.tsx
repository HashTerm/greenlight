import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BroadcastGroupIdLink } from '@/components/broadcast-group-link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Message } from '@/lib/greenlight-client'

function MessageBroadcastIdLink({ broadcastId }: { broadcastId: string | null | undefined }) {
  if (!broadcastId) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <Link
      className="font-mono text-xs text-primary hover:underline"
      href={`/messages?broadcast_batch_id=${encodeURIComponent(broadcastId)}`}
    >
      {broadcastId}
    </Link>
  )
}

export function MessagesTable({ messages }: { messages: Message[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>From / API key</TableHead>
          <TableHead>Broadcast</TableHead>
          <TableHead>Group</TableHead>
          <TableHead>Text</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((message) => (
          <TableRow key={message.id}>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </TableCell>
            <TableCell className="font-mono text-xs">{message.channel_id}</TableCell>
            <TableCell>
              <Badge variant={message.direction === 'outbound' ? 'default' : 'secondary'}>
                {message.direction}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {message.direction === 'inbound'
                ? (message.from_user ?? '—')
                : (message.api_key_id ?? '—')}
            </TableCell>
            <TableCell>
              {message.direction === 'outbound' ? (
                <MessageBroadcastIdLink broadcastId={message.broadcast_batch_id} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              {message.direction === 'outbound' ? (
                <BroadcastGroupIdLink broadcastGroupId={message.broadcast_group_id} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="max-w-md">
              <Link
                className="block truncate text-primary hover:underline"
                href={`/messages/${encodeURIComponent(message.id)}`}
              >
                {message.text}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
