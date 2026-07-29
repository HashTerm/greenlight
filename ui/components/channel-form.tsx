'use client'

import { useActionState, useMemo, useState } from 'react'
import { createChannelAction, updateChannelAction } from '@/lib/actions'
import {
  CHANNEL_ID_PLACEHOLDER,
  MESSAGE_CALLBACK_URL_PLACEHOLDER,
  TARGET_CHAT_ID_PLACEHOLDER,
} from '@/lib/form-placeholders'
import { formatGuideSteps } from '@/lib/platform-guides'
import { PLATFORM_FIELDS, type Platform } from '@/lib/platform-fields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChannelTypeSelect, type ChannelType } from '@/components/channel-type-select'
import { PlatformSelect } from '@/components/platform-select'
import { Textarea } from '@/components/ui/textarea'

interface ChannelFormProps {
  initial?: {
    channel_id: string
    platform: string
    target_chat_id: string
    channel_type: string
    callback_url: string
  }
  lockChannelId?: boolean
}

export function ChannelForm({ initial, lockChannelId }: ChannelFormProps) {
  const isEditMode = Boolean(initial)
  const [platform, setPlatform] = useState<Platform>((initial?.platform as Platform) ?? 'telegram')
  const [channelType, setChannelType] = useState<ChannelType>(
    (initial?.channel_type as ChannelType) ?? 'MESSAGE',
  )
  const [state, formAction, isPending] = useActionState(
    isEditMode ? updateChannelAction : createChannelAction,
    {},
  )

  const fields = PLATFORM_FIELDS[platform]
  const webhookBase = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? 'http://localhost:8100'
  const guideSteps = useMemo(() => {
    const channelId = initial?.channel_id ?? '{channel_id}'
    return formatGuideSteps(platform, `${webhookBase}/webhooks/${platform}/${channelId}`)
  }, [platform, initial?.channel_id, webhookBase])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Channel details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel_id">Channel ID</Label>
                <Input
                  id="channel_id"
                  name="channel_id"
                  defaultValue={initial?.channel_id}
                  placeholder={CHANNEL_ID_PLACEHOLDER}
                  readOnly={lockChannelId}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <PlatformSelect
                  id="platform"
                  name="platform"
                  value={platform}
                  onValueChange={setPlatform}
                  disabled={isEditMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_chat_id">Target chat ID</Label>
                <Input
                  id="target_chat_id"
                  name="target_chat_id"
                  defaultValue={initial?.target_chat_id}
                  placeholder={TARGET_CHAT_ID_PLACEHOLDER}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel_type">Channel type</Label>
                <ChannelTypeSelect
                  id="channel_type"
                  name="channel_type"
                  value={channelType}
                  onValueChange={setChannelType}
                  disabled={isEditMode}
                />
              </div>
            </div>

            {isEditMode ? (
              <p className="text-xs text-muted-foreground">
                Platform and channel type cannot be changed after registration. Create a new channel
                to use a different platform or mode.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="callback_url">Callback URL (MESSAGE channels)</Label>
              <Input
                id="callback_url"
                name="callback_url"
                type="url"
                defaultValue={initial?.callback_url}
                placeholder={MESSAGE_CALLBACK_URL_PLACEHOLDER}
                required={channelType === 'MESSAGE'}
              />
              {channelType === 'MESSAGE' ? (
                <p className="text-xs text-muted-foreground">
                  Where Greenlight forwards inbound messages from this chat. Use Prompt type instead
                  if you only need approval buttons, not two-way chat.
                </p>
              ) : null}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Credentials</h3>
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cred_${field.key}`}>{field.label}</Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={`cred_${field.key}`}
                      name={`cred_${field.key}`}
                      placeholder={field.placeholder}
                      required={!initial}
                    />
                  ) : (
                    <Input
                      id={`cred_${field.key}`}
                      name={`cred_${field.key}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={!initial}
                    />
                  )}
                </div>
              ))}
              {initial && (
                <p className="text-xs text-muted-foreground">
                  Leave credential fields blank to keep existing values (re-submit all to update).
                </p>
              )}
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : initial ? 'Update channel' : 'Register channel'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {guideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
