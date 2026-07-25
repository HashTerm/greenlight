import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prompts.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Link href={`/prompts/${encodeURIComponent(p.id)}`} className="underline">
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
            <TableCell className="font-mono text-xs">{p.chat_id}</TableCell>
            <TableCell className="text-xs text-neutral-500">
              {new Date(p.created_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
