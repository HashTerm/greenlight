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
}

export function ChannelTypeSelect({ id, name, value, onValueChange }: ChannelTypeSelectProps) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select onValueChange={(next) => onValueChange(next as ChannelType)} value={value}>
        <SelectTrigger id={id}>
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
