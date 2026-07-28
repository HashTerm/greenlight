import type { ThemeConfig } from './types'
import { defaultTheme, GREENLIGHT_THEME_STORAGE_KEY } from './shared'

export function getThemeInitScript(config?: ThemeConfig): string {
  const storageKey = config?.storageKey ?? GREENLIGHT_THEME_STORAGE_KEY
  const fallbackTheme = config?.defaultTheme ?? defaultTheme
  const enableClassAttribute = config?.enableClassAttribute ?? false

  const classToggle = enableClassAttribute
    ? "document.documentElement.classList.toggle('dark', theme === 'dark')"
    : ''

  return `(function () {
  function getImplicitPreference() {
    var mediaQuery = '(prefers-color-scheme: dark)'
    var mql = window.matchMedia(mediaQuery)
    var hasImplicitPreference = typeof mql.matches === 'boolean'

    if (hasImplicitPreference) {
      return mql.matches ? 'dark' : 'light'
    }

    return null
  }

  function themeIsValid(theme) {
    return theme === 'light' || theme === 'dark'
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    ${classToggle}
  }

  var themeToSet = '${fallbackTheme}'
  var preference = window.localStorage.getItem('${storageKey}')

  if (themeIsValid(preference)) {
    themeToSet = preference
  } else {
    var implicitPreference = getImplicitPreference()

    if (implicitPreference) {
      themeToSet = implicitPreference
    }
  }

  applyTheme(themeToSet)
})();`
}
