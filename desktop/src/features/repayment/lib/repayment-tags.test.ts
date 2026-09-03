import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'
import type { Activite } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'
import {
  canonicalizeRepaymentTags,
  deriveRepaymentTags,
  deriveRepaymentTagsFromSorted,
  getRepaymentTagMeta,
  REPAYMENT_TAG_COLOR,
  repaymentTagOptions,
  sameRepaymentTagSet
} from './repayment-tags'

function activity(
  partial: Pick<Activite, 'id' | 'date_creation' | 'type' | 'contenu'> & Partial<Activite>
): Activite {
  return {
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    channel: null,
    mentions: [],
    ...partial
  }
}

describe('repayment-tags', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('lit la liste fermée du store, dans l’ordre', () => {
    expect(repaymentTagOptions()).toEqual(['décès', '+65 ans'])
  })

  test('tous les tags partagent la même paire hex', () => {
    expect(REPAYMENT_TAG_COLOR).toEqual({ bgColor: '#E8E8E8', textColor: '#333333' })
    for (const label of repaymentTagOptions()) {
      expect(getRepaymentTagMeta(label)).toEqual({ label, color: REPAYMENT_TAG_COLOR })
    }
  })

  test('canonise dans l’ordre de configuration et ignore hors config', () => {
    expect(canonicalizeRepaymentTags(['+65 ans', 'décès', 'décès', 'inconnu'])).toEqual([
      'décès',
      '+65 ans'
    ])
  })

  test('compare les ensembles sans tenir à l’ordre de saisie', () => {
    expect(sameRepaymentTagSet(['décès', '+65 ans'], ['+65 ans', 'décès'])).toBe(true)
    expect(sameRepaymentTagSet(['décès'], ['décès', '+65 ans'])).toBe(false)
  })

  test('dérive le dernier snapshot, y compris un retrait total', () => {
    expect(
      deriveRepaymentTags([
        activity({
          id: 1,
          date_creation: '2026-06-10 10:00',
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: [],
            after: ['décès']
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: ['décès'],
            after: []
          })
        })
      ])
    ).toEqual([])
  })

  test('lit le snapshot le plus récent', () => {
    expect(
      deriveRepaymentTags([
        activity({
          id: 1,
          date_creation: '2026-06-10 10:00',
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: [],
            after: ['décès']
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: ['décès'],
            after: ['+65 ans']
          })
        })
      ])
    ).toEqual(['+65 ans'])
  })

  test('FromSorted égale le wrapper après tri canonique', () => {
    const unsorted = [
      activity({
        id: 1,
        date_creation: '2026-06-10 10:00',
        type: 'case.tags_changed',
        contenu: JSON.stringify({
          version: 2,
          before: [],
          after: ['décès']
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'case.tags_changed',
        contenu: JSON.stringify({
          version: 2,
          before: ['décès'],
          after: ['+65 ans']
        })
      })
    ]

    expect(deriveRepaymentTagsFromSorted(sortRepaymentActivitiesDesc(unsorted))).toEqual(
      deriveRepaymentTags(unsorted)
    )
  })

  test('ignore un snapshot dont plus aucun tag n’est configuré', () => {
    expect(
      deriveRepaymentTags([
        activity({
          id: 1,
          date_creation: '2026-06-11 11:00',
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: [],
            after: ['inconnu']
          })
        })
      ])
    ).toEqual([])
  })
})
