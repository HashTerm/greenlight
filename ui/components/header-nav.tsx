'use client'

import {
  LayoutDashboard,
  MenuIcon,
  MessageCircleQuestion,
  MessageSquare,
  Radio,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { logoutAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/channels', label: 'Channels', icon: Radio },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/prompts', label: 'Prompts', icon: MessageCircleQuestion },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

function isNavLinkActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function HeaderNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <nav className="hidden items-center gap-1 lg:flex">
        {links.map((link) => {
          const active = isNavLinkActive(pathname, link.href)
          const Icon = link.icon
          return (
            <Button
              key={link.href}
              asChild
              className={cn(
                'gap-1.5 text-muted-foreground',
                active && 'bg-hover-surface font-semibold text-foreground',
              )}
              size="sm"
              variant="ghost"
            >
              <Link href={link.href}>
                <Icon className="size-4" />
                {link.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      <form action={logoutAction} className="hidden lg:block">
        <Button className="ml-2" type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>

      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <SheetTrigger asChild>
          <Button aria-label="Open menu" className="lg:hidden" size="icon" variant="ghost">
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col gap-1" side="right">
          <SheetTitle>Menu</SheetTitle>
          {links.map((link) => {
            const active = isNavLinkActive(pathname, link.href)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-hover-surface',
                  active && 'bg-hover-surface font-semibold',
                )}
                href={link.href}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {link.label}
              </Link>
            )
          })}
          <form action={logoutAction} className="mt-2">
            <Button className="w-full" type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
