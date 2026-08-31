export type RepaymentRowSignal = {
  hasUnread: boolean
}

export const EMPTY_REPAYMENT_ROW_SIGNAL: RepaymentRowSignal = {
  hasUnread: false
}

export function repaymentRowSignalAriaLabel(signal: RepaymentRowSignal): string {
  return signal.hasUnread ? 'Notification non lue' : 'Aucune notification'
}
