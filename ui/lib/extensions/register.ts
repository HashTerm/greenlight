/** Serializable icon id — resolved to a Lucide component in client nav. */
export const ENTERPRISE_NAV_ICONS = ['clipboard-list', 'shield', 'users'] as const
export type EnterpriseNavIcon = (typeof ENTERPRISE_NAV_ICONS)[number]

export type EnterpriseNavItem = {
  href: string
  label: string
  icon: EnterpriseNavIcon
  roles?: string[]
}

export function registerEnterpriseNav(role?: string): EnterpriseNavItem[] {
  void role
  return []
}

export type EnterpriseSettingsSection = {
  id: string
  title: string
  href: string
  description?: string
}

export function registerEnterpriseSettingsSections(): EnterpriseSettingsSection[] {
  return []
}
