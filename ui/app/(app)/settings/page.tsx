import { Archive, KeyRound, Server, Settings } from 'lucide-react'
import { ApiKeysSection } from '@/components/api-keys-section'
import { changePassword, fetchApiKeys, fetchRetentionSettings } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { PageHeader } from '@/components/page-header'
import { RetentionSettingsForm } from '@/components/retention-settings-form'
import { DEFAULT_RETENTION_SETTINGS, healthCheck } from '@/lib/greenlight-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  const [health, retentionResult, apiKeysResult] = await Promise.all([
    healthCheck().catch(() => ({ status: 'error' })),
    fetchRetentionSettings()
      .then((settings) => ({ settings, error: null as string | null }))
      .catch((err: Error) => ({
        settings: {
          ...DEFAULT_RETENTION_SETTINGS,
          updated_at: new Date(0).toISOString(),
        },
        error: err.message,
      })),
    fetchApiKeys()
      .then((keys) => ({ keys, error: null as string | null }))
      .catch((err: Error) => ({ keys: [], error: err.message })),
  ])

  const { settings: retention, error: retentionError } = retentionResult
  const { keys: apiKeys, error: apiKeysError } = apiKeysResult

  return (
    <div className="space-y-6">
      <PageHeader
        description="Connectivity, data retention, and account"
        icon={Settings}
        title="Settings"
      />

      <Card>
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
            {health.status === 'ok' ? 'Connected' : 'Unreachable'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardSectionTitle icon={Archive}>Data retention</CardSectionTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {retentionError && (
            <p className="text-sm text-destructive">
              Could not load saved settings ({retentionError}). Showing defaults — save after the
              API is reachable.
            </p>
          )}
          <RetentionSettingsForm initial={retention} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardSectionTitle icon={KeyRound}>API keys</CardSectionTitle>
        </CardHeader>
        <CardContent>
          <ApiKeysSection error={apiKeysError} initialKeys={apiKeys} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardSectionTitle icon={KeyRound}>Change password</CardSectionTitle>
        </CardHeader>
        <CardContent>
          <form action={changePassword} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input id="current_password" name="current_password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input id="new_password" name="new_password" type="password" minLength={8} required />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
