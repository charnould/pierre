import { useUiSettings } from '@/contexts/UiSettingsContext'
import {
  resolveTicketValueDisplay,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

interface Props {
  column: string
  value: unknown
  columnValues?: ColumnValuesConfig
  className?: string
}

export function TicketCellValue({ column, value, columnValues, className }: Props) {
  const { settings } = useUiSettings()
  const tableSettings = settings.tickets?.table
  const resolvedColumnValues = columnValues ?? tableSettings?.columnValues
  const display = resolveTicketValueDisplay(
    column,
    value,
    resolvedColumnValues,
    tableSettings?.columnValueBadge
  )

  if (display.badgeStyle) {
    const { background, color } = display.badgeStyle
    return (
      <span
        className={cn(
          'ticket-value-badge inline-flex h-5 w-fit max-w-full min-w-0 shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 text-xs font-medium whitespace-nowrap',
          className
        )}
        style={{ backgroundColor: background, color }}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
        <span className="truncate">{display.text}</span>
      </span>
    )
  }

  return <span className={cn('truncate text-xs text-foreground', className)}>{display.text}</span>
}
