import type { ResolvedTheme } from './types'

export const GREENLIGHT_THEME_STORAGE_KEY = 'greenlight-theme'

export const defaultTheme: ResolvedTheme = 'light'

export function themeIsValid(value: string | null): value is ResolvedTheme {
  return value === 'dark' || value === 'light'
}

export function getImplicitPreference(): ResolvedTheme | null {
  if (typeof window === 'undefined') {
    return null
  }

  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  if (typeof mql.matches !== 'boolean') {
    return null
  }

  return mql.matches ? 'dark' : 'light'
}

export function resolveTheme(
  preference: string | null,
  fallback: ResolvedTheme = defaultTheme,
): ResolvedTheme {
  if (themeIsValid(preference)) {
    return preference
  }

  return getImplicitPreference() ?? fallback
}
