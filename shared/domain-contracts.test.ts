import { describe, expect, test } from 'bun:test'

import { parseCommunicationOpenedContent } from './activity-content'
import { encodeScheduleToCron } from './automations'
import { type BulkDelivery, bulkDeliveryError } from './bulk-operations'
import {
  isNotificationDeliveryStatus,
  type NotificationDeliveryStatus,
  notificationDeliveryStatusBadgeVariant,
  notificationDeliveryStatusLabel
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
  test('maps every provider delivery status to its canonical French label', () => {
    const labels: Record<NotificationDeliveryStatus, string> = {
      queued: 'En file d’attente',
      sent: 'Envoyé',
      delivered: 'Délivré',
      read: 'Lu',
      opened: 'Ouvert',
      received: 'Reçu',
      failed: 'Échec',
      undelivered: 'Non délivré',
      rejected: 'Rejeté',
      bounced: 'Rebond',
      returned: 'Retourné',
      signed: 'Signé',
      refused: 'Refusé',
      unclaimed: 'Non réclamé',
      expired: 'Expiré'
    }

    for (const [status, label] of Object.entries(labels)) {
      expect(notificationDeliveryStatusLabel(status as NotificationDeliveryStatus)).toBe(label)
    }
  })

  test('recognizes terminal provider failures as delivery statuses', () => {
    for (const status of ['undelivered', 'rejected', 'bounced', 'unclaimed'] as const) {
      expect(isNotificationDeliveryStatus(status)).toBe(true)
      expect(notificationDeliveryStatusBadgeVariant(status)).toBe('danger')
    }
  })
})

describe('communication content contracts', () => {
  test('stores RCS choices as typed buttons', () => {
    const base = { version: 2, sender: 'alice@example.org', body: 'Choisissez' }
    expect(
      parseCommunicationOpenedContent(
        JSON.stringify({
          ...base,
          sms_fallback: 'SMS',
          choices: [{ type: 'reply', label: 'Être rappelé' }]
        })
      )
    ).toMatchObject({
      sms_fallback: 'SMS',
      choices: [{ type: 'reply', label: 'Être rappelé' }]
    })
    expect(parseCommunicationOpenedContent(JSON.stringify({ ...base, choices: [] }))).toEqual({
      version: 2,
      sender: 'alice@example.org',
      body: 'Choisissez'
    })
    expect(
      parseCommunicationOpenedContent(JSON.stringify({ ...base, choices: ['Être rappelé'] }))
    ).toBeNull()
    // `{ id, label }` was the stored reply shape before typed buttons.
    expect(
      parseCommunicationOpenedContent(
        JSON.stringify({ ...base, choices: [{ id: 'rappeler', label: 'Être rappelé' }] })
      )?.choices
    ).toEqual([{ type: 'reply', label: 'Être rappelé' }])
    expect(
      parseCommunicationOpenedContent(
        JSON.stringify({
          ...base,
          choices: [{ type: 'reply', label: 'Être rappelé', id: 'legacy' }]
        })
      )?.choices
    ).toEqual([{ type: 'reply', label: 'Être rappelé' }])
    expect(
      parseCommunicationOpenedContent(
        JSON.stringify({
          ...base,
          choices: [
            { type: 'reply', label: 'Transmettre le justificatif' },
            { type: 'reply', label: 'Transmettre le justificatif' }
          ]
        })
      )?.body
    ).toBe('Choisissez')
    expect(
      parseCommunicationOpenedContent(
        JSON.stringify({
          ...base,
          choices: Array.from({ length: 12 }, (_, index) => ({
            type: 'reply',
            label: `B${index}`
          }))
        })
      )?.choices
    ).toHaveLength(12)
  })
})
