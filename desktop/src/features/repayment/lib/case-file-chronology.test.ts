import { describe, expect, test } from 'bun:test'

import { chronologyFromActivities, sortChronology } from './case-file-chronology'

const entry = (key: string, date: string, origin: number, editable = true) => ({
  key,
  origin,
  editable,
  item: {
    kind: 'action' as const,
    id: key,
    action: 'Visiter à domicile',
    date_realisation: date,
    commentaire: null
  }
})

describe('case file chronology', () => {
  test('trie du plus ancien au plus récent et garde l’ordre d’insertion à date égale', () => {
    expect(
      sortChronology([
        entry('b', '2026-02-01', 2),
        entry('a', '2026-01-01', 1),
        entry('c', '2026-02-01', 3)
      ]).map((row) => row.key)
    ).toEqual(['a', 'b', 'c'])
  })

  test('reconstruit les actions du plan et fige le reste du dossier', () => {
    const plan = '019a0000-0000-7000-8000-000000000001'
    const item = '11111111-1111-4111-8111-111111111111'
    const thread = `${plan}:${item}`
    const drawer = '33333333-3333-4333-8333-333333333333'
    const rows = chronologyFromActivities(plan, [
      {
        id: 2,
        threadId: thread,
        type: 'task.updated',
        revision: 2,
        contenu: JSON.stringify({
          version: 1,
          task: { title: 'Saisir la CTESI', state: 'completed' },
          completed_on: '2026-04-02',
          result: 'Envoyé'
        })
      },
      {
        id: 1,
        threadId: thread,
        type: 'task.completed',
        revision: 1,
        contenu: JSON.stringify({
          version: 1,
          task: { title: 'Visiter à domicile', state: 'completed' },
          completed_on: '2026-03-01'
        })
      },
      {
        id: 4,
        threadId: `${plan}:22222222-2222-4222-8222-222222222222`,
        type: 'task.deleted',
        revision: 2,
        contenu: JSON.stringify({
          version: 1,
          task: { title: 'Saisir la CCPAPEX', state: 'deleted' },
          completed_on: '2026-01-01'
        })
      },
      {
        id: 5,
        threadId: drawer,
        type: 'task.completed',
        revision: 1,
        createdAt: '2026-02-01T09:00:00Z',
        contenu: JSON.stringify({
          version: 1,
          task: { title: 'Joindre le locataire', state: 'completed' }
        })
      },
      {
        id: 6,
        type: 'case.group_changed',
        createdAt: '2026-02-15T12:00:00Z',
        contenu: JSON.stringify({
          version: 1,
          before: 'Non traités',
          after: 'Amiable',
          note: 'Accord oral'
        })
      }
    ])
    expect(rows).toEqual([
      {
        key: `task:${drawer}`,
        origin: 5,
        editable: false,
        item: {
          kind: 'action',
          id: drawer,
          action: 'Joindre le locataire',
          date_realisation: '2026-02-01',
          commentaire: null
        }
      },
      {
        key: 'phase:6',
        origin: 6,
        editable: false,
        before: 'Non traités',
        item: {
          kind: 'phase',
          phase: 'Amiable',
          date_realisation: '2026-02-15',
          commentaire: 'Accord oral'
        }
      },
      {
        key: item,
        origin: 1,
        editable: true,
        item: {
          kind: 'action',
          id: item,
          action: 'Saisir la CTESI',
          date_realisation: '2026-04-02',
          commentaire: 'Envoyé'
        }
      }
    ])
  })
})
