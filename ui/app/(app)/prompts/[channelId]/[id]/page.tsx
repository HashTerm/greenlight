import { notFound } from 'next/navigation'
import { fetchPrompt } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ channelId: string; id: string }>
}) {
  const { channelId, id } = await params
  const prompt = await fetchPrompt(id, channelId).catch(() => null)
  if (!prompt) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1>{prompt.id}</h1>
        <p className="text-sm text-muted-foreground">
          <Badge
            variant={
              prompt.state === 'ANSWERED'
                ? 'success'
                : prompt.state === 'PENDING'
                  ? 'warning'
                  : 'default'
            }
          >
            {prompt.state}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{prompt.text}</p>
            {prompt.media_url && (
              <p>
                <span className="text-muted-foreground">Media:</span>{' '}
                <a
                  href={prompt.media_url}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {prompt.media_url}
                </a>
              </p>
            )}
            {prompt.options?.length ? (
              <div>
                <p className="text-muted-foreground">Options</p>
                <ul className="list-disc pl-5">
                  {prompt.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p>
              <span className="text-muted-foreground">Allow text:</span> {String(prompt.allow_text)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Channel:</span> {prompt.channel_id}
            </p>
            <p>
              <span className="text-muted-foreground">Chat ID:</span> {prompt.chat_id}
            </p>
            <p>
              <span className="text-muted-foreground">Correlation:</span>{' '}
              {prompt.correlation_id ?? '—'}
            </p>
            {prompt.callback_data != null && (
              <div>
                <p className="text-muted-foreground">Callback data</p>
                <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(prompt.callback_data, null, 2)}
                </pre>
              </div>
            )}
            {prompt.callback_headers_configured && (
              <p>
                <span className="text-muted-foreground">Callback headers:</span> configured
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Callback:</span>{' '}
              {prompt.callback_url ? `${prompt.callback_url.slice(0, 32)}…` : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{' '}
              {new Date(prompt.created_at).toLocaleString()}
            </p>
            <p>
              <span className="text-muted-foreground">Expires:</span>{' '}
              {prompt.expires_at ? new Date(prompt.expires_at).toLocaleString() : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Answered:</span>{' '}
              {prompt.answered_at ? new Date(prompt.answered_at).toLocaleString() : '—'}
            </p>
          </CardContent>
        </Card>

        {prompt.answer && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Type:</span> {prompt.answer.type}
              </p>
              <p>
                <span className="text-muted-foreground">Value:</span> {prompt.answer.value}
              </p>
              <p>
                <span className="text-muted-foreground">By:</span>{' '}
                {prompt.answered_by_username ?? prompt.answered_by_id ?? '—'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
