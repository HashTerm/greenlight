export type ResolvedTheme = 'dark' | 'light'

export type ThemePreference = ResolvedTheme | 'system'

export type ThemeConfig = {
  storageKey?: string
  defaultTheme?: ResolvedTheme
  enableClassAttribute?: boolean
}

export interface ThemeContextType {
  theme?: ResolvedTheme
  resolvedTheme?: ResolvedTheme
  preference?: ThemePreference
  setTheme: (theme: ThemePreference | null) => void
}
