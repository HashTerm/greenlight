import type { LucideIcon } from 'lucide-react'

export type EnterpriseNavItem = {
  href: string
  label: string
  icon: LucideIcon
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
