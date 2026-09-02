import { describe, expect, test } from 'bun:test'

import { encodeScheduleToCron } from './automations'
import { bulkDeliveryError, type BulkDelivery } from './bulk-operations'
import {
  isNotificationDeliveryStatus,
  notificationDeliveryStatusBadgeVariant
} from './notification-delivery'

describe('bulk delivery contracts', () => {
  test('rejects an empty fallback received from an untyped boundary', () => {
    const delivery = { kind: 'fallback', steps: [] } as unknown as BulkDelivery
    expect(bulkDeliveryError(delivery)).toBe('Au moins une étape de livraison est requise.')
  })
})

describe('automation schedule contracts', () => {
  test('rejects invalid times instead of producing invalid cron', () => {
    expect(() => encodeScheduleToCron({ frequency: 'daily', frequencyTime: '99:99' })).toThrow(
      'Invalid time'
    )
    expect(() => encodeScheduleToCron({ frequency: 'daily', frequencyTime: '08:30' })).not.toThrow()
  })
})

describe('notification delivery contracts', () => {
  test('recognizes terminal provider failures as delivery statuses', () => {
    for (const status of ['undelivered', 'rejected', 'bounced', 'unclaimed'] as const) {
      expect(isNotificationDeliveryStatus(status)).toBe(true)
      expect(notificationDeliveryStatusBadgeVariant(status)).toBe('danger')
    }
  })
})
