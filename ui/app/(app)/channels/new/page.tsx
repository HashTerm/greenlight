import { ChannelForm } from "@/components/channel-form";

export default function NewChannelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add channel</h1>
        <p className="text-sm text-neutral-500">Register a new platform channel</p>
      </div>
      <ChannelForm />
    </div>
  );
}
