import type { EnterpriseSettingsSection } from '@/lib/extensions/register'
import { registerEnterpriseNav } from '@/lib/extensions/register'

export async function getLicensedEnterpriseSettingsSections(): Promise<
  EnterpriseSettingsSection[]
> {
  return []
}

export async function getEnterpriseNavLinks() {
  return registerEnterpriseNav()
}
