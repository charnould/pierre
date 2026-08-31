import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  title: string
  align?: 'left' | 'right'
  /** Unified options menu (Filter icon) — always required for one-icon chrome. */
  optionsMenu: ReactNode
  titleClassName?: string
}

export function DataColumnHeader({ title, align = 'left', optionsMenu, titleClassName }: Props) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-0.5',
        align === 'right' && 'justify-end text-end'
      )}
    >
      {title ? (
        <span
          className={cn(
            'text-muted-foreground truncate text-[0.6875rem] font-medium',
            titleClassName
          )}
          title={title}
        >
          {title}
        </span>
      ) : null}
      {optionsMenu}
    </div>
  )
}
