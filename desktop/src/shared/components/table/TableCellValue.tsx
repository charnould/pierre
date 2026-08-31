import { Badge } from '@/shared/components/ui/badge'
import {
  colorizeBadgeStyle,
  type TicketValueBadgeStyle
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

export interface TableCellDisplay {
  text: string
  badgeStyle?: TicketValueBadgeStyle
}

interface Props {
  display: TableCellDisplay
  className?: string
}

export function TableCellValue({ display, className }: Props) {
  if (display.badgeStyle) {
    return (
      <Badge
        variant="secondary"
        className={cn('max-w-full min-w-0 text-[0.8125rem]', className)}
        style={colorizeBadgeStyle(display.badgeStyle)}
      >
        <span className="truncate">{display.text}</span>
      </Badge>
    )
  }

  return <span className={cn('truncate', className)}>{display.text}</span>
}
