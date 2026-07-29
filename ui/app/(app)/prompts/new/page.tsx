import { fetchChannels } from '@/lib/actions'
import { NewPromptForm } from '@/components/new-prompt-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewPromptPage() {
  const channels = await fetchChannels().catch(() => [])
  const promptChannels = channels.filter((c) => c.channel_type === 'PROMPT')
  const hasPromptChannels = promptChannels.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1>New prompt</h1>
        <p className="text-sm text-muted-foreground">
          Send a human-in-the-loop question to a registered PROMPT channel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPromptForm channels={promptChannels} hasPromptChannels={hasPromptChannels} />
        </CardContent>
      </Card>
    </div>
  )
}
