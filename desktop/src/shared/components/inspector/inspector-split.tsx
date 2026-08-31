import type { ReactNode, Ref } from 'react'

import { cn } from '@/shared/lib/utils'

/** Inspector overlay width: 24 rem present + 36 rem history. */
const INSPECTOR_DRAWER_WIDTH_CLASS = 'data-[swipe-axis=x]:sm:[--drawer-content-width:60rem]'

/** Shared shell for right-side business Inspectors. */
export const INSPECTOR_DRAWER_CLASS = [
  INSPECTOR_DRAWER_WIDTH_CLASS,
  'inspector-drawer-motion rounded-md border shadow-md',
  '[--drawer-bleed-background:transparent] [--drawer-inset:0.75rem]'
].join(' ')

/** Inbox / suivi — même pane que le présent Inspector. */
export const INBOX_DRAWER_WIDTH_CLASS = 'data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]'

const paneClass =
  'scroll-fade min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-4 scrollbar-none outline-none focus:outline-none focus-visible:ring-0'

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
    <div data-inspector-motion="body" className={cn('flex min-h-0 min-w-0 flex-1', className)}>
      <div ref={leftRef} tabIndex={-1} className={cn(paneClass, 'w-2/5')}>
        {left}
      </div>
      <div
        ref={rightRef}
        tabIndex={-1}
        className={cn(paneClass, 'w-3/5', 'border-s border-border/60')}
      >
        {right}
      </div>
    </div>
  )
}
