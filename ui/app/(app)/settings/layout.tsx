import { Settings } from 'lucide-react'
import { Suspense } from 'react'

import { PageHeader } from '@/components/page-header'
import { SettingsTabsShell, SettingsTabsSkeleton } from '@/components/settings-tabs'
import { registerCommunitySettingsSections } from '@/lib/extensions/register'
import { getLicensedEnterpriseSettingsSections } from '@/lib/enterprise-nav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const communitySections = registerCommunitySettingsSections()
  const enterpriseSections = await getLicensedEnterpriseSettingsSections()

  return (
    <div className="space-y-6">
      <PageHeader
        description="Connectivity, data retention, and account"
        icon={Settings}
        title="Settings"
      />
      <Suspense
        fallback={
          <SettingsTabsSkeleton
            communitySections={communitySections}
            enterpriseSections={enterpriseSections}
          />
        }
      >
        <SettingsTabsShell
          communitySections={communitySections}
          enterpriseSections={enterpriseSections}
        >
          {children}
        </SettingsTabsShell>
      </Suspense>
    </div>
  )
}
