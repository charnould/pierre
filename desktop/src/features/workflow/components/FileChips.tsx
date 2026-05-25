import { Paperclip, X } from 'lucide-react'

import type { FileEntry } from '@/features/workflow/components/WorkflowPanelChrome'
import { cn } from '@/shared/lib/utils'

export function FileChips({
  files,
  onRemove
}: {
  files: FileEntry[]
  onRemove: (i: number) => void
}) {
  if (files.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f, i) => (
        <span
          key={f.name + f.size}
          className={cn(
            'bg-muted/40 text-muted-foreground inline-flex max-w-full min-w-0 items-center gap-1.5',
            'rounded-lg border border-border/40 px-2 py-1 text-xs shadow-xs'
          )}
        >
          <Paperclip className="size-3 shrink-0 opacity-60" strokeWidth={1.75} />
          <span className="truncate">{f.name}</span>
          <button
            type="button"
            className="text-muted-foreground/50 hover:text-foreground ml-0.5 shrink-0 cursor-pointer transition-colors"
            onClick={() => onRemove(i)}
            aria-label={`Retirer ${f.name}`}
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        </span>
      ))}
    </div>
  )
}
