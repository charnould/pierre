import { Badge, type BadgeAppearance, type BadgeSize } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

export interface TableCellDisplay {
  text: string
  badgeStyle?: BadgeAppearance
}

interface Props {
  display: TableCellDisplay
  size?: BadgeSize
  numeric?: boolean
  className?: string
}

export function TableCellValue({ display, size = 'data', numeric = false, className }: Props) {
  if (display.badgeStyle) {
    return (
      <Badge
        variant="secondary"
        size={size}
        appearance={display.badgeStyle}
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
