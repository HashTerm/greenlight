import { changePassword } from '@/lib/actions'
import { healthCheck } from '@/lib/greenlight-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  const health = await healthCheck().catch(() => ({ status: 'error' }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-500">Connectivity and account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Greenlight API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-neutral-500">API URL:</span>{' '}
            {process.env.GREENLIGHT_API_URL ?? 'http://localhost:8100'}
          </p>
          <p>
            <span className="text-neutral-500">Public webhook base:</span>{' '}
            {process.env.PUBLIC_WEBHOOK_URL ?? 'not set'}
          </p>
          <p>
            <span className="text-neutral-500">Health check:</span>{' '}
            {health.status === 'ok' ? 'Connected' : 'Unreachable'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
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
