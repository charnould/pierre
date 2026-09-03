import { TableCellValue } from '@/shared/components/table/TableCellValue'
import {
  resolveTicketValueDisplay,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

interface Props {
  column: string
  value: unknown
  columnValues?: ColumnValuesConfig
  numeric?: boolean
  className?: string
}

export function RepaymentCellValue({ column, value, columnValues, numeric, className }: Props) {
  const display = resolveTicketValueDisplay(column, value, columnValues)

  return <TableCellValue display={display} numeric={numeric} className={className} />
}
