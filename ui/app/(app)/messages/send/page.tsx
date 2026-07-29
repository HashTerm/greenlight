import { fetchChannels } from '@/lib/actions'
import { NewMessageForm } from '@/components/new-message-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SendMessagePage() {
  const channels = await fetchChannels().catch(() => [])
  const messageChannels = channels.filter((c) => c.channel_type === 'MESSAGE')
  const hasMessageChannels = messageChannels.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1>Send message</h1>
        <p className="text-sm text-muted-foreground">
          Send a plain text message to a registered MESSAGE channel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send message</CardTitle>
        </CardHeader>
        <CardContent>
          <NewMessageForm channels={messageChannels} hasMessageChannels={hasMessageChannels} />
        </CardContent>
      </Card>
    </div>
  )
}
