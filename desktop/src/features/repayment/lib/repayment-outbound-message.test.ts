import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  formatTimelineMessageBodyPlain,
  outboundActionSentenceParts,
  outboundChannelPhrase,
  parseTimelineMessageBody,
  parseTimelineOutboundAction
} from './repayment-outbound-message'

function activity(
  partial: Pick<Activite, 'type' | 'contenu'> & { rattachement?: string }
): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10 10:00',
    rattachement: partial.rattachement ?? 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    statut: 'logged',
    mentions: [],
    type: partial.type,
    contenu: partial.contenu
  }
}

describe('parseTimelineMessageBody', () => {
  test('parse une note', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'note',
          contenu: JSON.stringify({ version: 1, note: 'Point de suivi' })
        })
      )
    ).toEqual({ kind: 'note', text: 'Point de suivi' })
  })

  test('parse un RCS sortant', () => {
    expect(
      parseTimelineMessageBody(
        activity({ type: 'rcs', contenu: JSON.stringify({ version: 1, corps: 'Bonjour' }) })
      )
    ).toEqual({
      kind: 'rcs',
      text: 'Bonjour',
      choices: []
    })
  })

  test('parse un email structuré objet + contenu', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'email',
          contenu: JSON.stringify({
            version: 1,
            objet: 'Relance loyer',
            corps: 'Corps du message'
          })
        })
      )
    ).toEqual({
      kind: 'email',
      medium: 'email',
      subject: 'Relance loyer',
      body: 'Corps du message'
    })
  })

  test('parse un email sans objet', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'email',
          contenu: JSON.stringify({ version: 1, corps: 'Corps seul' })
        })
      )
    ).toEqual({ kind: 'email', medium: 'email', subject: null, body: 'Corps seul' })
  })

  test('parse un courriel importé avec De / À', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'email_import',
          contenu: JSON.stringify({
            version: 1,
            objet: 'Relance loyer',
            corps: 'Merci de régulariser.',
            expediteur: 'Alice <alice@bailleur.fr>',
            destinataire: 'Bob <bob@locataire.fr>',
            date_envoi: '2026-08-12T08:00:00Z'
          })
        })
      )
    ).toEqual({
      kind: 'email',
      medium: 'email',
      subject: 'Relance loyer',
      body: 'Merci de régulariser.',
      from: 'Alice <alice@bailleur.fr>',
      to: 'Bob <bob@locataire.fr>',
      sentAt: '2026-08-12T08:00:00Z'
    })
  })

  test('retourne null pour un changement de phase', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'case_bucket_change',
          contenu: JSON.stringify({ champ: 'bucket', avant: 'amiable', apres: 'contentieux' })
        })
      )
    ).toBeNull()
  })

  test('retourne null pour un changement de tags', () => {
    expect(
      parseTimelineMessageBody(
        activity({
          type: 'case_tag_change',
          contenu: JSON.stringify({ version: 1, tags_precedents: [], tags: ['décès'] })
        })
      )
    ).toBeNull()
  })
})

describe('parseTimelineOutboundAction', () => {
  test('lit l’action d’un envoi', () => {
    expect(
      parseTimelineOutboundAction(
        activity({
          type: 'email',
          contenu: JSON.stringify({
            version: 1,
            action: 'Contacter la CAF',
            objet: 'Dossier APL',
            corps: 'Bonjour'
          })
        })
      )
    ).toBe('Contacter la CAF')
    expect(
      parseTimelineOutboundAction(
        activity({
          type: 'rcs',
          contenu: JSON.stringify({
            version: 1,
            action: 'Envoyer un RCS de relance',
            corps: 'Bonjour'
          })
        })
      )
    ).toBe('Envoyer un RCS de relance')
  })

  test('ignore une note ou un envoi sans action', () => {
    expect(
      parseTimelineOutboundAction(activity({ type: 'note', contenu: 'Point de suivi' }))
    ).toBeNull()
    expect(
      parseTimelineOutboundAction(
        activity({
          type: 'email',
          contenu: JSON.stringify({ objet: 'Sujet', corps: 'Corps' })
        })
      )
    ).toBeNull()
  })
})

describe('outboundChannelPhrase', () => {
  test('mappe le type d’activité sur le médium', () => {
    expect(outboundChannelPhrase('email')).toBe('par e-mail')
    expect(outboundChannelPhrase('rcs')).toBe('par RCS')
    expect(outboundChannelPhrase('courrier')).toBe('par courrier')
    expect(outboundChannelPhrase('note')).toBeNull()
  })
})

describe('outboundActionSentenceParts', () => {
  test('ajoute le suffixe de masse en dernière partie si bulk_id', () => {
    expect(outboundActionSentenceParts('Envoyer le courrier R1', 'courrier', 'bulk-1')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'title', text: 'Envoyer le courrier R1' },
      { type: 'text', text: 'par courrier' },
      { type: 'text', text: '(via un traitement de masse)' }
    ])
  })

  test('n’ajoute pas le suffixe sans bulk_id', () => {
    expect(outboundActionSentenceParts('Envoyer le courrier R1', 'courrier', null)).toEqual([
      { type: 'text', text: 'a' },
      { type: 'title', text: 'Envoyer le courrier R1' },
      { type: 'text', text: 'par courrier' }
    ])
    expect(outboundActionSentenceParts('Contacter la CAF', 'email')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'title', text: 'Contacter la CAF' },
      { type: 'text', text: 'par e-mail' }
    ])
  })
})

describe('formatTimelineMessageBodyPlain', () => {
  test('formate un email avec objet', () => {
    expect(
      formatTimelineMessageBodyPlain(
        activity({
          type: 'email',
          contenu: JSON.stringify({ version: 1, objet: 'Sujet', corps: 'Corps' })
        })
      )
    ).toBe('Objet : Sujet\n\nCorps')
  })
})
