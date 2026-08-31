import type { ReactNode } from 'react'

import { Timeline } from '@/shared/components/reui/timeline'
import { cn } from '@/shared/lib/utils'

interface Props {
  children: ReactNode
  className?: string
  defaultValue?: number
}

/** Product timeline shell — thin ReUI `Timeline` wrapper. */
export function ContextTimeline({ children, className, defaultValue = 9999 }: Props) {
  return (
    <Timeline defaultValue={defaultValue} className={cn('px-3', className)}>
      {children}
    </Timeline>
  )
}
