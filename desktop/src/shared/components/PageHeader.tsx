import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Page chrome for Document surfaces only. */
export function PageHeader({ title, meta, actions, className }: Props) {
  return (
    <header className={cn('flex flex-wrap items-center gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="pierre-display">{title}</h1>
        {meta ? <p className="pierre-meta mt-1 truncate">{meta}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
