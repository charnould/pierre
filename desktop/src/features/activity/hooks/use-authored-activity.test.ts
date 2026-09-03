import { describe, expect, it } from 'bun:test'

import type { ActiviteListItem } from '@/shared/types/activites'

import { mapAuthoredActivityRows } from './use-authored-activity'

function row(overrides: Partial<ActiviteListItem> = {}): ActiviteListItem {
  return {
    id: 1,
    date_creation: '2026-08-21T10:00:00',
    rattachement: 'tickets:REC-1',
    auteur: 'user:alice@example.test',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'ticket.field_changed',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({
      version: 2,
      field: 'statut',
      before: 'ouvert',
      after: 'clos'
    }),
    my: null,
    read: true,
    reaction: null,
    ...overrides
  }
}

describe('mapAuthoredActivityRows', () => {
  it('marque les événements suivis comme activité sans état de lecture', () => {
    const [item] = mapAuthoredActivityRows([row()])

    expect(item?.source).toBe('activity')
    expect(item?.isRead).toBe(true)
    expect(item?.row).toEqual(row())
    expect(item?.contextLabel).toBe('Réclamation #REC-1')
    expect(item?.target).toEqual({
      view: 'tickets',
      id_reclamation: 'REC-1',
      activityId: 1
    })
  })

  it('conserve le row brut d’un changement de groupe', () => {
    const [item] = mapAuthoredActivityRows([
      row({
        rattachement: 'repayment:LOC-1',
        type: 'case.group_changed',
        contenu: JSON.stringify({
          version: 2,
          before: 'amiable',
          after: 'pre_contentieux',
          note: 'Échec des relances amiables.'
        })
      })
    ])

    expect(item?.row?.type).toBe('case.group_changed')
    expect(item?.moduleLabel).toBe('Impayés')
    expect(item?.row).toBeDefined()
  })

  it('conserve les traitements de masse visibles mais non ouvrables dans un Inspector', () => {
    const [item] = mapAuthoredActivityRows([
      row({
        rattachement: 'bulk:TRAITEMENT-1',
        type: 'bulk.ran',
        contenu: JSON.stringify({ version: 2, title: 'Traitement 1' })
      })
    ])

    expect(item?.moduleLabel).toBe('Traitements de masse')
    expect(item?.target).toBeNull()
  })

  it('ignore les rattachements inconnus', () => {
    expect(mapAuthoredActivityRows([row({ rattachement: 'legacy:1' })])).toEqual([])
  })
})
