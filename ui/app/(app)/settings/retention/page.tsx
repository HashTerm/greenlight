import { Archive } from 'lucide-react'
import { connection } from 'next/server'
import { fetchRetentionSettings } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { RetentionSettingsForm } from '@/components/retention-settings-form'
import { DEFAULT_RETENTION_SETTINGS } from '@/lib/greenlight-client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function RetentionSettingsPage() {
  await connection()
  const result = await fetchRetentionSettings()
    .then((settings) => ({ settings, error: null as string | null }))
    .catch((err: Error) => ({
      settings: {
        ...DEFAULT_RETENTION_SETTINGS,
        updated_at: new Date(0).toISOString(),
      },
      error: err.message,
    }))

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardSectionTitle icon={Archive}>Data retention</CardSectionTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.error && (
          <p className="text-sm text-destructive">
            Could not load saved settings ({result.error}). Showing defaults — save after the API is
            reachable.
          </p>
        )}
        <RetentionSettingsForm initial={result.settings} />
      </CardContent>
    </Card>
  )
}

export const metadata = {
  title: 'Retention',
}
