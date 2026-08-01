import { KeyRound } from 'lucide-react'
import { connection } from 'next/server'
import { changePassword } from '@/lib/actions'
import { CardSectionTitle } from '@/components/card-section-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function AccountSettingsPage() {
  await connection()

  return (
    <Card className="mt-2">
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
  )
}

export const metadata = {
  title: 'Account',
}
