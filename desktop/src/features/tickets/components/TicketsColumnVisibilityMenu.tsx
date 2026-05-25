import { Columns3 } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/shared/components/ui/dialog'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import { DEFAULT_PINNED_COLUMNS } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import type { TicketsColumnMeta } from '@/shared/types'

interface Props {
  columns: TicketsColumnMeta[]
  settings: UiSettings
  hiddenColumns: string[]
  pinnedColumns: string[] | undefined
  onHiddenChange: (hiddenColumns: string[]) => void
  onPinnedChange: (pinnedColumns: string[]) => void
  triggerClassName?: string
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-tickets-chrome-fg text-xs font-medium">{children}</h3>
}

export function TicketsColumnVisibilityMenu({
  columns,
  settings,
  hiddenColumns,
  pinnedColumns,
  onHiddenChange,
  onPinnedChange,
  triggerClassName
}: Props) {
  const hiddenSet = new Set(hiddenColumns)
  const effectivePinned = pinnedColumns ?? DEFAULT_PINNED_COLUMNS
  const pinnedSet = new Set(effectivePinned)

  const toggleColumn = (name: string, visible: boolean) => {
    const nextHidden = new Set(hiddenSet)
    if (visible) nextHidden.delete(name)
    else nextHidden.add(name)
    onHiddenChange(Array.from(nextHidden))
  }

  const togglePin = (name: string, pinned: boolean) => {
    const next = new Set(effectivePinned)
    if (pinned) next.add(name)
    else next.delete(name)
    onPinnedChange(Array.from(next))
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className={triggerClassName ?? 'h-8 gap-1.5 font-medium'}>
            <Columns3 className="size-3.5" />
            Colonnes
          </button>
        }
      />
      <DialogContent className="flex max-h-[70vh] w-96 flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>Colonnes</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
            <section className="space-y-2">
              <SectionTitle>Colonnes visibles</SectionTitle>
              <ul className="space-y-1">
                {columns.map(({ name }) => (
                  <li key={name}>
                    <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border"
                        checked={!hiddenSet.has(name)}
                        onChange={(e) => toggleColumn(name, e.target.checked)}
                      />
                      <span className="truncate">{resolveTicketColumnLabel(name, settings)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <div className="bg-border h-px" />

            <section className="space-y-2">
              <SectionTitle>Épingler à gauche</SectionTitle>
              <ul className="space-y-1">
                {columns.map(({ name }) => {
                  const isHidden = hiddenSet.has(name)
                  return (
                    <li key={`pin-${name}`}>
                      <label
                        className={cn(
                          'flex items-center gap-2 rounded-md px-1 py-1.5 text-sm',
                          isHidden
                            ? 'text-muted-foreground cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-muted/50'
                        )}
                        title={isHidden ? "Rendre la colonne visible pour l'épingler" : undefined}
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={!isHidden && pinnedSet.has(name)}
                          disabled={isHidden}
                          onChange={(e) => togglePin(name, e.target.checked)}
                        />
                        <span className="truncate">{resolveTicketColumnLabel(name, settings)}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
