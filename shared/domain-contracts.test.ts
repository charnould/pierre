import { describe, expect, test } from 'bun:test'

import { parseCommunicationOpenedContent } from './activity-content'
import { type BulkDelivery, bulkDeliveryError } from './bulk-operations'
import {
  isNotificationDeliveryStatus,
  type NotificationDeliveryStatus,
  notificationDeliveryStatusBadgeVariant,
  notificationDeliveryStatusLabel
} from './notification-delivery'
import {
  DEFAULT_AUTOMATION_SCHEDULE,
  formatScheduleSummary,
  switchScheduleFrequency
} from './schedule'

describe('bulk delivery contracts', () => {
  test('rejects an empty fallback received from an untyped boundary', () => {
    const delivery = { kind: 'fallback', steps: [] } as unknown as BulkDelivery
    expect(bulkDeliveryError(delivery)).toBe('Au moins une étape de livraison est requise.')
  })
})

describe('schedule contracts', () => {
  test('switches frequencies while preserving time/day and formats French summaries', () => {
    const switched = switchScheduleFrequency(
      { frequency: 'monthly', dayOfMonth: 15, hour: 9, minute: 30 },
      'months'
    )
    expect(switched).toEqual({
      frequency: 'months',
      months: [1],
      dayOfMonth: 15,
      hour: 9,
      minute: 30
    })
    expect(formatScheduleSummary(DEFAULT_AUTOMATION_SCHEDULE)).toBe('Les lundis à 08:00')
    expect(
      formatScheduleSummary({
        frequency: 'months',
        months: [3, 6, 9, 12],
        dayOfMonth: 15,
        hour: 9,
        minute: 0
      })
    ).toBe('Le 15 de mars, juin, sept. et déc. à 09:00')
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
    const base = { version: 1, sender: 'alice@example.org', body: 'Choisissez' }
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
      version: 1,
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
