import type { ReactNode, Ref } from 'react'

import { cn } from '@/shared/lib/utils'

const paneClass =
  'scroll-fade min-h-0 min-w-0 overflow-y-auto overscroll-contain pt-2 pb-4 scrollbar-none outline-none focus:outline-none focus-visible:ring-0'

export function InspectorSplit({
  left,
  right,
  leftRef,
  rightRef,
  className
}: {
  left: ReactNode
  right: ReactNode
  leftRef?: Ref<HTMLDivElement>
  rightRef?: Ref<HTMLDivElement>
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1', className)}>
      <div ref={leftRef} tabIndex={-1} className={cn(paneClass, 'w-2/5 px-4')}>
        {left}
      </div>
      <div
        ref={rightRef}
        tabIndex={-1}
        className={cn(paneClass, 'w-3/5', 'border-border/60 border-s')}
      >
        {right}
      </div>
    </div>
  )
}
