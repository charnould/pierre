import { describe, expect, it } from 'bun:test'

import type { ActiviteListItem } from '@/shared/types/activites'

import { activityToTarget, mapActivityRow } from './notification-types'

function sampleRow(overrides: Partial<ActiviteListItem> = {}): ActiviteListItem {
  return {
    id: 10,
    date_creation: '2026-08-17T10:00:00',
    rattachement: 'repayment:LOC-9',
    auteur: 'user:bob@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-9',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [{ destinataire: 'user:alice@exemple.fr', lu: false, boost: null }],
    contenu: JSON.stringify({ version: 1, note: 'Relance' }),
    my: { destinataire: 'user:alice@exemple.fr', lu: false, boost: null },
    ...overrides
  }
}

describe('mapActivityRow', () => {
  it('maps a boost notification to a dedicated body and the source activity id', () => {
    const row = sampleRow({
      id: 99,
      type: 'activity_boost',
      contenu: JSON.stringify({
        version: 1,
        activite_source_id: 10,
        type_activite_source: 'note',
        emoji: '👍'
      }),
      mentions: [{ destinataire: 'user:alice@exemple.fr', lu: false, boost: null }],
      my: { destinataire: 'user:alice@exemple.fr', lu: false, boost: null }
    })
    const item = mapActivityRow(row, 'LOC-9', 'Impayés')
    expect(item.id).toBe(99)
    expect(item.notificationId).toBe(99)
    expect(item.body).toBe('a boosté votre note 👍')
    expect(item.boostEmoji).toBe('👍')
    expect(item.sender).toBe('bob@exemple.fr')
    expect(item.isRead).toBe(false)
    expect(item.target).toEqual({
      view: 'repayment',
      tenantId: 'LOC-9',
      idClient: 'CLI-1',
      activityId: 10
    })
  })

  it('keeps a regular mention targeted at itself', () => {
    const item = mapActivityRow(sampleRow(), 'LOC-9', 'Impayés')
    expect(item.body).toBe('Relance')
    expect(item.boostEmoji).toBeUndefined()
    const target = activityToTarget(sampleRow())
    expect(target).toEqual({
      view: 'repayment',
      tenantId: 'LOC-9',
      idClient: 'CLI-1',
      activityId: 10
    })
  })
})
