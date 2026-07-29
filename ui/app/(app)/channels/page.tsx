import Link from 'next/link'
import { Radio } from 'lucide-react'
import { fetchChannels } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { DashboardEmptyMessage } from '@/components/dashboard-empty-message'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
      <PageHeader
        description={`${channels.length} registered`}
        icon={Radio}
        title="Channels"
        actions={
          <Button asChild>
            <Link href="/channels/add">Add channel</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardSectionTitle icon={Radio}>All channels</CardSectionTitle>
        </CardHeader>
        <CardContent>
          {channels.length > 0 ? (
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
                        className="font-medium text-primary hover:underline"
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
          ) : (
            <DashboardEmptyMessage>No channels registered.</DashboardEmptyMessage>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
