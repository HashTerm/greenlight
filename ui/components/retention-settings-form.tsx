'use client'

import { useState } from 'react'

import { updateRetentionSettingsAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RetentionSettings } from '@/lib/greenlight-client'

type RetentionSettingsFormProps = {
  initial: RetentionSettings
}

function ScheduledDeletionRow({
  checkboxId,
  checkboxName,
  daysId,
  daysName,
  label,
  enabled,
  onEnabledChange,
  defaultDays,
}: {
  checkboxId: string
  checkboxName: string
  daysId: string
  daysName: string
  label: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  defaultDays: number
}) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center gap-2">
        <input
          checked={enabled}
          id={checkboxId}
          name={checkboxName}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
        <Label htmlFor={checkboxId}>{label}</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor={daysId}>Retention period (days)</Label>
        <Input
          defaultValue={defaultDays}
          disabled={!enabled}
          id={daysId}
          min={1}
          name={daysName}
          type="number"
        />
      </div>
    </div>
  )
}

export function RetentionSettingsForm({ initial }: RetentionSettingsFormProps) {
  const [promptsEnabled, setPromptsEnabled] = useState(initial.prompts_retention_enabled)
  const [inboundScheduled, setInboundScheduled] = useState(
    initial.messages_inbound_retention_enabled,
  )
  const [outboundScheduled, setOutboundScheduled] = useState(
    initial.messages_outbound_retention_enabled,
  )
  const [inboundZero, setInboundZero] = useState(initial.messages_inbound_zero_retention)
  const [outboundZero, setOutboundZero] = useState(initial.messages_outbound_zero_retention)

  return (
    <form action={updateRetentionSettingsAction} className="max-w-lg space-y-8">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Scheduled deletion</h3>
          <p className="text-sm text-muted-foreground">
            Automatically delete stored records older than N days (runs every minute).
          </p>
        </div>
        <ScheduledDeletionRow
          checkboxId="prompts_retention_enabled"
          checkboxName="prompts_retention_enabled"
          daysId="prompts_retention_days"
          daysName="prompts_retention_days"
          defaultDays={initial.prompts_retention_days}
          enabled={promptsEnabled}
          label="Enable scheduled deletion for prompts"
          onEnabledChange={setPromptsEnabled}
        />
        <ScheduledDeletionRow
          checkboxId="messages_inbound_retention_enabled"
          checkboxName="messages_inbound_retention_enabled"
          daysId="messages_inbound_retention_days"
          daysName="messages_inbound_retention_days"
          defaultDays={initial.messages_inbound_retention_days}
          enabled={inboundScheduled}
          label="Enable scheduled deletion for inbound messages"
          onEnabledChange={setInboundScheduled}
        />
        <ScheduledDeletionRow
          checkboxId="messages_outbound_retention_enabled"
          checkboxName="messages_outbound_retention_enabled"
          daysId="messages_outbound_retention_days"
          daysName="messages_outbound_retention_days"
          defaultDays={initial.messages_outbound_retention_days}
          enabled={outboundScheduled}
          label="Enable scheduled deletion for outbound messages"
          onEnabledChange={setOutboundScheduled}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Do not store (zero retention)</h3>
          <p className="text-sm text-muted-foreground">
            Never write these messages to history. Sends and callbacks still work.
          </p>
        </div>
        <div className="space-y-3 rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <input
              checked={inboundZero}
              id="messages_inbound_zero_retention"
              name="messages_inbound_zero_retention"
              onChange={(event) => setInboundZero(event.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="messages_inbound_zero_retention">Do not store inbound messages</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              checked={outboundZero}
              id="messages_outbound_zero_retention"
              name="messages_outbound_zero_retention"
              onChange={(event) => setOutboundZero(event.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="messages_outbound_zero_retention">Do not store outbound messages</Label>
          </div>
        </div>
      </div>

      <Button type="submit">Save retention settings</Button>
    </form>
  )
}
