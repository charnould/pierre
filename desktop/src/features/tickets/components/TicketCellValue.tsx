import { useUiSettings } from '@/contexts/UiSettingsContext'
import { TableCellValue } from '@/shared/components/table/TableCellValue'
import {
  type ColumnValuesConfig,
  resolveTicketValueDisplay
} from '@/shared/lib/ui-settings/tickets-table'

interface Props {
  column: string
  value: unknown
  columnValues?: ColumnValuesConfig
  numeric?: boolean
  className?: string
}

export function TicketCellValue({ column, value, columnValues, numeric, className }: Props) {
  const { settings } = useUiSettings()
  const tableSettings = settings.tickets?.table
  const resolvedColumnValues = columnValues ?? tableSettings?.columnValues
  const display = resolveTicketValueDisplay(
    column,
    value,
    resolvedColumnValues,
    tableSettings?.columnValueBadge
  )

  return <TableCellValue display={display} numeric={numeric} className={className} />
}
