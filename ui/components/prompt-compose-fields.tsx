'use client'

import { FileInput } from '@/components/file-input'
import { PromptOptionsField } from '@/components/prompt-options-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CORRELATION_ID_PLACEHOLDER,
  PROMPT_CALLBACK_URL_PLACEHOLDER,
  PROMPT_TEXT_PLACEHOLDER,
} from '@/lib/form-placeholders'
import type { Platform } from '@/lib/platform-fields'

type PromptComposeFieldsProps = {
  allowText: boolean
  maxOptions: number | null
  onAllowTextChange: (value: boolean) => void
  onOverLimitChange: (overLimit: boolean) => void
  platform: Platform | null
}

export function PromptComposeFields({
  allowText,
  maxOptions,
  onAllowTextChange,
  onOverLimitChange,
  platform,
}: PromptComposeFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="text">Text</Label>
        <Textarea id="text" name="text" placeholder={PROMPT_TEXT_PLACEHOLDER} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Attachment</Label>
        <FileInput id="file" name="file" />
        <p className="text-sm text-muted-foreground">
          Optional — image or document sent with the message
        </p>
      </div>
      <PromptOptionsField
        allowText={allowText}
        maxOptions={maxOptions}
        platform={platform}
        onOverLimitChange={onOverLimitChange}
      />
      <div className="flex items-center gap-2">
        <input
          checked={allowText}
          id="allow_text"
          name="allow_text"
          type="checkbox"
          onChange={(event) => onAllowTextChange(event.target.checked)}
        />
        <Label htmlFor="allow_text">Allow free-text reply</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Adds a <strong>Type answer</strong> button; the user&apos;s next message is recorded as the
        answer. On WhatsApp and Messenger, only two option labels are allowed when this is enabled.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="callback_url">Callback URL</Label>
          <Input
            id="callback_url"
            name="callback_url"
            placeholder={PROMPT_CALLBACK_URL_PLACEHOLDER}
            type="url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="correlation_id">Correlation ID</Label>
          <Input
            id="correlation_id"
            name="correlation_id"
            placeholder={CORRELATION_ID_PLACEHOLDER}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="callback_headers">Callback headers (JSON)</Label>
          <Textarea
            id="callback_headers"
            name="callback_headers"
            placeholder='{"Authorization": "Bearer your-token"}'
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Optional outbound headers (Bearer, X-Api-Key) for your answer webhook. Not echoed in the
            callback body.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="callback_data">Callback data (JSON)</Label>
          <Textarea
            id="callback_data"
            name="callback_data"
            placeholder='{"build_id": 9182, "step": "approve"}'
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Optional workflow state echoed in the signed answer callback so a downstream automation
            can resume.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ttl_sec">TTL (seconds)</Label>
          <Input id="ttl_sec" name="ttl_sec" type="number" defaultValue={3600} />
        </div>
      </div>
    </>
  )
}
