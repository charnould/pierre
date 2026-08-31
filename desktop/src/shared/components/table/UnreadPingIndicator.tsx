import { cn } from '@/shared/lib/utils'

type Props = {
  className?: string
}

/** Shared unread signal (tables, sidebar bell, …) — foreground marker. */
export function UnreadPingIndicator({ className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-unread block size-2.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none',
        className
      )}
    />
  )
}
