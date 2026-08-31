import { useUiSettings } from '@/contexts/UiSettingsContext'
import { TableCellValue } from '@/shared/components/table/TableCellValue'
import {
  resolveTicketValueDisplay,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

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

  return <TableCellValue display={display} className={className} />
}
