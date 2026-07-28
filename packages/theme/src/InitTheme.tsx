'use client'

import { useServerInsertedHTML } from 'next/navigation'

import { getThemeInitScript } from './init-theme-script'
import type { ThemeConfig } from './types'

type InitThemeProps = {
  config?: ThemeConfig
}

export function InitTheme({ config }: InitThemeProps) {
  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{ __html: getThemeInitScript(config) }}
      id="greenlight-theme-script"
    />
  ))

  return null
}
