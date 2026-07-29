'use client'

import { useState, useTransition } from 'react'
import { createApiKeyAction, revokeApiKeyAction } from '@/lib/actions'
import { API_KEY_PRESETS, type ApiKeyPreset, type ApiKeyRecord } from '@/lib/greenlight-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ApiKeysSectionProps = {
  initialKeys: ApiKeyRecord[]
  error?: string | null
}

export function ApiKeysSection({ initialKeys, error }: ApiKeysSectionProps) {
  const [keys, setKeys] = useState(initialKeys)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [preset, setPreset] = useState<ApiKeyPreset>('agent')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set('preset', preset)
    setActionError(null)
    startTransition(async () => {
      try {
        const result = await createApiKeyAction(formData)
        const { key: plaintext, ...record } = result
        setKeys((prev) => [record, ...prev])
        setCreatedKey(plaintext)
        event.currentTarget.reset()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to create API key')
      }
    })
  }

  function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? Clients using it will lose access immediately.')) return
    setActionError(null)
    startTransition(async () => {
      try {
        await revokeApiKeyAction(id)
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)),
        )
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to revoke API key')
      }
    })
  }

  function copyCreatedKey() {
    if (!createdKey) return
    void navigator.clipboard.writeText(createdKey)
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">Could not load API keys ({error}).</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <form
        className="max-w-lg space-y-4 rounded-md border border-border p-4"
        onSubmit={handleCreate}
      >
        <div className="space-y-2">
          <Label htmlFor="api_key_name">Name</Label>
          <Input id="api_key_name" name="name" placeholder="CI deploy key" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="api_key_preset">Preset</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            id="api_key_preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value as ApiKeyPreset)}
          >
            {API_KEY_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button disabled={isPending} type="submit">
          Create API key
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={6}>
                No API keys yet.
              </TableCell>
            </TableRow>
          ) : (
            keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell>{key.name}</TableCell>
                <TableCell className="font-mono text-xs">{key.key_prefix}…</TableCell>
                <TableCell className="max-w-xs truncate text-xs">
                  {key.scopes.join(', ')}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(key.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {key.revoked_at ? (
                    <span className="text-xs text-muted-foreground">Revoked</span>
                  ) : (
                    <Button
                      disabled={isPending}
                      size="sm"
                      type="button"
                      variant="destructive"
                      onClick={() => handleRevoke(key.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={createdKey !== null} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{createdKey}</pre>
          <DialogFooter>
            <Button type="button" onClick={copyCreatedKey}>
              Copy
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreatedKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
