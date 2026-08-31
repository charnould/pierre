import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/** Matches compose CTA text (Button outline overrides). */
const FACT_TEXT = 'text-foreground min-w-0 truncate text-xs leading-4 font-normal'

/** Icon + text row; container padding matches CTA px-3 / gap-2. */
export function InspectorFactLine({
  icon: Icon,
  label,
  children,
  className
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Icon className="text-foreground size-3.5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="sr-only">{label} : </span>
        {children}
      </div>
    </div>
  )
}

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
