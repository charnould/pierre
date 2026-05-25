import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/** Flat output dock bar — lives in CardFooter, aligned with the form primary action. */
export function DockToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'output-dock flex w-full min-w-0 items-center gap-2 overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  )
}
