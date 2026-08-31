import { describe, expect, test } from 'bun:test'

import { EMPTY_REPAYMENT_ROW_SIGNAL, repaymentRowSignalAriaLabel } from './repayment-row-signal'

describe('repayment-row-signal', () => {
  test('EMPTY_REPAYMENT_ROW_SIGNAL est sans notification', () => {
    expect(EMPTY_REPAYMENT_ROW_SIGNAL).toEqual({ hasUnread: false })
  })

  test('repaymentRowSignalAriaLabel selon hasUnread', () => {
    expect(repaymentRowSignalAriaLabel({ hasUnread: false })).toBe('Aucune notification')
    expect(repaymentRowSignalAriaLabel({ hasUnread: true })).toBe('Notification non lue')
  })
})
