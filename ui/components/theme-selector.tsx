'use client'

import { useTheme, type ResolvedTheme } from '@greenlight/theme'
import { Moon, Sun, SunMoon } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const themeOptions = [
  { value: 'auto', label: 'Auto', Icon: SunMoon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

export function ThemeSelector() {
  const { preference, setTheme } = useTheme()
  const value = preference === 'system' || !preference ? 'auto' : preference

  const onThemeChange = (themeToSet: ResolvedTheme | 'auto') => {
    if (themeToSet === 'auto') {
      setTheme(null)
      return
    }

    setTheme(themeToSet)
  }

  return (
    <Select onValueChange={onThemeChange} value={value}>
      <SelectTrigger
        aria-label="Select a theme"
        className="theme-selector-trigger w-auto gap-2 border border-border bg-transparent px-3 shadow-none"
      >
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        {themeOptions.map(({ value: optionValue, label, Icon }) => (
          <SelectItem key={optionValue} value={optionValue}>
            <Icon className="size-4" />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
