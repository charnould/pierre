import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  buildCaseAssignmentActivity,
  buildCaseBucketChangeActivity,
  buildCaseTagChangeActivity,
  buildEmailImportActivity,
  deriveCaseAssignment,
  deriveCaseBucket,
  deriveCaseTags
} from './case-activities'

function activity(
  type: Activite['type'],
  contenu: object,
  date = '2026-09-03T10:00:00Z'
): Activite {
  return {
    id: 1,
    date_creation: date,
    rattachement: 'tickets:REC-1',
    auteur: 'user:alice',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type,
    statut: 'logged',
    mentions: [],
    contenu: JSON.stringify(contenu)
  }
}

describe('case activity capabilities', () => {
  test('builds context-neutral assignment and tag activities', () => {
    const assignment = buildCaseAssignmentActivity({
      contexte: 'tickets',
      ref: 'REC-1',
      user: { login: 'alice', email: 'alice@example.fr' },
      previousEmail: null,
      comment: '@bob prise en charge'
    })
    expect(assignment?.type).toBe('case_assignment')
    expect(assignment?.recipients).toEqual(['alice', 'bob'])

    const tags = buildCaseTagChangeActivity({
      contexte: 'tickets',
      ref: 'REC-1',
      tags: ['Urgent', 'Technique'],
      previousTags: [],
      comment: ''
    })
    expect(tags?.type).toBe('case_tag_change')
  })

  test('derives the latest persisted snapshots with source-data fallback', () => {
    expect(
      deriveCaseAssignment(
        [
          activity('case_assignment', {
            version: 1,
            referent: 'alice@example.fr',
            referent_precedent: null,
            login: 'alice'
          })
        ],
        'source@example.fr'
      )
    ).toEqual({ email: 'alice@example.fr', login: 'alice' })
    expect(
      deriveCaseTags([
        activity('case_tag_change', {
          version: 1,
          tags_precedents: [],
          tags: ['Urgent']
        })
      ])
    ).toEqual(['Urgent'])
    expect(deriveCaseAssignment([], 'source@example.fr').email).toBe('source@example.fr')
    expect(
      deriveCaseBucket(
        [
          activity('case_bucket_change', {
            version: 1,
            bucket_precedent: 'non_traitees',
            bucket: 'en_cours'
          })
        ],
        'non_traitees'
      )
    ).toBe('en_cours')
  })

  test('builds only real bucket transitions', () => {
    expect(
      buildCaseBucketChangeActivity({
        contexte: 'tickets',
        ref: 'REC-1',
        bucket: 'en_attente',
        previousBucket: 'en_cours',
        comment: '@bob attente entreprise'
      })
    ).toMatchObject({
      type: 'case_bucket_change',
      recipients: ['bob']
    })
    expect(
      buildCaseBucketChangeActivity({
        contexte: 'tickets',
        ref: 'REC-1',
        bucket: 'en_cours',
        previousBucket: 'en_cours'
      })
    ).toBeNull()
  })

  test('builds a full imported email for any process context', () => {
    const result = buildEmailImportActivity({
      contexte: 'tickets',
      ref: 'REC-1',
      email: {
        from: 'tenant@example.fr',
        to: 'service@example.fr',
        subject: 'Fuite',
        body: 'Le message complet',
        sentAt: '2026-09-03T09:00:00Z'
      }
    })
    expect(result?.type).toBe('email_import')
    expect(JSON.parse(result!.contenu!)).toMatchObject({
      objet: 'Fuite',
      corps: 'Le message complet',
      expediteur: 'tenant@example.fr'
    })
  })
})
