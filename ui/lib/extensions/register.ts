import type { LucideIcon } from 'lucide-react'

export type EnterpriseNavItem = {
  href: string
  label: string
  icon: LucideIcon
  roles?: string[]
}

export function registerEnterpriseNav(_role?: string): EnterpriseNavItem[] {
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