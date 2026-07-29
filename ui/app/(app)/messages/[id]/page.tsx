import Link from 'next/link'
import { notFound } from 'next/navigation'

import { fetchMessage } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const message = await fetchMessage(id).catch(() => null)
  if (!message) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Message</h1>
          <p className="font-mono text-sm text-muted-foreground">{message.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/messages">Back to messages</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Channel:</span>{' '}
            <Link
              className="text-primary hover:underline"
              href={`/channels/${encodeURIComponent(message.channel_id)}`}
            >
              {message.channel_id}
            </Link>
          </p>
          <p>
            <span className="text-muted-foreground">Platform:</span> {message.platform}
          </p>
          <p>
            <span className="text-muted-foreground">Direction:</span>{' '}
            <Badge variant={message.direction === 'outbound' ? 'default' : 'secondary'}>
              {message.direction}
            </Badge>
          </p>
          {message.direction === 'inbound' && (
            <p>
              <span className="text-muted-foreground">From:</span> {message.from_user ?? '—'}
            </p>
          )}
          {message.direction === 'outbound' && (
            <p>
              <span className="text-muted-foreground">API key:</span> {message.api_key_id ?? '—'}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Created:</span>{' '}
            {new Date(message.created_at).toLocaleString()}
          </p>
          {message.platform_message_id && (
            <p>
              <span className="text-muted-foreground">Platform message ID:</span>{' '}
              {message.platform_message_id}
            </p>
          )}
          <p className="pt-2 whitespace-pre-wrap">{message.text}</p>
        </CardContent>
      </Card>
    </div>
  )
}
