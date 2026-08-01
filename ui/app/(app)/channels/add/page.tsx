import { Radio } from 'lucide-react'
import { ChannelForm } from '@/components/channel-form'
import { PageHeader } from '@/components/page-header'

export default function AddChannelPage() {
  return (
    <div className="space-y-6">
      <PageHeader description="Register a new platform channel" icon={Radio} title="Add channel" />
      <ChannelForm />
    </div>
  )
}
