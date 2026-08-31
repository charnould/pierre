import { TIMELINE_CONTENT_INSET_CLASS } from '@/shared/components/timeline/timeline-layout'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'

interface Props {
  variant: 'repayment' | 'ticket'
  pane: 'present' | 'history'
}

const skeletonClass = 'motion-reduce:animate-none'
const nodeClass = 'absolute top-0 -left-6 size-8 -translate-x-1/2 rounded-full'
const railClass = 'bg-input absolute top-8 bottom-0 -left-6 w-px -translate-x-1/2'

function TimelineRow({ last = false }: { last?: boolean }) {
  return (
    <li className={cn('relative pb-4', TIMELINE_CONTENT_INSET_CLASS, last && 'pb-0')}>
      <Skeleton className={cn(nodeClass, skeletonClass)} />
      {!last ? <span aria-hidden className={railClass} /> : null}
      <div className="flex min-w-0 flex-col gap-2.5">
        <Skeleton className={cn('h-3.5 w-40', skeletonClass)} />
        <Skeleton className={cn('h-3 w-24', skeletonClass)} />
        <Skeleton className={cn('h-3.5 w-full', skeletonClass)} />
        <Skeleton className={cn('h-3.5 w-2/3', skeletonClass)} />
      </div>
    </li>
  )
}

function PresentVerbs({ variant }: { variant: Props['variant'] }) {
  const widths =
    variant === 'ticket'
      ? ['w-48', 'w-56', 'w-64', 'w-56']
      : ['w-44', 'w-40', 'w-36', 'w-40', 'w-48', 'w-36']

  return (
    <div className="flex flex-col gap-1.5">
      {widths.map((width, index) => (
        <Skeleton
          key={`${variant}-${index}`}
          className={cn('h-8 max-w-full rounded-md', width, skeletonClass)}
        />
      ))}
    </div>
  )
}

export function InspectorTimelineSkeleton({ variant, pane }: Props) {
  if (pane === 'present') {
    return (
      <div role="status" aria-live="polite" aria-label="Chargement du dossier">
        <PresentVerbs variant={variant} />
      </div>
    )
  }

  return (
    <ol
      className="relative m-0 flex list-none flex-col p-0 px-3"
      role="status"
      aria-live="polite"
      aria-label="Chargement du dossier"
    >
      <TimelineRow />
      <TimelineRow last />
    </ol>
  )
}
