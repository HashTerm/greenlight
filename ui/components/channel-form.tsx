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
    callback_data?: unknown | null
    callback_headers_configured?: boolean
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
  const organizationId = process.env.NEXT_PUBLIC_GREENLIGHT_ORG_ID ?? 'default'
  const guideSteps = useMemo(() => {
    const channelId = initial?.channel_id ?? '{channel_id}'
    return formatGuideSteps(
      platform,
      `${webhookBase}/webhooks/${encodeURIComponent(organizationId)}/${platform}/${channelId}`,
    )
  }, [platform, initial?.channel_id, webhookBase, organizationId])

  const showMessageCallback = channelType === 'MESSAGE'
  const callbackDataDefault =
    initial?.callback_data != null ? JSON.stringify(initial.callback_data, null, 2) : ''

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <form action={formAction} className="space-y-6">
          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Channel details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {showMessageCallback ? (
            <Card>
              <CardHeader>
                <CardTitle>Message callback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="callback_url">Callback URL</Label>
                  <Input
                    id="callback_url"
                    name="callback_url"
                    type="url"
                    defaultValue={initial?.callback_url}
                    placeholder={MESSAGE_CALLBACK_URL_PLACEHOLDER}
                    required={channelType === 'MESSAGE'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where Greenlight forwards inbound messages from this chat as unsigned
                    message.created events.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callback_headers">Callback headers (JSON)</Label>
                  <Textarea
                    id="callback_headers"
                    name="callback_headers"
                    placeholder='{"Authorization": "Bearer your-token"}'
                    rows={3}
                  />
                  {initial?.callback_headers_configured ? (
                    <p className="text-xs text-muted-foreground">
                      Headers are configured. Leave blank to keep existing values.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Optional — Bearer token or custom headers for your webhook ingress auth.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callback_data">Callback data (JSON)</Label>
                  <Textarea
                    id="callback_data"
                    name="callback_data"
                    defaultValue={callbackDataDefault}
                    placeholder='{"tenant": "acme", "room": "support"}'
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional static JSON attached to every message.created forward (not shown in
                    chat).
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : initial ? 'Update channel' : 'Register channel'}
          </Button>
        </form>
      </div>

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
