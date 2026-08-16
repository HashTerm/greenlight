import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BroadcastGroupIdLink, BroadcastIdLink } from '@/components/broadcast-group-link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Prompt } from '@/lib/greenlight-client'

export function PromptsTable({ prompts }: { prompts: Prompt[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Text</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Correlation</TableHead>
          <TableHead>Batch</TableHead>
          <TableHead>Group</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prompts.map((p) => (
          <TableRow key={`${p.channel_id}-${p.id}`}>
            <TableCell>
              <Link
                href={`/prompts/${encodeURIComponent(p.channel_id)}/${encodeURIComponent(p.id)}`}
                className="text-primary hover:underline"
              >
                {p.id}
              </Link>
            </TableCell>
            <TableCell className="max-w-md truncate">{p.text}</TableCell>
            <TableCell>
              <Badge
                variant={
                  p.state === 'ANSWERED' ? 'success' : p.state === 'PENDING' ? 'warning' : 'default'
                }
              >
                {p.state}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">{p.channel_id}</TableCell>
            <TableCell className="max-w-[8rem] truncate text-xs text-muted-foreground">
              {p.correlation_id ?? '—'}
            </TableCell>
            <TableCell>
              <BroadcastIdLink broadcastBatchId={p.broadcast_batch_id} />
            </TableCell>
            <TableCell>
              <BroadcastGroupIdLink broadcastGroupId={p.broadcast_group_id} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(p.created_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
