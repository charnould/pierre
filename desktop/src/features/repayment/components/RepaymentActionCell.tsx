import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import type { RepaymentActionId } from '../lib/repayment-action'
import { RepaymentActionBadge } from './RepaymentActionBadge'

interface Props {
  action: RepaymentActionId
  columnValues?: ColumnValuesConfig
}

export function RepaymentActionCell({ action, columnValues }: Props) {
  return (
    <RepaymentActionBadge
      action={action}
      columnValues={columnValues}
      className="max-w-full text-[0.8125rem]"
    />
  )
}
