import { Settings } from 'lucide-react'
import { Suspense } from 'react'

import { PageHeader } from '@/components/page-header'
import { SettingsTabsShell } from '@/components/settings-tabs'
import { registerEnterpriseSettingsSections } from '@/lib/extensions/register'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const enterpriseSections = registerEnterpriseSettingsSections()

  return (
    <div className="space-y-6">
      <PageHeader
        description="Connectivity, data retention, and account"
        icon={Settings}
        title="Settings"
      />
      <Suspense fallback={children}>
        <SettingsTabsShell enterpriseSections={enterpriseSections}>{children}</SettingsTabsShell>
      </Suspense>
    </div>
  )
}
