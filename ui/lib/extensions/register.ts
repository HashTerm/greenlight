import type { LucideIcon } from 'lucide-react'

export type EnterpriseNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export function registerEnterpriseNav(): EnterpriseNavItem[] {
  return []
}

export type EnterpriseSettingsSection = {
  id: string
  title: string
}

export function registerEnterpriseSettingsSections(): EnterpriseSettingsSection[] {
  return []
}
