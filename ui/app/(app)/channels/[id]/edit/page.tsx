import { notFound } from 'next/navigation'
import { fetchChannels } from '@/lib/actions'
import { ChannelForm } from '@/components/channel-form'

export default async function EditChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const channels = await fetchChannels().catch(() => [])
  const channel = channels.find((c) => c.channel_id === id)
  if (!channel) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1>Edit {channel.channel_id}</h1>
        <p className="text-sm text-muted-foreground">Update channel configuration</p>
      </div>
      <ChannelForm
        initial={{
          channel_id: channel.channel_id,
          platform: channel.platform,
          target_chat_id: channel.target_chat_id,
          channel_type: channel.channel_type,
          callback_url: channel.callback_url ?? '',
        }}
        lockChannelId
      />
    </div>
  )
}
