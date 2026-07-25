import { notFound } from 'next/navigation'
import { fetchPrompt } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const prompt = await fetchPrompt(id).catch(() => null)
  if (!prompt) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{prompt.id}</h1>
        <p className="text-sm text-neutral-500">
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
                <span className="text-neutral-500">Media:</span>{' '}
                <a href={prompt.media_url} className="underline" target="_blank" rel="noreferrer">
                  {prompt.media_url}
                </a>
              </p>
            )}
            {prompt.options?.length ? (
              <div>
                <p className="text-neutral-500">Options</p>
                <ul className="list-disc pl-5">
                  {prompt.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p>
              <span className="text-neutral-500">Allow text:</span> {String(prompt.allow_text)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-neutral-500">Channel:</span> {prompt.chat_id}
            </p>
            <p>
              <span className="text-neutral-500">Correlation:</span> {prompt.correlation_id ?? '—'}
            </p>
            <p>
              <span className="text-neutral-500">Callback:</span>{' '}
              {prompt.callback_url ? `${prompt.callback_url.slice(0, 32)}…` : '—'}
            </p>
            <p>
              <span className="text-neutral-500">Created:</span>{' '}
              {new Date(prompt.created_at).toLocaleString()}
            </p>
            <p>
              <span className="text-neutral-500">Expires:</span>{' '}
              {prompt.expires_at ? new Date(prompt.expires_at).toLocaleString() : '—'}
            </p>
            <p>
              <span className="text-neutral-500">Answered:</span>{' '}
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
                <span className="text-neutral-500">Type:</span> {prompt.answer.type}
              </p>
              <p>
                <span className="text-neutral-500">Value:</span> {prompt.answer.value}
              </p>
              <p>
                <span className="text-neutral-500">By:</span>{' '}
                {prompt.answered_by_username ?? prompt.answered_by_id ?? '—'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
