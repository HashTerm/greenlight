'use client'

import { useRef, useState } from 'react'
import { FileIcon, UploadIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FileInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  onFileChange?: (file: File | null) => void
}

export function FileInput({ className, id, onFileChange, ...props }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const openPicker = () => inputRef.current?.click()

  const clearFile = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setFileName(null)
    onFileChange?.(null)
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-md border border-dashed border-input bg-muted/30 px-4 py-3 transition-colors',
          !fileName && 'hover:bg-muted/50',
        )}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-1"
          type="button"
          onClick={openPicker}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            {fileName ? (
              <FileIcon className="size-4 text-foreground" />
            ) : (
              <UploadIcon className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {fileName ?? 'Choose a file'}
            </p>
            <p className="text-xs text-muted-foreground">
              {fileName ? 'Click to replace' : 'Click to browse from your device'}
            </p>
          </div>
        </button>
        {fileName && (
          <Button
            aria-label="Remove file"
            className="shrink-0"
            size="icon"
            type="button"
            variant="ghost"
            onClick={clearFile}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <input
        {...props}
        ref={inputRef}
        className="sr-only"
        id={id}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          setFileName(file?.name ?? null)
          onFileChange?.(file)
        }}
      />
    </div>
  )
}
