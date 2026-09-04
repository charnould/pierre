import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  htmlFor?: string
  label: string
  children: ReactNode
  hint?: string
  error?: string
  className?: string
  contentClassName?: string
}

export function InspectorComposeField({
  htmlFor,
  label,
  children,
  hint,
  error,
  className,
  contentClassName
}: Props) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-xs leading-4 font-medium">
        {label}
      </label>
      <div className={cn('text-sm', contentClassName)}>{children}</div>
      {hint ? <p className="text-muted-foreground text-xs leading-4">{hint}</p> : null}
      {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
    </div>
  )
}
