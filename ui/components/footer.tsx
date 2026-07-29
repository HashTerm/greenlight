import Link from 'next/link'

import { Logo } from '@/components/logo'
import { ThemeSelector } from '@/components/theme-selector'

const footerLinks = [
  { label: 'Docs', href: 'https://docs.greenlight.dev' },
  { label: 'GitHub', href: 'https://github.com/markokosticdev/greenlight' },
  { label: 'Website', href: 'https://greenlight.dev' },
]

export function Footer() {
  return (
    <footer className="mt-auto bg-card text-card-foreground">
      <div className="container py-6">
        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:justify-between md:gap-4 md:text-left">
          <Logo href="/dashboard" showLabel={false} />

          <p className="text-[0.8125rem] text-muted-foreground md:mx-auto">2026 © Greenlight.</p>

          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-4">
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-foreground/70 dark:hover:text-foreground"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <ThemeSelector />
          </div>
        </div>
      </div>
    </footer>
  )
}
