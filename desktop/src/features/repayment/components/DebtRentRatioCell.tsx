import { TableCellValue } from '@/shared/components/table/TableCellValue'
import {
  resolveTicketValueDisplay,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

import { formatDebtRentRatioMonths } from '../lib/format-repayment'

interface Props {
  ratio: number | null | undefined
  columnValues?: ColumnValuesConfig
}

export function DebtRentRatioCell({ ratio, columnValues }: Props) {
  if (ratio == null || ratio <= 0) {
    return <span className="text-muted-foreground truncate tabular-nums">—</span>
  }

  const label = formatDebtRentRatioMonths(ratio)
  const display = resolveTicketValueDisplay('ratio_dette_loyer', label, columnValues)

  return <TableCellValue display={display} className="tabular-nums" />
}
