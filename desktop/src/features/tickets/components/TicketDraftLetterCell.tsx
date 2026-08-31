import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface GroupProps extends ComponentProps<'div'> {
  children: ReactNode
}

export function TicketDraftNpirGroup({ className, children, ...props }: GroupProps) {
  return (
    <div
      role="group"
      aria-label="Brouillons N P I R"
      className={cn('flex h-full w-full items-center justify-center', className)}
      {...props}
    >
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

interface LetterProps {
  letter: string
  hasDraft: boolean
  disabled?: boolean
  tooltip: string
  onClick?: () => void
}

export function TicketDraftLetterCell({
  letter,
  hasDraft,
  disabled = false,
  tooltip,
  onClick
}: LetterProps) {
  if (disabled) {
    return (
      <span
        className="inline-flex size-4 shrink-0 items-center justify-center truncate text-xs uppercase"
        title={tooltip}
      >
        {letter}
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className={cn('size-4 text-xs uppercase', hasDraft ? 'font-semibold' : 'font-normal')}
      aria-label={tooltip}
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {letter}
    </Button>
  )
}

interface DotProps {
  hasDraft: boolean
  isAutomation?: boolean
  tooltip: string
  onClick?: () => void
}

export function TicketDraftDotCell({ hasDraft, isAutomation = false, tooltip, onClick }: DotProps) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="size-4"
      aria-label={tooltip}
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full',
          hasDraft && isAutomation && 'bg-primary ring-background animate-pulse ring-2',
          hasDraft && !isAutomation && 'bg-foreground',
          !hasDraft && 'bg-foreground/25'
        )}
      />
    </Button>
  )
}
