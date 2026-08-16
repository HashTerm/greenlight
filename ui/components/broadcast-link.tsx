import Link from 'next/link'

export function BroadcastIdLink({ broadcastBatchId }: { broadcastBatchId: string | null | undefined }) {
  if (!broadcastBatchId) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <Link
      className="font-mono text-xs text-primary hover:underline"
      href={`/prompts?broadcast_batch_id=${encodeURIComponent(broadcastBatchId)}`}
    >
      {broadcastBatchId}
    </Link>
  )
}

export function BroadcastGroupIdLink({
  broadcastGroupId,
}: {
  broadcastGroupId: string | null | undefined
}) {
  if (!broadcastGroupId) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <Link
      className="font-mono text-xs text-primary hover:underline"
      href={`/broadcasts/${encodeURIComponent(broadcastGroupId)}`}
    >
      {broadcastGroupId}
    </Link>
  )
}
