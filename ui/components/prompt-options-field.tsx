'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  countFilledPromptOptions,
  DEFAULT_PROMPT_OPTION_LABELS,
  isOverPromptOptionLimit,
  OPTION_LABEL_MAX_LENGTH,
  promptOptionsFieldLabel,
} from '@/lib/prompt-options'
import type { Platform } from '@/lib/platform-fields'
import { getPlatformBrand } from '@/lib/brand-icons'

type PromptOptionsFieldProps = {
  maxOptions: number | null
  onOverLimitChange?: (overLimit: boolean) => void
  platform: Platform | null
}

export function PromptOptionsField({
  maxOptions,
  onOverLimitChange,
  platform,
}: PromptOptionsFieldProps) {
  const [options, setOptions] = useState<string[]>([...DEFAULT_PROMPT_OPTION_LABELS])

  const filledCount = countFilledPromptOptions(options)
  const overLimit = isOverPromptOptionLimit(options, maxOptions)
  const canAdd = maxOptions === null || options.length < maxOptions

  useEffect(() => {
    onOverLimitChange?.(overLimit)
  }, [overLimit, onOverLimitChange])

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)))
  }

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index))
  }

  const addOption = () => {
    if (!canAdd) return
    setOptions((current) => [...current, ''])
  }

  const excessCount =
    maxOptions !== null && filledCount > maxOptions ? filledCount - maxOptions : 0

  return (
    <div className="space-y-2">
      <Label>{promptOptionsFieldLabel(platform)}</Label>
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                maxLength={OPTION_LABEL_MAX_LENGTH}
                name={option.trim() ? 'options' : undefined}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                value={option}
              />
              <Button
                aria-label={`Remove option ${index + 1}`}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => removeOption(index)}
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        disabled={!canAdd}
        size="sm"
        type="button"
        variant="outline"
        onClick={addOption}
      >
        <PlusIcon />
        Add option
      </Button>
      {excessCount > 0 && platform && maxOptions !== null && (
        <p className="text-sm text-muted-foreground">
          Remove {excessCount} option{excessCount === 1 ? '' : 's'} —{' '}
          {getPlatformBrand(platform).label} allows at most {maxOptions}
        </p>
      )}
    </div>
  )
}
