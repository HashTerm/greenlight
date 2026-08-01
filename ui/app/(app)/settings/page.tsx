import { Server } from 'lucide-react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { fetchStatus } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  account: '/settings/account',
  'api-keys': '/settings/api-keys',
  retention: '/settings/retention',
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await connection()
  const { tab: tabParam } = await searchParams

  if (tabParam) {
    const redirectTo = LEGACY_TAB_REDIRECTS[tabParam]
    if (redirectTo) {
      redirect(redirectTo)
    }
  }

  const status = await fetchStatus().catch(() => null)
  const connected = status?.status === 'ok' && status.database === 'ok'

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardSectionTitle icon={Server}>Greenlight API</CardSectionTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">API URL:</span>{' '}
          {process.env.GREENLIGHT_API_URL ?? 'http://localhost:8100'}
        </p>
        <p>
          <span className="text-muted-foreground">Public webhook base:</span>{' '}
          {process.env.PUBLIC_WEBHOOK_URL ?? 'not set'}
        </p>
        <p>
          <span className="text-muted-foreground">Health check:</span>{' '}
          {connected ? 'Connected' : 'Unreachable'}
        </p>
      </CardContent>
    </Card>
  )
}
