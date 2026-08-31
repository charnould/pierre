import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  formatCommunicationDeliveryLine,
  maskCommunicationRecipient
} from './NotificationRepaymentMeta'

function activity(partial: Partial<Activite> & Pick<Activite, 'type'>): Activite {
  return {
    id: 1,
    date_creation: '2026-08-27T09:54:00.000Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    statut: 'sent',
    mentions: [],
    contenu: '',
    ...partial
  }
}

describe('formatCommunicationDeliveryLine', () => {
  test('compose statut, destinataire masqué et date', () => {
    const line = formatCommunicationDeliveryLine(
      activity({
        type: 'email',
        destinataire: 'caf@example.fr',
        date_statut: '2026-08-27T09:54:00.000Z'
      })
    )
    expect(line).toContain('Envoyé')
    expect(line).toContain('vers c•••@example.fr')
    expect(line).toContain('état au')
  })

  test('masque un téléphone', () => {
    expect(maskCommunicationRecipient('+33612345678')).toBe('••••••••5678')
  })

  test('résume le fallback ou l’échec final dans la même ligne', () => {
    expect(
      formatCommunicationDeliveryLine(
        activity({
          type: 'email',
          statut: 'failed',
          contenu: JSON.stringify({
            version: 1,
            delivery: {
              fallback: {
                scheduled: true,
                medium: 'courrier',
                template_label: 'R1 — Courrier'
              }
            }
          })
        })
      )
    ).toContain('Nouvelle tentative automatique par courrier avec « R1 — Courrier »')
    expect(
      formatCommunicationDeliveryLine(
        activity({
          type: 'sms',
          statut: 'failed',
          contenu: JSON.stringify({
            version: 1,
            delivery: { finalFailure: { status: 'failed' } }
          })
        })
      )
    ).toContain('Aucun autre canal exploitable')
  })

  test('ignore une note ou un statut hors acheminement', () => {
    expect(formatCommunicationDeliveryLine(activity({ type: 'note', statut: 'logged' }))).toBeNull()
    expect(
      formatCommunicationDeliveryLine(activity({ type: 'email', statut: 'logged' }))
    ).toBeNull()
  })
})
