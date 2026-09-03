import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/** Matches compose CTA text (Button outline overrides). */
const FACT_TEXT = 'text-foreground min-w-0 truncate text-xs leading-4 font-normal'

export function InspectorFactText({
  children,
  title,
  className
}: {
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <span className={cn(FACT_TEXT, className)} title={title}>
      {children}
    </span>
  )
}
