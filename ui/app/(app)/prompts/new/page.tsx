import Link from 'next/link'
import { createPromptAction, createPromptUploadAction, fetchChannels } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

export default async function NewPromptPage() {
  const channels = await fetchChannels().catch(() => [])
  const promptChannels = channels.filter((c) => c.channel_type === 'PROMPT')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New prompt</h1>
        <p className="text-sm text-neutral-500">Send a human-in-the-loop prompt</p>
      </div>

      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">Text prompt</TabsTrigger>
          <TabsTrigger value="upload">Media upload</TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Create prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPromptAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel_id">PROMPT channel</Label>
                  <select
                    id="channel_id"
                    name="channel_id"
                    className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                    required
                  >
                    {promptChannels.map((c) => (
                      <option key={c.channel_id} value={c.channel_id}>
                        {c.channel_id} ({c.platform})
                      </option>
                    ))}
                  </select>
                  {!promptChannels.length && (
                    <p className="text-xs text-amber-600">
                      No PROMPT channels.{' '}
                      <Link href="/channels/new" className="underline">
                        Register one
                      </Link>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text">Text</Label>
                  <Textarea id="text" name="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="options">
                    Options (one per line, max 3 for WhatsApp/Messenger)
                  </Label>
                  <Textarea id="options" name="options" placeholder="Yes\nNo\nMaybe" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="allow_text" name="allow_text" type="checkbox" />
                  <Label htmlFor="allow_text">Allow free-text reply</Label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="callback_url">Callback URL</Label>
                    <Input id="callback_url" name="callback_url" type="url" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correlation_id">Correlation ID</Label>
                    <Input id="correlation_id" name="correlation_id" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ttl_sec">TTL (seconds)</Label>
                    <Input id="ttl_sec" name="ttl_sec" type="number" defaultValue={3600} />
                  </div>
                </div>
                <Button type="submit">Create prompt</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Prompt with media</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPromptUploadAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upload_channel_id">PROMPT channel</Label>
                  <select
                    id="upload_channel_id"
                    name="channel_id"
                    className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                    required
                  >
                    {promptChannels.map((c) => (
                      <option key={c.channel_id} value={c.channel_id}>
                        {c.channel_id} ({c.platform})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload_text">Caption / text</Label>
                  <Textarea id="upload_text" name="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input id="file" name="file" type="file" required />
                </div>
                <Button type="submit">Upload & create</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
