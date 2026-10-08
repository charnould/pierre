import { type KeyboardEvent, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/utils'

/** Shared tracks so every Directory row aligns. Identity + access + generation + actions. */
const DIRECTORY_ROW_COLUMNS = 'grid-cols-[24rem_minmax(0,1fr)_max-content_7.5rem]'

interface DirectoryListProps {
  children: ReactNode
  className?: string
}

export function DirectoryList({ children, className }: DirectoryListProps) {
  return <ul className={cn('flex min-w-0 flex-col', className)}>{children}</ul>
}

interface DirectoryRowProps {
  selected?: boolean
  onSelect?: () => void
  children: ReactNode
  className?: string
}

export function DirectoryRow({
  selected = false,
  onSelect,
  children,
  className
}: DirectoryRowProps) {
  const labelId = useId()

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect?.()
  }

  return (
    <li
      className={cn(
        'group border-border/60 relative grid min-w-0 items-center gap-15 border-b px-4 py-2',
        DIRECTORY_ROW_COLUMNS,
        onSelect && 'hover:bg-muted cursor-pointer',
        selected && 'bg-muted',
        className
      )}
      onClick={onSelect}
    >
      {onSelect ? (
        <span
          role="button"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-current={selected ? 'true' : undefined}
          className="pointer-events-none absolute inset-0"
          onKeyDown={handleKeyDown}
        />
      ) : null}
      {onSelect ? (
        <div id={labelId} className="col-span-full grid min-w-0 grid-cols-subgrid items-center">
          {children}
        </div>
      ) : (
        children
      )}
    </li>
  )
}
