'use client'

import { useTheme } from '@greenlight/theme'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  const { theme } = useTheme()

  return <SonnerToaster theme={theme} />
}
