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

export function RepaymentCellValue({ column, value, columnValues, className }: Props) {
  const display = resolveTicketValueDisplay(column, value, columnValues)

  return <TableCellValue display={display} className={className} />
}
