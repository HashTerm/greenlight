'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import type { EnterpriseSettingsSection } from '@/lib/extensions/register'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const COMMUNITY_TABS = [
  { id: 'general', label: 'General', href: '/settings?tab=general' },
  { id: 'retention', label: 'Retention', href: '/settings?tab=retention' },
  { id: 'api-keys', label: 'API keys', href: '/settings?tab=api-keys' },
  { id: 'account', label: 'Account', href: '/settings?tab=account' },
] as const

const COMMUNITY_TAB_IDS = new Set<string>(COMMUNITY_TABS.map((tab) => tab.id))

const ENTERPRISE_TAB_LABELS: Record<string, string> = {
  license: 'License',
  users: 'Users',
  sso: 'SSO',
}

type SettingsTabsShellProps = {
  enterpriseSections: EnterpriseSettingsSection[]
  children: React.ReactNode
}

function resolveActiveTab(
  pathname: string,
  tabParam: string | null,
  enterpriseSections: EnterpriseSettingsSection[],
): string {
  const enterpriseMatch = enterpriseSections.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  )
  if (enterpriseMatch) return enterpriseMatch.id

  if (pathname !== '/settings') return 'general'

  if (tabParam && COMMUNITY_TAB_IDS.has(tabParam)) return tabParam
  return 'general'
}

export function SettingsTabsShell({ enterpriseSections, children }: SettingsTabsShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = resolveActiveTab(pathname, searchParams.get('tab'), enterpriseSections)

  return (
    <Tabs value={activeTab}>
      <TabsList className={enterpriseSections.length > 0 ? 'h-auto flex-wrap' : undefined}>
        {COMMUNITY_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} asChild>
            <Link href={tab.href}>{tab.label}</Link>
          </TabsTrigger>
        ))}
        {enterpriseSections.map((section) => (
          <TabsTrigger key={section.id} value={section.id} asChild>
            <Link href={section.href}>
              {ENTERPRISE_TAB_LABELS[section.id] ?? section.title}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}
