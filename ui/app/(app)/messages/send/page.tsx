import { MessageSquare } from 'lucide-react'
import { fetchChannels } from '@/lib/actions'
import { NewMessageForm } from '@/components/new-message-form'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SendMessagePage() {
  const channels = await fetchChannels().catch(() => [])
  const messageChannels = channels.filter((c) => c.channel_type === 'MESSAGE')
  const hasMessageChannels = messageChannels.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        description="Send a plain text message to a registered MESSAGE channel"
        icon={MessageSquare}
        title="Send message"
      />

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
