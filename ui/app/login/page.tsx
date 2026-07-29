export const dynamic = 'force-dynamic'

import { getUserCount, loginAction } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function LoginPage() {
  const count = await getUserCount()
  if (count === 0) redirect('/setup')

  return (
    <AuthLayout subtitle="Sign in to manage your gateway" title="Welcome back">
      <Card>
        <CardContent className="pt-6">
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
