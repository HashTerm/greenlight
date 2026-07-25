"use client";

import { useMemo, useState } from "react";
import { registerChannelAction } from "@/lib/actions";
import { formatGuideSteps } from "@/lib/platform-guides";
import {
  PLATFORMS,
  PLATFORM_FIELDS,
  type Platform,
} from "@/lib/platform-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChannelFormProps {
  initial?: {
    channel_id: string;
    platform: string;
    target_chat_id: string;
    channel_type: string;
    callback_url: string;
  };
  lockChannelId?: boolean;
}

export function ChannelForm({ initial, lockChannelId }: ChannelFormProps) {
  const [platform, setPlatform] = useState<Platform>(
    (initial?.platform as Platform) ?? "telegram",
  );

  const fields = PLATFORM_FIELDS[platform];
  const webhookBase = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "http://localhost:8100";
  const guideSteps = useMemo(() => {
    const channelId = initial?.channel_id ?? "{channel_id}";
    return formatGuideSteps(platform, `${webhookBase}/webhooks/${platform}/${channelId}`);
  }, [platform, initial?.channel_id, webhookBase]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Channel details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registerChannelAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel_id">Channel ID</Label>
                <Input
                  id="channel_id"
                  name="channel_id"
                  defaultValue={initial?.channel_id}
                  readOnly={lockChannelId}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <select
                  id="platform"
                  name="platform"
                  className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_chat_id">Target chat ID</Label>
                <Input
                  id="target_chat_id"
                  name="target_chat_id"
                  defaultValue={initial?.target_chat_id}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel_type">Channel type</Label>
                <select
                  id="channel_type"
                  name="channel_type"
                  className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                  defaultValue={initial?.channel_type ?? "MESSAGE"}
                >
                  <option value="MESSAGE">MESSAGE</option>
                  <option value="PROMPT">PROMPT</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callback_url">Callback URL (MESSAGE channels)</Label>
              <Input
                id="callback_url"
                name="callback_url"
                type="url"
                defaultValue={initial?.callback_url}
                placeholder="https://your-agent/hooks/messages"
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Credentials</h3>
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cred_${field.key}`}>{field.label}</Label>
                  {field.type === "textarea" ? (
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
                <p className="text-xs text-neutral-500">
                  Leave credential fields blank to keep existing values (re-submit all to update).
                </p>
              )}
            </div>

            <Button type="submit">{initial ? "Update channel" : "Register channel"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-600">
            {guideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
