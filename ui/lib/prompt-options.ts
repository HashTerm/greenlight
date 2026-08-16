import { getPlatformBrand } from '@/lib/brand-icons'
import type { Platform } from '@/lib/platform-fields'

export const DEFAULT_PROMPT_OPTION_LABELS = ['Yes', 'No'] as const
const DEFAULT_MAX_PROMPT_OPTIONS = 10
export const OPTION_LABEL_MAX_LENGTH = 64

export function maxPromptOptionsForPlatform(platform: Platform | null): number | null {
  if (!platform) return null
  if (platform === 'whatsapp' || platform === 'messenger') return 3
  return DEFAULT_MAX_PROMPT_OPTIONS
}

/** Max option labels when allow_text reserves a Type answer button. */
export function maxPromptOptionLabelsForPlatform(
  platform: Platform | null,
  allowText: boolean,
): number | null {
  if (!platform || !allowText) return maxPromptOptionsForPlatform(platform)
  if (platform === 'whatsapp' || platform === 'messenger') return 2
  return maxPromptOptionsForPlatform(platform)
}

export function promptOptionsFieldLabel(platform: Platform | null, allowText = false): string {
  if (!platform) return 'Options'

  const max = maxPromptOptionLabelsForPlatform(platform, allowText)
  if (max === null) return 'Options'

  const { label } = getPlatformBrand(platform)
  const typeAnswerNote =
    allowText && (platform === 'whatsapp' || platform === 'messenger')
      ? ' — Type answer uses one button'
      : ''
  return `Options (max ${max}${typeAnswerNote} on ${label})`
}

export function countFilledPromptOptions(options: string[]): number {
  return options.filter((option) => option.trim()).length
}

export function isOverPromptOptionLimit(options: string[], maxOptions: number | null): boolean {
  if (maxOptions === null) return false
  return countFilledPromptOptions(options) > maxOptions
}
