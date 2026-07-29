import { ChannelForm } from '@/components/channel-form'

export default function AddChannelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Add channel</h1>
        <p className="text-sm text-muted-foreground">Register a new platform channel</p>
      </div>
      <ChannelForm />
    </div>
  )
}
