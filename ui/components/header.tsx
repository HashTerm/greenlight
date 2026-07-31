import { HeaderNav } from '@/components/header-nav'
import { Logo } from '@/components/logo'
import { getEnterpriseNavLinks } from '@/lib/enterprise-nav'

export async function Header() {
  const enterpriseLinks = await getEnterpriseNavLinks()

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <HeaderNav enterpriseLinks={enterpriseLinks} />
      </div>
    </header>
  )
}
