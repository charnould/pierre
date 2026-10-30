import { describe, expect, it } from 'bun:test'

import { ACTIVITY_TYPES, activityTimestamp, mentionOf } from '../../../../shared/activities'
import {
  activityPayload,
  activityText,
  parseCaseChangeContent,
  parseContentJson
} from '../../../../shared/activity-content'

describe('shared/activities helpers', () => {
  it('activityPayload exige un payload canonique version 2', () => {
    expect(() => activityPayload('note.published', 'Bonjour')).toThrow()
    expect(() =>
      activityPayload('note.published', JSON.stringify({ version: 1, text: 'Bonjour' }))
    ).toThrow()
    expect(
      activityPayload(
        'communication.sent',
        JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
      )
    ).toEqual({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
  })

  it('activityText lit uniquement les payloads canoniques', () => {
    expect(activityText('note.published', JSON.stringify({ version: 2, text: 'Texte' }))).toBe(
      'Texte'
    )
    expect(
      activityText(
        'task.created',
        JSON.stringify({ version: 2, task: { title: 'Relancer', state: 'open' } })
      )
    ).toBe('Relancer')
    expect(
      activityText(
        'communication.sent',
        JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
      )
    ).toBe('Corps')
    expect(() =>
      activityText('note.published', JSON.stringify({ version: 1, text: 'Ancien' }))
    ).toThrow()
  })

  it('parseContentJson rejette les tableaux et le JSON invalide', () => {
    expect(() => parseContentJson('[]')).toThrow()
    expect(() => parseContentJson('null')).toThrow()
    expect(() => parseContentJson('{')).toThrow()
    expect(parseContentJson('{"before":null,"after":"amiable"}')).toEqual({
      before: null,
      after: 'amiable'
    })
  })

  it('mentionOf retrouve le destinataire exact', () => {
    const mentions = [
      { destinataire: 'user:alice@exemple.fr', motif: 'mention' as const },
      { destinataire: 'user:bob@exemple.fr', motif: 'assignation' as const }
    ]
    expect(mentionOf(mentions, 'user:alice@exemple.fr')).toEqual(mentions[0]!)
    expect(mentionOf(mentions, 'alice@exemple.fr')).toBeNull()
  })

  it('parseCaseChangeContent conserve before/after et normalise la note', () => {
    expect(
      parseCaseChangeContent(
        JSON.stringify({
          version: 2,
          before: ['décès'],
          after: ['+65 ans'],
          note: '  Suivi  '
        })
      )
    ).toEqual({
      version: 2,
      before: ['décès'],
      after: ['+65 ans'],
      note: 'Suivi'
    })
    expect(
      parseCaseChangeContent(JSON.stringify({ version: 1, before: null, after: [] }))
    ).toBeNull()
  })

  it('activityTimestamp strippe les millisecondes et conserve UTC', () => {
    expect(activityTimestamp(new Date('2026-08-15T09:17:00.123Z'))).toBe('2026-08-15T09:17:00Z')
  })

  it('expose uniquement les types v2', () => {
    expect(ACTIVITY_TYPES).toContain('note.published')
    expect(ACTIVITY_TYPES).toContain('task.created')
    expect(ACTIVITY_TYPES).toContain('case.bucket_changed')
    expect(ACTIVITY_TYPES).toContain('communication.sent')
    expect(ACTIVITY_TYPES).toContain('automation.reported')
    expect(ACTIVITY_TYPES).toContain('bulk.ran')
    expect(ACTIVITY_TYPES).toContain('activity.unread')
    expect(ACTIVITY_TYPES).not.toContain('note')
    expect(ACTIVITY_TYPES).not.toContain('action')
    expect(ACTIVITY_TYPES).not.toContain('case_bucket_change')
    expect(ACTIVITY_TYPES).not.toContain('email')
  })
})
