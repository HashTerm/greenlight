'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const channelTypeOptions = [
  { value: 'MESSAGE', label: 'Message' },
  { value: 'PROMPT', label: 'Prompt' },
] as const

export type ChannelType = (typeof channelTypeOptions)[number]['value']

type ChannelTypeSelectProps = {
  id?: string
  name: string
  value: ChannelType
  onValueChange: (value: ChannelType) => void
  disabled?: boolean
}

export function ChannelTypeSelect({
  id,
  name,
  value,
  onValueChange,
  disabled,
}: ChannelTypeSelectProps) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        disabled={disabled}
        onValueChange={(next) => onValueChange(next as ChannelType)}
        value={value}
      >
        <SelectTrigger id={id} disabled={disabled}>
          <SelectValue placeholder="Select channel type" />
        </SelectTrigger>
        <SelectContent>
          {channelTypeOptions.map(({ value: optionValue, label }) => (
            <SelectItem key={optionValue} value={optionValue}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
