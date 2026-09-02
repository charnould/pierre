import { describe, expect, it } from 'bun:test'

import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  activity_payload,
  activity_texte,
  activity_timestamp,
  is_boost_notification,
  is_inbox_mention,
  mention_of,
  parse_contenu_json,
  parse_repayment_tag_change_content
} from '../../../../shared/activites'

describe('shared/activites helpers', () => {
  it('activity_payload exige un payload canonique versionné', () => {
    expect(activity_payload('note', 'Bonjour')).toEqual({})
    expect(activity_payload('note', '  ')).toEqual({})
    expect(
      activity_payload('email', JSON.stringify({ version: 1, objet: 'Sujet', contenu: 'Corps' }))
    ).toEqual({ version: 1, objet: 'Sujet', contenu: 'Corps' })
    expect(activity_payload('email', JSON.stringify({ objet: 'Sujet', contenu: 'Corps' }))).toEqual(
      {}
    )
    expect(activity_payload('email', 'pas-json')).toEqual({})
  })

  it('activity_texte lit uniquement les payloads canoniques', () => {
    expect(activity_texte('note', 'Texte')).toBe('')
    expect(activity_texte('ticket_reply', JSON.stringify({ version: 1, titre: 'Réponses' }))).toBe(
      'Réponses'
    )
    expect(activity_texte('ticket_reply', JSON.stringify({ titre: 'Réponses' }))).toBe('')
    expect(activity_texte('email', JSON.stringify({ objet: 'Sujet' }))).toBe('')
  })

  it('parse_contenu_json ignore les tableaux et le JSON invalide', () => {
    expect(parse_contenu_json('[]')).toEqual({})
    expect(parse_contenu_json('null')).toEqual({})
    expect(parse_contenu_json('{')).toEqual({})
    expect(parse_contenu_json('{"champ":"bucket"}')).toEqual({ champ: 'bucket' })
  })

  it('mention_of retrouve le destinataire exact', () => {
    const mentions = [
      { destinataire: 'user:alice@exemple.fr', lu: true, boost: '🔥' },
      { destinataire: 'user:bob@exemple.fr', lu: false, boost: null }
    ]
    expect(mention_of(mentions, 'user:alice@exemple.fr')).toEqual(mentions[0]!)
    expect(mention_of(mentions, 'alice@exemple.fr')).toBeNull()
  })

  it('is_inbox_mention ignore les entrées techniques de boost', () => {
    expect(is_inbox_mention({ destinataire: 'user:bob@exemple.fr', lu: true, boost: '👍' })).toBe(
      true
    )
    expect(
      is_inbox_mention({
        destinataire: 'user:bob@exemple.fr',
        lu: true,
        boost: '👍',
        inbox: false
      })
    ).toBe(false)
    expect(is_boost_notification('activity_boost')).toBe(true)
    expect(is_boost_notification('note')).toBe(false)
  })

  it('parse_repayment_tag_change_content lit un snapshot, y compris vide', () => {
    expect(
      parse_repayment_tag_change_content(
        JSON.stringify({
          version: 1,
          tags_precedents: ['décès'],
          tags: ['+65 ans'],
          note: '  Suivi  '
        })
      )
    ).toEqual({
      version: 1,
      tags_precedents: ['décès'],
      tags: ['+65 ans'],
      note: 'Suivi'
    })
    expect(
      parse_repayment_tag_change_content(
        JSON.stringify({ version: 1, tags_precedents: ['décès'], tags: [] })
      )
    ).toEqual({
      version: 1,
      tags_precedents: ['décès'],
      tags: []
    })
    expect(
      parse_repayment_tag_change_content(JSON.stringify({ version: 1, tags: [''] }))
    ).toBeNull()
  })

  it('activity_timestamp strippe les millisecondes et conserve UTC', () => {
    expect(activity_timestamp(new Date('2026-08-15T09:17:00.123Z'))).toBe('2026-08-15T09:17:00Z')
  })

  it('expose des enums fermés sans les anciens alias métier', () => {
    expect(ACTIVITY_TYPES).not.toContain('status_change')
    expect(ACTIVITY_TYPES).not.toContain('ticket_summarize')
    expect(ACTIVITY_TYPES).not.toContain('repayment_plan_proposal')
    expect(ACTIVITY_TYPES).not.toContain('repayment_change')
    expect(ACTIVITY_TYPES).toContain('repayment_phase_change')
    expect(ACTIVITY_TYPES).toContain('repayment_assignment')
    expect(ACTIVITY_TYPES).toContain('repayment_tag_change')
    expect(ACTIVITY_TYPES).toContain('action')
    expect(ACTIVITY_TYPES).toContain('ticket_summary')
    expect(ACTIVITY_TYPES).toContain('ticket_reply')
    expect(ACTIVITY_TYPES).toContain('repayment_plan')
    expect(ACTIVITY_TYPES).toContain('activity_boost')
    expect(ACTIVITY_TYPES).toContain('rcs')
    expect(ACTIVITY_TYPES).toContain('bulk_run')
    expect(ACTIVITY_TYPES).toContain('email_import')
    expect(ACTIVITY_STATUSES).not.toContain('recorded')
    expect(ACTIVITY_STATUSES).not.toContain('non_respect')
    expect(ACTIVITY_STATUSES).toEqual([
      'draft',
      'logged',
      'received',
      'queued',
      'sent',
      'delivered',
      'read',
      'failed',
      'undelivered',
      'rejected',
      'bounced',
      'returned',
      'signed',
      'refused',
      'unclaimed',
      'expired'
    ])
  })
})
