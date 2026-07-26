import Link from 'next/link'
import { logoutAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/channels', label: 'Channels' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/settings', label: 'Settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-foreground">
              Greenlight Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="w-full px-6 py-6 lg:px-8">{children}</main>
    </div>
  )
}
