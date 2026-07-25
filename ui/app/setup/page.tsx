export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getUserCount, setupAdmin } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SetupPage() {
  const count = await getUserCount()
  if (count > 0) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Greenlight Setup</CardTitle>
          <CardDescription>Create the first admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setupAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">
              Create admin
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="text-neutral-900 underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
