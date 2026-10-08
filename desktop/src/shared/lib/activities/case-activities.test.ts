import { describe, expect, test } from 'bun:test'

import type { Activity } from '@/shared/types/activities'

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
  type: Activity['type'],
  contenu: object,
  date = '2026-09-03T10:00:00Z'
): Activity {
  return {
    id: 1,
    createdAt: date,
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
    expect(assignment).toEqual({
      contexte: 'tickets',
      ref: 'REC-1',
      type: 'case.assignee_changed',
      recipients: ['alice', 'bob'],
      contenu: JSON.stringify({
        version: 1,
        before: null,
        after: { id: 'alice@example.fr', label: 'alice' },
        note: '@bob prise en charge'
      })
    })

    const tags = buildCaseTagChangeActivity({
      contexte: 'tickets',
      ref: 'REC-1',
      tags: ['Urgent', 'Technique'],
      previousTags: [],
      comment: ''
    })
    expect(tags).toEqual({
      contexte: 'tickets',
      ref: 'REC-1',
      type: 'case.tags_changed',
      contenu: JSON.stringify({
        version: 1,
        before: [],
        after: ['Urgent', 'Technique']
      })
    })
  })

  test('derives the latest persisted snapshots with source-data fallback', () => {
    expect(
      deriveCaseAssignment(
        [
          activity('case.assignee_changed', {
            version: 1,
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
          version: 1,
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
            version: 1,
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
      version: 1,
      subject: 'Fuite',
      body: 'Le message complet',
      sender: 'tenant@example.fr'
    })
  })
})
