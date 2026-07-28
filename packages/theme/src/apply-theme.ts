import type { ResolvedTheme } from './types'

export function applyThemeToDocument(
  theme: ResolvedTheme,
  options?: { enableClassAttribute?: boolean },
): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', theme)

  if (options?.enableClassAttribute) {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}
