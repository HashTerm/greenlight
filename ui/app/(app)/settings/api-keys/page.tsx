import { KeyRound } from 'lucide-react'
import { connection } from 'next/server'
import { ApiKeysSection } from '@/components/api-keys-section'
import { fetchApiKeys } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function ApiKeysSettingsPage() {
  await connection()
  const result = await fetchApiKeys()
    .then((keys) => ({ keys, error: null as string | null }))
    .catch((err: Error) => ({ keys: [], error: err.message }))

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardSectionTitle icon={KeyRound}>API keys</CardSectionTitle>
      </CardHeader>
      <CardContent>
        <ApiKeysSection error={result.error} initialKeys={result.keys} />
      </CardContent>
    </Card>
  )
}

export const metadata = {
  title: 'API keys',
}
