import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Database,
  LayoutDashboard,
  List,
  MessageCircleQuestion,
  MessageSquare,
  PieChart,
  Plus,
  Radio,
  TrendingUp,
} from 'lucide-react'
import { fetchChannels, fetchPrompts, fetchStatus } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { DashboardEmptyMessage } from '@/components/dashboard-empty-message'
import { PageHeader } from '@/components/page-header'
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

const statCards = [
  {
    label: 'Database',
    icon: Database,
    value: (status: Awaited<ReturnType<typeof fetchStatus>> | null) =>
      status?.database === 'ok' ? 'Healthy' : 'Error',
  },
  {
    label: 'Active channels',
    icon: Radio,
    value: (status: Awaited<ReturnType<typeof fetchStatus>> | null) =>
      status?.channels_active ?? '—',
  },
  {
    label: 'Pending prompts',
    icon: Clock,
    value: (status: Awaited<ReturnType<typeof fetchStatus>> | null) =>
      status?.prompts_pending ?? '—',
  },
  {
    label: 'Answered (24h)',
    icon: CheckCircle2,
    value: (status: Awaited<ReturnType<typeof fetchStatus>> | null) =>
      status?.prompts_answered_24h ?? '—',
  },
] as const

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
      <PageHeader
        description="Gateway health and activity"
        icon={LayoutDashboard}
        title="Dashboard"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/channels/add">
                <Plus className="size-4" />
                Add channel
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/messages/send">
                <MessageSquare className="size-4" />
                Send message
              </Link>
            </Button>
            <Button asChild>
              <Link href="/prompts/new">
                <MessageCircleQuestion className="size-4" />
                New prompt
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map(({ label, icon: Icon, value }) => (
          <Card key={label}>
            <CardHeader className="gap-1 p-4">
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">{value(status)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSectionTitle icon={PieChart}>Platform breakdown</CardSectionTitle>
          </CardHeader>
          <CardContent>
            <PlatformChart data={status?.platforms ?? {}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardSectionTitle icon={TrendingUp}>Prompt activity (14 days)</CardSectionTitle>
          </CardHeader>
          <CardContent>
            <PromptStatsChart prompts={prompts} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSectionTitle icon={List}>Recent prompts</CardSectionTitle>
          </CardHeader>
          <CardContent>
            {recentPrompts.length > 0 ? (
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
                        <Link
                          href={`/prompts/${encodeURIComponent(p.id)}`}
                          className="text-primary hover:underline"
                        >
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
            ) : (
              <DashboardEmptyMessage>No recent prompts.</DashboardEmptyMessage>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSectionTitle icon={Radio}>Recent channels</CardSectionTitle>
          </CardHeader>
          <CardContent>
            {recentChannels.length > 0 ? (
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
                          className="text-primary hover:underline"
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
            ) : (
              <DashboardEmptyMessage>No recent channels.</DashboardEmptyMessage>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
