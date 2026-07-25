import Link from 'next/link'
import { fetchChannels, fetchPrompts, fetchStatus } from '@/lib/actions'
import { PlatformChart, PromptStatsChart } from '@/components/charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function DashboardPage() {
  const [status, prompts, channels] = await Promise.all([
    fetchStatus().catch(() => null),
    fetchPrompts('all').catch(() => []),
    fetchChannels().catch(() => []),
  ])

  const recentPrompts = prompts.slice(0, 10)
  const recentChannels = [...channels]
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-500">Gateway health and activity</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/channels/new">Add channel</Link>
          </Button>
          <Button asChild>
            <Link href="/prompts/new">New prompt</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Database</CardDescription>
            <CardTitle className="text-xl">
              {status?.database === 'ok' ? 'Healthy' : 'Error'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active channels</CardDescription>
            <CardTitle className="text-xl">{status?.channels_active ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending prompts</CardDescription>
            <CardTitle className="text-xl">{status?.prompts_pending ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Answered (24h)</CardDescription>
            <CardTitle className="text-xl">{status?.prompts_answered_24h ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformChart data={status?.platforms ?? {}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prompt activity (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptStatsChart prompts={prompts} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Text</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPrompts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/prompts/${encodeURIComponent(p.id)}`} className="underline">
                        {p.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.state === 'ANSWERED'
                            ? 'success'
                            : p.state === 'PENDING'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {p.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{p.text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent channels</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentChannels.map((c) => (
                  <TableRow key={c.channel_id}>
                    <TableCell>
                      <Link
                        href={`/channels/${encodeURIComponent(c.channel_id)}`}
                        className="underline"
                      >
                        {c.channel_id}
                      </Link>
                    </TableCell>
                    <TableCell>{c.platform}</TableCell>
                    <TableCell>{c.channel_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
