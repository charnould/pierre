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
    channel: null,
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
    expect(assignment?.type).toBe('case.assignee_changed')
    expect(assignment?.recipients).toEqual(['alice', 'bob'])

    const tags = buildCaseTagChangeActivity({
      contexte: 'tickets',
      ref: 'REC-1',
      tags: ['Urgent', 'Technique'],
      previousTags: [],
      comment: ''
    })
    expect(tags?.type).toBe('case.tags_changed')
  })

  test('derives the latest persisted snapshots with source-data fallback', () => {
    expect(
      deriveCaseAssignment(
        [
          activity('case.assignee_changed', {
            version: 2,
            before: null,
            after: { id: 'alice@example.fr', label: 'alice' }
          })
        ],
        'source@example.fr'
      )
    ).toEqual({ email: 'alice@example.fr', login: 'alice' })
    expect(
      deriveCaseTags([
        activity('case.tags_changed', {
          version: 2,
          before: [],
          after: ['Urgent']
        })
      ])
    ).toEqual(['Urgent'])
    expect(deriveCaseAssignment([], 'source@example.fr').email).toBe('source@example.fr')
    expect(
      deriveCaseBucket(
        [
          activity('case.bucket_changed', {
            version: 2,
            before: 'non_traitees',
            after: 'en_cours'
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
      type: 'case.bucket_changed',
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
    expect(result?.type).toBe('communication.imported')
    expect(result?.channel).toBe('email')
    expect(JSON.parse(result!.contenu!)).toMatchObject({
      version: 2,
      subject: 'Fuite',
      body: 'Le message complet',
      sender: 'tenant@example.fr'
    })
  })
})
