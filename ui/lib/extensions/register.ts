/** Serializable icon id — resolved to a Lucide component in client nav. */
export const ENTERPRISE_NAV_ICONS = ['clipboard-list', 'megaphone'] as const
export type EnterpriseNavIcon = (typeof ENTERPRISE_NAV_ICONS)[number]

export type EnterpriseNavItem = {
  href: string
  label: string
  icon: EnterpriseNavIcon
  roles?: string[]
  requiredFeature?: EnterpriseLicensedFeature
}

export function registerEnterpriseNav(role?: string): EnterpriseNavItem[] {
  void role
  return []
}

export type EnterpriseLicensedFeature =
  | 'broadcast_groups'
  | 'audit_log'
  | 'multi_user_admin'
  | 'role_based_access'
  | 'single_sign_on'

export type EnterpriseSettingsSection = {
  id: string
  title: string
  href: string
  description?: string
  requiredFeature?: EnterpriseLicensedFeature
}

export type CommunitySettingsSection = EnterpriseSettingsSection

export function registerCommunitySettingsSections(): CommunitySettingsSection[] {
  return [
    {
      id: 'general',
      title: 'General',
      href: '/settings',
      description: 'API connectivity and instance configuration',
    },
    {
      id: 'account',
      title: 'Account',
      href: '/settings/account',
      description: 'Change your admin password',
    },
    {
      id: 'api-keys',
      title: 'API keys',
      href: '/settings/api-keys',
      description: 'Create and revoke API keys',
    },
    {
      id: 'retention',
      title: 'Retention',
      href: '/settings/retention',
      description: 'Data retention policies',
    },
  ]
}

function registerEnterpriseSettingsSections(): EnterpriseSettingsSection[] {
  return []
}
