import { UnreadPingIndicator } from '@/shared/components/table/UnreadPingIndicator'

import {
  EMPTY_REPAYMENT_ROW_SIGNAL,
  repaymentRowSignalAriaLabel,
  type RepaymentRowSignal
} from '../lib/repayment-row-signal'

type Props = {
  signal: RepaymentRowSignal | null | undefined
}

export function RepaymentAlertesCell({ signal }: Props) {
  const resolved = signal ?? EMPTY_REPAYMENT_ROW_SIGNAL
  const label = repaymentRowSignalAriaLabel(resolved)

  if (!resolved.hasUnread) {
    return <div className="flex items-center justify-center" aria-label={label} />
  }

  return (
    <div className="flex items-center justify-center" role="img" aria-label={label} title={label}>
      <UnreadPingIndicator />
    </div>
  )
}
