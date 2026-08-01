import { Archive, KeyRound, Server } from 'lucide-react'
import { connection } from 'next/server'
import { ApiKeysSection } from '@/components/api-keys-section'
import {
  changePassword,
  fetchApiKeys,
  fetchRetentionSettings,
  fetchStatus,
} from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { RetentionSettingsForm } from '@/components/retention-settings-form'
import { DEFAULT_RETENTION_SETTINGS } from '@/lib/greenlight-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'

const COMMUNITY_TABS = new Set(['general', 'account', 'api-keys', 'retention'])

function resolveTab(tabParam: string | undefined) {
  if (tabParam && COMMUNITY_TABS.has(tabParam)) return tabParam
  return 'general'
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await connection()
  const { tab: tabParam } = await searchParams
  const activeTab = resolveTab(tabParam)

  if (activeTab === 'general') {
    const status = await fetchStatus().catch(() => null)
    const connected = status?.status === 'ok' && status.database === 'ok'

    return (
      <TabsContent value="general">
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
              {connected ? 'Connected' : 'Unreachable'}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  if (activeTab === 'retention') {
    const retentionResult = await fetchRetentionSettings()
      .then((settings) => ({ settings, error: null as string | null }))
      .catch((err: Error) => ({
        settings: {
          ...DEFAULT_RETENTION_SETTINGS,
          updated_at: new Date(0).toISOString(),
        },
        error: err.message,
      }))
    const { settings: retention, error: retentionError } = retentionResult

    return (
      <TabsContent value="retention">
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
      </TabsContent>
    )
  }

  if (activeTab === 'api-keys') {
    const apiKeysResult = await fetchApiKeys()
      .then((keys) => ({ keys, error: null as string | null }))
      .catch((err: Error) => ({ keys: [], error: err.message }))
    const { keys: apiKeys, error: apiKeysError } = apiKeysResult

    return (
      <TabsContent value="api-keys">
        <Card>
          <CardHeader>
            <CardSectionTitle icon={KeyRound}>API keys</CardSectionTitle>
          </CardHeader>
          <CardContent>
            <ApiKeysSection error={apiKeysError} initialKeys={apiKeys} />
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="account">
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
              <Input
                id="new_password"
                name="new_password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
