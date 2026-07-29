import Link from 'next/link'
import { CheckCircle2, Clock, List, MessageCircleQuestion, TimerOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fetchPrompts } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { DashboardEmptyMessage } from '@/components/dashboard-empty-message'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { PromptsTable } from '@/components/prompts-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const CARD_TITLES = {
  pending: 'Pending prompts',
  answered: 'Answered prompts',
  expired: 'Expired prompts',
  all: 'All prompts',
} as const

const CARD_ICONS: Record<keyof typeof CARD_TITLES, LucideIcon> = {
  pending: Clock,
  answered: CheckCircle2,
  expired: TimerOff,
  all: List,
}

const EMPTY_MESSAGES = {
  pending: 'No pending prompts.',
  answered: 'No answered prompts.',
  expired: 'No expired prompts.',
  all: 'No prompts.',
} as const

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>
}) {
  const { state = 'all', q = '' } = await searchParams
  const validState = ['pending', 'answered', 'expired', 'all'].includes(state)
    ? (state as 'pending' | 'answered' | 'expired' | 'all')
    : 'all'

  const prompts = await fetchPrompts(validState).catch(() => [])
  const filtered = q
    ? prompts.filter((p) => p.correlation_id?.includes(q) || p.id.includes(q))
    : prompts

  const emptyMessage = q ? 'No prompts match this filter.' : EMPTY_MESSAGES[validState]

  return (
    <div className="space-y-6">
      <PageHeader
        description="History across all states"
        icon={MessageCircleQuestion}
        title="Prompts"
        actions={
          <Button asChild>
            <Link href="/prompts/new">New prompt</Link>
          </Button>
        }
      />

      <Tabs defaultValue={validState}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            {(
              [
                { value: 'pending', label: 'Pending' },
                { value: 'answered', label: 'Answered' },
                { value: 'expired', label: 'Expired' },
                { value: 'all', label: 'All' },
              ] as const
            ).map(({ value, label }) => (
              <TabsTrigger key={value} value={value} asChild>
                <Link href={`/prompts?state=${value}${q ? `&q=${q}` : ''}`}>{label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
          <form className="w-full sm:w-auto" method="get">
            <input name="state" type="hidden" value={validState} />
            <Input
              className="w-full sm:max-w-sm"
              defaultValue={q}
              name="q"
              placeholder="Filter by correlation_id or id"
            />
          </form>
        </div>
        <TabsContent value={validState}>
          <Card>
            <CardHeader>
              <CardSectionTitle icon={CARD_ICONS[validState]}>
                {CARD_TITLES[validState]}
              </CardSectionTitle>
            </CardHeader>
            <CardContent>
              {filtered.length > 0 ? (
                <PromptsTable prompts={filtered} />
              ) : (
                <DashboardEmptyMessage>{emptyMessage}</DashboardEmptyMessage>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
