import Link from 'next/link'
import { logoutAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/channels', label: 'Channels' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/settings', label: 'Settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="flex w-full items-center justify-between px-6 py-3 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold">
              Greenlight Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="w-full px-6 py-6 lg:px-8">{children}</main>
    </div>
  )
}
