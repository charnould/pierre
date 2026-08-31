import type { KeyboardEvent, ReactNode } from 'react'

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
  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (!onSelect) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect()
  }

  return (
    <li
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group grid min-w-0 items-center gap-15 border-b border-border/60 px-4 py-2',
        DIRECTORY_ROW_COLUMNS,
        onSelect && 'cursor-pointer hover:bg-muted',
        selected && 'bg-muted',
        className
      )}
      onClick={onSelect}
      onKeyDown={onSelect ? handleKeyDown : undefined}
    >
      {children}
    </li>
  )
}
