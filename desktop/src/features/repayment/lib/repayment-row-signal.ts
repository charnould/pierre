export type RepaymentRowSignal = {
  hasUnread: boolean
}

const REPAYMENT_REF_PREFIX = 'repayment:'

/** Stable key of unread repayment refs. Same tenants keep the same string. */
export function unreadRepaymentTenantKey(
  rows: readonly { rattachement: string; read?: boolean }[]
): string {
  const ids: string[] = []
  for (const row of rows) {
    if (row.read !== false || !row.rattachement.startsWith(REPAYMENT_REF_PREFIX)) continue
    ids.push(row.rattachement.slice(REPAYMENT_REF_PREFIX.length))
  }
  ids.sort()
  return ids.join('\0')
}

export const EMPTY_REPAYMENT_ROW_SIGNAL: RepaymentRowSignal = {
  hasUnread: false
}

export function repaymentRowSignalAriaLabel(signal: RepaymentRowSignal): string {
  return signal.hasUnread ? 'Notification non lue' : 'Aucune notification'
}
