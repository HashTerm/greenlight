import { getPlatformBrand } from '@/lib/brand-icons'
import type { Platform } from '@/lib/platform-fields'

export const DEFAULT_PROMPT_OPTION_LABELS = ['Yes', 'No'] as const
export const DEFAULT_MAX_PROMPT_OPTIONS = 10
export const OPTION_LABEL_MAX_LENGTH = 64

export function maxPromptOptionsForPlatform(platform: Platform | null): number | null {
  if (!platform) return null
  if (platform === 'whatsapp' || platform === 'messenger') return 3
  return DEFAULT_MAX_PROMPT_OPTIONS
}

export function promptOptionsFieldLabel(platform: Platform | null): string {
  if (!platform) return 'Options'

  const max = maxPromptOptionsForPlatform(platform)
  if (max === null) return 'Options'

  const { label } = getPlatformBrand(platform)
  return `Options (max ${max} on ${label})`
}

export function countFilledPromptOptions(options: string[]): number {
  return options.filter((option) => option.trim()).length
}

export function isOverPromptOptionLimit(options: string[], maxOptions: number | null): boolean {
  if (maxOptions === null) return false
  return countFilledPromptOptions(options) > maxOptions
}
