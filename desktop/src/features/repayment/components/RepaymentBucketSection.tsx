import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

import { formatEuro } from '../lib/format-repayment'
import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'

interface Props {
  bucket: RepaymentBucketId
  /** Dossiers visibles dans la vue (après filtres), pas le total bucket brut. */
  visibleCount: number
  /** Somme des soldes des dossiers visibles (après filtres). */
  totalSolde: number
  actions?: ReactNode
  children: ReactNode
  className?: string
}

const titleType = 'font-sans text-xl leading-6 font-semibold tracking-tight text-balance'
const metaType =
  'shrink-0 font-sans text-xl leading-6 font-medium tracking-tight text-muted-foreground'

export function RepaymentBucketSection({
  bucket,
  visibleCount,
  totalSolde,
  actions,
  children,
  className
}: Props) {
  const { label: title } = getRepaymentBucketMeta(bucket)
  const headerRef = useRef<HTMLElement>(null)
  const [chromeHeight, setChromeHeight] = useState(0)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return

    const sync = () => setChromeHeight(Math.ceil(el.getBoundingClientRect().height))
    sync()

    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const countLabel = `${visibleCount} dossier${visibleCount === 1 ? '' : 's'}`

  return (
    <section
      className={cn(
        'flex w-full min-w-0 flex-col bg-background [&:first-child>header]:border-t-0',
        className
      )}
      style={{ '--repayment-bucket-chrome-height': `${chromeHeight}px` } as CSSProperties}
    >
      <header
        ref={headerRef}
        className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-b py-2 ps-4 pe-2"
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className={cn('m-0', titleType)}>{title}</h2>
          <span className={metaType} aria-hidden>
            ·
          </span>
          <span className={cn(metaType, 'tabular-nums')}>{countLabel}</span>
          <span className={metaType} aria-hidden>
            ·
          </span>
          <span className={cn(metaType, 'tabular-nums')}>{formatEuro(totalSolde)}</span>
        </div>
        {actions}
      </header>
      <div className="bg-background w-full min-w-0">{children}</div>
    </section>
  )
}
