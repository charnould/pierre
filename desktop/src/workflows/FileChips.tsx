import { Paperclip, X } from 'lucide-react'

import type { FileEntry } from '@/components/workflow/WorkflowPanelChrome'

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
          className="text-muted-foreground inline-flex items-center gap-1 text-xs"
        >
          <Paperclip className="h-2.5 w-2.5" />
          {f.name}
          <button
            type="button"
            className="ml-0.5 cursor-pointer opacity-40 hover:opacity-100"
            onClick={() => onRemove(i)}
            aria-label={`Retirer ${f.name}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
    </div>
  )
}
