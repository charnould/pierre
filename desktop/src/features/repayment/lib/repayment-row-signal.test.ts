import { describe, expect, test } from 'bun:test'

import {
  EMPTY_REPAYMENT_ROW_SIGNAL,
  repaymentRowSignalAriaLabel,
  unreadRepaymentTenantKey
} from './repayment-row-signal'

describe('repayment-row-signal', () => {
  test('EMPTY_REPAYMENT_ROW_SIGNAL est sans notification', () => {
    expect(EMPTY_REPAYMENT_ROW_SIGNAL).toEqual({ hasUnread: false })
  })

  test('repaymentRowSignalAriaLabel selon hasUnread', () => {
    expect(repaymentRowSignalAriaLabel({ hasUnread: false })).toBe('Aucune notification')
    expect(repaymentRowSignalAriaLabel({ hasUnread: true })).toBe('Notification non lue')
  })

  test('indexe seulement les dossiers d’impayés non lus', () => {
    const first = unreadRepaymentTenantKey([
      { rattachement: 'repayment:LOC-2', read: false },
      { rattachement: 'tickets:REC-1', read: false },
      { rattachement: 'repayment:LOC-1', read: false },
      { rattachement: 'repayment:LOC-3', read: true }
    ])
    const same = unreadRepaymentTenantKey([
      { rattachement: 'repayment:LOC-1', read: false },
      { rattachement: 'repayment:LOC-2', read: false }
    ])

    expect(first).toBe('LOC-1\0LOC-2')
    expect(same).toBe(first)
    expect(unreadRepaymentTenantKey([])).toBe('')
  })
})
