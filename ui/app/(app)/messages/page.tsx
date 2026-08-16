import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Inbox, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fetchMessages } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { DashboardEmptyMessage } from '@/components/dashboard-empty-message'
import { MessagesTable } from '@/components/messages-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const CARD_TITLES = {
  all: 'All messages',
  inbound: 'Inbound messages',
  outbound: 'Outbound messages',
} as const

const CARD_ICONS: Record<keyof typeof CARD_TITLES, LucideIcon> = {
  all: Inbox,
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
}

const EMPTY_MESSAGES = {
  all: 'No messages yet.',
  inbound: 'No inbound messages.',
  outbound: 'No outbound messages.',
} as const

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; broadcast_batch_id?: string }>
}) {
  const { direction = 'all', broadcast_batch_id = '' } = await searchParams
  const validDirection = ['inbound', 'outbound', 'all'].includes(direction)
    ? (direction as 'inbound' | 'outbound' | 'all')
    : 'all'

  const messages = await fetchMessages(validDirection, undefined, broadcast_batch_id || undefined).catch(
    () => [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          broadcast_batch_id
            ? `Filtered by broadcast batch ${broadcast_batch_id}`
            : 'Inbound and outbound MESSAGE channel history'
        }
        icon={MessageSquare}
        title="Messages"
        actions={
          <Button asChild>
            <Link href="/messages/send">Send message</Link>
          </Button>
        }
      />

      <Tabs defaultValue={validDirection}>
        <TabsList>
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'inbound', label: 'Inbound' },
              { value: 'outbound', label: 'Outbound' },
            ] as const
          ).map(({ value, label }) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link href={`/messages?direction=${value}`}>{label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={validDirection}>
          <Card>
            <CardHeader>
              <CardSectionTitle icon={CARD_ICONS[validDirection]}>
                {CARD_TITLES[validDirection]}
              </CardSectionTitle>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <MessagesTable messages={messages} />
              ) : (
                <DashboardEmptyMessage>{EMPTY_MESSAGES[validDirection]}</DashboardEmptyMessage>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
