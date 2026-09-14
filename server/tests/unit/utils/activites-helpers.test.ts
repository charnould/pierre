import { describe, expect, it } from 'bun:test'

import {
  ACTIVITY_TYPES,
  activity_payload,
  activity_texte,
  activity_timestamp,
  mention_of,
  parse_case_change_content,
  parse_contenu_json
} from '../../../../shared/activites'

describe('shared/activites helpers', () => {
  it('activity_payload exige un payload canonique version 2', () => {
    expect(activity_payload('note.published', 'Bonjour')).toEqual({})
    expect(
      activity_payload('note.published', JSON.stringify({ version: 1, text: 'Bonjour' }))
    ).toEqual({})
    expect(
      activity_payload(
        'communication.sent',
        JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
      )
    ).toEqual({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
  })

  it('activity_texte lit uniquement les payloads canoniques', () => {
    expect(activity_texte('note.published', JSON.stringify({ version: 2, text: 'Texte' }))).toBe(
      'Texte'
    )
    expect(
      activity_texte(
        'task.created',
        JSON.stringify({ version: 2, task: { title: 'Relancer', state: 'open' } })
      )
    ).toBe('Relancer')
    expect(
      activity_texte(
        'communication.sent',
        JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Corps' })
      )
    ).toBe('Corps')
    expect(activity_texte('note.published', JSON.stringify({ version: 1, text: 'Ancien' }))).toBe(
      ''
    )
  })

  it('parse_contenu_json ignore les tableaux et le JSON invalide', () => {
    expect(parse_contenu_json('[]')).toEqual({})
    expect(parse_contenu_json('null')).toEqual({})
    expect(parse_contenu_json('{')).toEqual({})
    expect(parse_contenu_json('{"before":null,"after":"amiable"}')).toEqual({
      before: null,
      after: 'amiable'
    })
  })

  it('mention_of retrouve le destinataire exact', () => {
    const mentions = [
      { destinataire: 'user:alice@exemple.fr', motif: 'mention' as const },
      { destinataire: 'user:bob@exemple.fr', motif: 'assignation' as const }
    ]
    expect(mention_of(mentions, 'user:alice@exemple.fr')).toEqual(mentions[0]!)
    expect(mention_of(mentions, 'alice@exemple.fr')).toBeNull()
  })

  it('parse_case_change_content conserve before/after et normalise la note', () => {
    expect(
      parse_case_change_content(
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
      parse_case_change_content(JSON.stringify({ version: 1, before: null, after: [] }))
    ).toBeNull()
  })

  it('activity_timestamp strippe les millisecondes et conserve UTC', () => {
    expect(activity_timestamp(new Date('2026-08-15T09:17:00.123Z'))).toBe('2026-08-15T09:17:00Z')
  })

  it('expose uniquement les types v2', () => {
    expect(ACTIVITY_TYPES).toContain('note.published')
    expect(ACTIVITY_TYPES).toContain('task.created')
    expect(ACTIVITY_TYPES).toContain('case.bucket_changed')
    expect(ACTIVITY_TYPES).toContain('communication.sent')
    expect(ACTIVITY_TYPES).toContain('automation.reported')
    expect(ACTIVITY_TYPES).toContain('bulk.ran')
    expect(ACTIVITY_TYPES).not.toContain('note')
    expect(ACTIVITY_TYPES).not.toContain('action')
    expect(ACTIVITY_TYPES).not.toContain('case_bucket_change')
    expect(ACTIVITY_TYPES).not.toContain('email')
  })
})
