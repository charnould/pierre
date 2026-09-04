import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  title: string
  metadata: readonly ReactNode[]
  actions?: ReactNode
  children: ReactNode
  className?: string
}

const titleType = 'font-sans text-xl leading-6 font-semibold tracking-tight text-balance'
const metaType =
  'shrink-0 font-sans text-xl leading-6 font-medium tracking-tight text-muted-foreground'

export function BoardTableSection({ title, metadata, actions, children, className }: Props) {
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return

    const sync = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height))
    sync()

    const observer = new ResizeObserver(sync)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className={cn(
        'flex w-full min-w-0 flex-col bg-background [&:first-child>header]:border-t-0',
        className
      )}
      style={{ '--board-table-section-height': `${headerHeight}px` } as CSSProperties}
    >
      <header
        ref={headerRef}
        className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-b py-2 ps-4 pe-2"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className={cn('m-0 min-w-0', titleType)}>{title}</h2>
          {metadata.map((value, index) => (
            <span key={index} className="flex min-w-0 items-baseline gap-2">
              <span className={metaType} aria-hidden>
                ·
              </span>
              <span className={cn(metaType, 'min-w-0 tabular-nums')}>{value}</span>
            </span>
          ))}
        </div>
        {actions}
      </header>
      <div className="bg-background w-full min-w-0">{children}</div>
    </section>
  )
}
