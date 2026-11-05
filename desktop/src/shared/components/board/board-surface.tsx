import { RefreshCw } from 'lucide-react'
import { type ReactNode, type RefObject, useRef } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const titleType = 'm-0 font-sans text-lg leading-6 font-medium text-balance'
const metaType = 'text-muted-foreground shrink-0 font-sans text-sm leading-5 font-normal'

export function BoardCanvas({
  toolbar,
  children
}: {
  toolbar: ReactNode
  children: (scrollRef: RefObject<HTMLDivElement | null>) => ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4">{toolbar}</div>
      <div
        ref={scrollRef}
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        {children(scrollRef)}
      </div>
    </div>
  )
}

export function BoardPhaseSection({
  title,
  meta,
  actions,
  note,
  empty = false,
  children
}: {
  title: string
  meta: string
  actions?: ReactNode
  note?: string
  empty?: boolean
  children?: ReactNode
}) {
  return (
    <section
      data-empty={empty ? true : undefined}
      className="border-border/60 border-t first:border-t-0"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className={titleType}>{title}</h2>
          <span className={metaType} aria-hidden>
            ·
          </span>
          <span className={cn(metaType, 'tabular-nums')}>{meta}</span>
        </div>
        {!empty && actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </header>
      {!empty && note ? (
        <p className="text-muted-foreground px-4 pb-4 text-sm leading-5">{note}</p>
      ) : null}
      {empty ? null : children}
    </section>
  )
}

export function BoardRefreshButton({
  loading,
  onRefresh
}: {
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex w-full items-center justify-end">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onRefresh}>
        <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : undefined} />
        Actualiser
      </Button>
    </div>
  )
}

export function BoardStatusLine({
  children,
  alert = false
}: {
  children: ReactNode
  alert?: boolean
}) {
  return (
    <p
      className="text-muted-foreground px-4 py-4 text-sm leading-5"
      role={alert ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}

export function BoardSelectionToolbar({
  count,
  noun,
  disabled,
  onClear,
  onAct
}: {
  count: number
  noun: 'dossier' | 'réclamation'
  disabled: boolean
  onClear: () => void
  onAct: () => void
}) {
  const label = `${count} ${noun}${count > 1 ? 's' : ''}`
  return (
    <div className="flex w-full items-center gap-2">
      <p className="text-sm font-medium tabular-nums" aria-live="polite">
        {label}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onClear}>
        Désélectionner
      </Button>
      <Button type="button" size="sm" disabled={disabled} onClick={onAct}>
        Agir sur {label}
      </Button>
    </div>
  )
}
