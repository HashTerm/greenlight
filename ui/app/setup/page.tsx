export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getUserCount, setupAdmin } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SetupPage() {
  const count = await getUserCount()
  if (count > 0) redirect('/login')

  return (
    <AuthLayout subtitle="Create the first admin account" title="Greenlight setup">
      <Card>
        <CardContent className="pt-6">
          <form action={setupAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <Button className="w-full" type="submit">
              Create admin
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="/login"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
