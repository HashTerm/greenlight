import Link from "next/link";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

import {
  deleteChannelAction,
  fetchChannels,
  sendMessageAction,
} from "@/lib/actions";
import { getPublicWebhookUrl } from "@/lib/greenlight-client";
import { formatGuideSteps } from "@/lib/platform-guides";
import type { Platform } from "@/lib/platform-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channels = await fetchChannels().catch(() => []);
  const channel = channels.find((c) => c.channel_id === id);
  if (!channel) notFound();

  const webhookUrl = `${getPublicWebhookUrl()}/webhooks/${channel.platform}/${channel.channel_id}`;
  const registerJson = JSON.stringify(
    {
      channel_id: channel.channel_id,
      platform: channel.platform,
      target_chat_id: channel.target_chat_id,
      channel_type: channel.channel_type,
      callback_url: channel.callback_url,
      credentials: { "...": "fill in secrets" },
    },
    null,
    2,
  );
  const guideSteps = formatGuideSteps(channel.platform as Platform, webhookUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{channel.channel_id}</h1>
          <p className="text-sm text-neutral-500">{channel.platform} · {channel.channel_type}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/channels/${encodeURIComponent(id)}/edit`}>Edit</Link>
          </Button>
          <form action={deleteChannelAction.bind(null, id)}>
            <Button type="submit" variant="destructive">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-neutral-500">Platform:</span> {channel.platform}</p>
            <p><span className="text-neutral-500">Target chat:</span> {channel.target_chat_id}</p>
            <p><span className="text-neutral-500">Type:</span> {channel.channel_type}</p>
            <p><span className="text-neutral-500">Callback:</span> {channel.callback_url ?? "—"}</p>
            <p>
              <span className="text-neutral-500">Status:</span>{" "}
              <Badge variant={channel.is_active ? "success" : "destructive"}>
                {channel.is_active ? "Active" : "Inactive"}
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded bg-neutral-100 p-3 text-xs">{webhookUrl}</code>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Register JSON template</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-neutral-100 p-3 text-xs">{registerJson}</pre>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform setup guide</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {guideSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {channel.channel_type === "MESSAGE" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Send test message</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={sendMessageAction} className="space-y-3">
                <input type="hidden" name="channel_id" value={channel.channel_id} />
                <div className="space-y-2">
                  <Label htmlFor="text">Message</Label>
                  <Textarea id="text" name="text" required placeholder="Hello from Greenlight admin" />
                </div>
                <Button type="submit">Send</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
