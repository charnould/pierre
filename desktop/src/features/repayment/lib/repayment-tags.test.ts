import { describe, expect, test } from 'bun:test'

import repaymentConfig from '@customization/repayments/config'

import type { Activite } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'
import {
  canonicalizeRepaymentTags,
  deriveRepaymentTags,
  deriveRepaymentTagsFromSorted,
  getRepaymentTagMeta,
  REPAYMENT_TAG_COLOR,
  REPAYMENT_TAG_OPTIONS,
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
    statut: 'logged',
    mentions: [],
    ...partial
  }
}

describe('repayment-tags', () => {
  test('lit la liste fermée de la configuration, dans l’ordre', () => {
    expect(REPAYMENT_TAG_OPTIONS).toEqual(repaymentConfig.tags)
  })

  test('tous les tags partagent la même paire hex', () => {
    expect(REPAYMENT_TAG_COLOR).toEqual({ bgColor: '#E8E8E8', textColor: '#333333' })
    for (const label of REPAYMENT_TAG_OPTIONS) {
      expect(getRepaymentTagMeta(label)).toEqual({ label, color: REPAYMENT_TAG_COLOR })
    }
  })

  test('canonise dans l’ordre de configuration et ignore hors config', () => {
    expect(canonicalizeRepaymentTags(['Redémarrage APL', 'décès', 'décès', 'inconnu'])).toEqual([
      'décès',
      'Redémarrage APL'
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
          type: 'case_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['décès']
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: ['décès'],
            tags: []
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
          type: 'case_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['décès']
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: ['décès'],
            tags: ['+65 ans', 'Redémarrage APL']
          })
        })
      ])
    ).toEqual(['+65 ans', 'Redémarrage APL'])
  })

  test('FromSorted égale le wrapper après tri canonique', () => {
    const unsorted = [
      activity({
        id: 1,
        date_creation: '2026-06-10 10:00',
        type: 'case_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: [],
          tags: ['décès']
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'case_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: ['décès'],
          tags: ['+65 ans', 'Redémarrage APL']
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
          type: 'case_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['inconnu']
          })
        })
      ])
    ).toEqual([])
  })
})
