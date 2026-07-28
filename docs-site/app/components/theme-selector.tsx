'use client'

import { useTheme, type ResolvedTheme } from '@greenlight/theme'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, Moon, Sun, SunMoon } from 'lucide-react'
import { useEffect, useState } from 'react'

const themeOptions = [
  { value: 'system', label: 'Auto', Icon: SunMoon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

/**
 * Footer theme switcher matching the website's Radix `ThemeSelector`:
 * bordered trigger, custom dropdown (not native `<select>`), icons per option.
 */
export function ThemeSelector() {
  const { preference, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const value = mounted ? (preference ?? 'system') : 'system'
  const selected = themeOptions.find((option) => option.value === value) ?? themeOptions[0]
  const SelectedIcon = selected.Icon

  return (
    <Select.Root
      onValueChange={(nextValue) => {
        if (nextValue === 'system') {
          setTheme('system')
          return
        }

        setTheme(nextValue as ResolvedTheme)
      }}
      value={value}
    >
      <Select.Trigger aria-label="Select a theme" className="site-footer-theme-trigger">
        <span className="site-footer-theme-trigger-value">
          <SelectedIcon aria-hidden="true" className="site-footer-theme-icon" />
          <Select.Value />
        </span>
        <Select.Icon asChild>
          <ChevronDown aria-hidden="true" className="site-footer-theme-chevron" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="site-footer-theme-content" position="popper" sideOffset={4}>
          <Select.Viewport className="site-footer-theme-viewport">
            {themeOptions.map(({ value: optionValue, label, Icon }) => (
              <Select.Item key={optionValue} className="site-footer-theme-item" value={optionValue}>
                <span className="site-footer-theme-item-check">
                  <Select.ItemIndicator>
                    <Check aria-hidden="true" className="site-footer-theme-icon" />
                  </Select.ItemIndicator>
                </span>
                <Icon aria-hidden="true" className="site-footer-theme-icon" />
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
