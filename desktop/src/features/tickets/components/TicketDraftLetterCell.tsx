import type { ComponentProps, ReactNode } from 'react'

import { TICKETS_COLUMN_HEADER_TITLE_CLASS } from '@/features/tickets/components/TicketsColumnHeader'
import { cn } from '@/shared/lib/utils'

export const DRAFT_NPIR_LETTER_CLASS = 'text-[10px] uppercase leading-none tracking-tight'

const DRAFT_NPIR_SEGMENT_CLASS = 'inline-flex m-0 w-2 shrink-0 items-center justify-center'

const DRAFT_NPIR_BUTTON_CLASS =
  'gap-0 rounded-none border-0 p-0 shadow-none outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

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
        className={cn(TICKETS_COLUMN_HEADER_TITLE_CLASS, DRAFT_NPIR_SEGMENT_CLASS, 'truncate px-0')}
        title={tooltip}
      >
        {letter}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        DRAFT_NPIR_LETTER_CLASS,
        DRAFT_NPIR_SEGMENT_CLASS,
        DRAFT_NPIR_BUTTON_CLASS,
        hasDraft
          ? 'bg-foreground/[0.06] font-semibold text-foreground shadow-[var(--elevation-pill-inset)] hover:bg-foreground/[0.09]'
          : 'bg-transparent font-normal text-foreground/35 hover:bg-muted/20 hover:text-foreground/55'
      )}
      aria-label={tooltip}
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {letter}
    </button>
  )
}

const DRAFT_NPIR_DOT_BUTTON_CLASS =
  'rounded-none border-0 bg-transparent p-0 shadow-none outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 hover:opacity-80'

interface DotProps {
  hasDraft: boolean
  isAutomation?: boolean
  tooltip: string
  onClick?: () => void
}

export function TicketDraftDotCell({ hasDraft, isAutomation = false, tooltip, onClick }: DotProps) {
  return (
    <button
      type="button"
      className={cn(DRAFT_NPIR_SEGMENT_CLASS, DRAFT_NPIR_DOT_BUTTON_CLASS)}
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
          'size-2 shrink-0 rounded-full transition-colors',
          hasDraft && isAutomation && 'draft-npir-dot--automation',
          hasDraft && !isAutomation && 'bg-foreground shadow-[var(--elevation-pill-inset)]',
          !hasDraft && 'bg-foreground/25'
        )}
      />
    </button>
  )
}
