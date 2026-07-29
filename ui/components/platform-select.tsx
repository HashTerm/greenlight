'use client'

import { PlatformIcon } from '@/components/platform-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPlatformBrand } from '@/lib/brand-icons'
import { PLATFORMS, type Platform } from '@/lib/platform-fields'

type PlatformSelectProps = {
  id?: string
  name: string
  value: Platform
  onValueChange: (value: Platform) => void
}

export function PlatformSelect({ id, name, value, onValueChange }: PlatformSelectProps) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select onValueChange={(next) => onValueChange(next as Platform)} value={value}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {PLATFORMS.map((platform) => {
            const { iconSvg, label } = getPlatformBrand(platform)

            return (
              <SelectItem key={platform} value={platform}>
                <PlatformIcon iconSvg={iconSvg} />
                {label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </>
  )
}
