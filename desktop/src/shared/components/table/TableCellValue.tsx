import { Badge } from '@/shared/components/ui/badge'
import type { TicketValueDisplay } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

export type TableCellDisplay = TicketValueDisplay

interface Props {
  display: TableCellDisplay
  numeric?: boolean
  className?: string
}

export function TableCellValue({ display, numeric = false, className }: Props) {
  if (display.badgeStyle) {
    return (
      <Badge
        variant="secondary"
        className={cn('max-w-full min-w-0', numeric && 'tabular-nums', className)}
      >
        <span className="truncate">{display.text}</span>
      </Badge>
    )
  }

  return (
    <span className={cn('truncate', numeric && 'tabular-nums', className)}>{display.text}</span>
  )
}
