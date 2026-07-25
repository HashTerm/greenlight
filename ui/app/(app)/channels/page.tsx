import Link from 'next/link'
import { fetchChannels } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function ChannelsPage() {
  const channels = await fetchChannels().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Channels</h1>
          <p className="text-sm text-neutral-500">{channels.length} registered</p>
        </div>
        <Button asChild>
          <Link href="/channels/new">Add channel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All channels</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel ID</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Target chat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((c) => (
                <TableRow key={c.channel_id}>
                  <TableCell>
                    <Link
                      href={`/channels/${encodeURIComponent(c.channel_id)}`}
                      className="font-medium underline"
                    >
                      {c.channel_id}
                    </Link>
                  </TableCell>
                  <TableCell>{c.platform}</TableCell>
                  <TableCell className="font-mono text-xs">{c.target_chat_id}</TableCell>
                  <TableCell>{c.channel_type}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'success' : 'destructive'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
