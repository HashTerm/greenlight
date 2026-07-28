'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { applyThemeToDocument } from './apply-theme'
import {
  defaultTheme,
  getImplicitPreference,
  GREENLIGHT_THEME_STORAGE_KEY,
  resolveTheme,
  themeIsValid,
} from './shared'
import type { ResolvedTheme, ThemeConfig, ThemeContextType, ThemePreference } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
}

const ThemeContext = createContext<ThemeContextType>(initialContext)

function canUseDOM(): boolean {
  return typeof window !== 'undefined'
}

function readPreference(storageKey: string): ThemePreference {
  if (!canUseDOM()) {
    return 'system'
  }

  const stored = window.localStorage.getItem(storageKey)
  if (themeIsValid(stored)) {
    return stored
  }

  return 'system'
}

function readResolvedTheme(storageKey: string, fallback: ResolvedTheme): ResolvedTheme {
  if (!canUseDOM()) {
    return fallback
  }

  const stored = window.localStorage.getItem(storageKey)
  return resolveTheme(stored, fallback)
}

type ThemeProviderProps = {
  children: ReactNode
  config?: ThemeConfig
}

export function ThemeProvider({ children, config }: ThemeProviderProps) {
  const storageKey = config?.storageKey ?? GREENLIGHT_THEME_STORAGE_KEY
  const fallbackTheme = config?.defaultTheme ?? defaultTheme
  const enableClassAttribute = config?.enableClassAttribute ?? false

  const [preference, setPreference] = useState<ThemePreference>(() => readPreference(storageKey))
  const [theme, setThemeState] = useState<ResolvedTheme | undefined>(() =>
    canUseDOM() ? readResolvedTheme(storageKey, fallbackTheme) : undefined,
  )

  const applyTheme = useCallback(
    (resolvedTheme: ResolvedTheme) => {
      applyThemeToDocument(resolvedTheme, { enableClassAttribute })
      setThemeState(resolvedTheme)
    },
    [enableClassAttribute],
  )

  const setTheme = useCallback(
    (themeToSet: ThemePreference | null) => {
      if (themeToSet === null || themeToSet === 'system') {
        window.localStorage.removeItem(storageKey)
        setPreference('system')
        const implicitPreference = getImplicitPreference() ?? fallbackTheme
        applyTheme(implicitPreference)
        return
      }

      window.localStorage.setItem(storageKey, themeToSet)
      setPreference(themeToSet)
      applyTheme(themeToSet)
    },
    [applyTheme, fallbackTheme, storageKey],
  )

  useEffect(() => {
    const resolvedTheme = readResolvedTheme(storageKey, fallbackTheme)
    applyTheme(resolvedTheme)
    setPreference(readPreference(storageKey))
  }, [applyTheme, fallbackTheme, storageKey])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return
      }

      if (themeIsValid(event.newValue)) {
        setPreference(event.newValue)
        applyTheme(event.newValue)
        return
      }

      setPreference('system')
      applyTheme(getImplicitPreference() ?? fallbackTheme)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyTheme, fallbackTheme, storageKey])

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme: theme,
      preference,
      setTheme,
    }),
    [preference, setTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  return use(ThemeContext)
}
