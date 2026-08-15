'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import type { CommunitySettingsSection, EnterpriseSettingsSection } from '@/lib/extensions/register'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ENTERPRISE_TAB_LABELS: Record<string, string> = {
  license: 'License',
  users: 'Users',
  sso: 'SSO',
}

type SettingsTabsShellProps = {
  communitySections: CommunitySettingsSection[]
  enterpriseSections: EnterpriseSettingsSection[]
  children: React.ReactNode
}

function matchesSectionPath(pathname: string, href: string): boolean {
  if (href === '/settings') {
    return pathname === '/settings'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function resolveActiveTab(
  pathname: string,
  tabParam: string | null,
  communitySections: CommunitySettingsSection[],
  enterpriseSections: EnterpriseSettingsSection[],
): string {
  const enterpriseMatch = enterpriseSections.find((section) =>
    matchesSectionPath(pathname, section.href),
  )
  if (enterpriseMatch) return enterpriseMatch.id

  const communityMatch = communitySections.find((section) =>
    matchesSectionPath(pathname, section.href),
  )
  if (communityMatch) return communityMatch.id

  if (pathname === '/settings' && tabParam) {
    const legacyMatch = communitySections.find((section) => section.id === tabParam)
    if (legacyMatch) return legacyMatch.id
  }

  return 'general'
}

export function SettingsTabsSkeleton({
  communitySections,
  enterpriseSections,
}: {
  communitySections: CommunitySettingsSection[]
  enterpriseSections: EnterpriseSettingsSection[]
}) {
  const tabCount = communitySections.length + enterpriseSections.length

  return (
    <div className="space-y-2">
      <div className="inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1">
        {Array.from({ length: tabCount }, (_, index) => (
          <div key={index} className="h-8 w-20 animate-pulse rounded-sm bg-background/60" />
        ))}
      </div>
    </div>
  )
}

export function SettingsTabsShell({
  communitySections,
  enterpriseSections,
  children,
}: SettingsTabsShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = resolveActiveTab(
    pathname,
    searchParams.get('tab'),
    communitySections,
    enterpriseSections,
  )

  const hasManyTabs = communitySections.length + enterpriseSections.length > 4

  return (
    <Tabs value={activeTab}>
      <TabsList className={hasManyTabs ? 'h-auto flex-wrap' : undefined}>
        {communitySections.map((section) => (
          <TabsTrigger key={section.id} value={section.id} asChild>
            <Link href={section.href}>{section.title}</Link>
          </TabsTrigger>
        ))}
        {enterpriseSections.map((section) => (
          <TabsTrigger key={section.id} value={section.id} asChild>
            <Link href={section.href}>{ENTERPRISE_TAB_LABELS[section.id] ?? section.title}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
