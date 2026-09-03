import { describe, expect, test } from 'bun:test'

import type { Activite, CommunicationChannel } from '@/shared/types/activites'

import {
  communicationBodyParagraphs,
  displayTimelineCommunicationBody,
  formatTimelineCommunicationPlain,
  isTimelineCommunicationType,
  parseTimelineCommunication,
  previewTimelineCommunicationBody,
  TIMELINE_COMMUNICATION_PREVIEW_LIMIT
} from './timeline-communication'

const CHANNELS: CommunicationChannel[] = [
  'rcs',
  'sms',
  'email',
  'postal_letter',
  'postal_registered_letter_with_acknowledgement',
  'electronic_registered_delivery',
  'electronic_registered_letter'
]

function activity(partial: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10T10:00:00Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'communication.sent',
    channel: 'email',
    mentions: [],
    destinataire: 'bob@locataire.fr',
    contenu: JSON.stringify({ version: 2, sender: 'alice@exemple.fr', body: 'Bonjour' }),
    thread_id: 'mail-1',
    revision: 1,
    ...partial
  }
}

describe('isTimelineCommunicationType', () => {
  test('reconnaît seulement les événements d’ouverture', () => {
    expect(isTimelineCommunicationType('communication.sent')).toBe(true)
    expect(isTimelineCommunicationType('communication.received')).toBe(true)
    expect(isTimelineCommunicationType('communication.imported')).toBe(true)
    expect(isTimelineCommunicationType('communication.ok')).toBe(false)
    expect(isTimelineCommunicationType('note.published')).toBe(false)
  })
})

describe('parseTimelineCommunication', () => {
  test('couvre chaque canal sortant', () => {
    for (const channel of CHANNELS) {
      const parsed = parseTimelineCommunication(
        activity({
          channel,
          contenu: JSON.stringify({
            version: 2,
            sender: 'alice@exemple.fr',
            subject: 'Titre',
            body: 'Corps'
          })
        })
      )
      expect(parsed?.channel).toBe(channel)
      expect(parsed?.direction).toBe('outbound')
      expect(parsed?.imported).toBe(false)
      expect(parsed?.from).toBe('alice@exemple.fr')
      expect(parsed?.to).toBe('bob@locataire.fr')
      expect(parsed?.subject).toBe(channel === 'rcs' || channel === 'sms' ? null : 'Titre')
      expect(parsed?.body).toBe('Corps')
    }
  })

  test('ignores subjects outside email and document channels', () => {
    const rcs = parseTimelineCommunication(
      activity({
        channel: 'rcs',
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          subject: 'Objet interdit',
          body: 'Bonjour'
        })
      })
    )
    expect(rcs?.subject).toBeNull()
  })

  test('lit un RCS entrant et ses choix', () => {
    const parsed = parseTimelineCommunication(
      activity({
        type: 'communication.received',
        channel: 'rcs',
        auteur: 'external:+33612345678',
        destinataire: null,
        contenu: JSON.stringify({
          version: 2,
          sender: '+33612345678',
          body: 'Oui',
          choices: [
            { type: 'reply', label: 'Oui' },
            { type: 'reply', label: 'Non' }
          ]
        })
      })
    )
    expect(parsed).toMatchObject({
      channel: 'rcs',
      direction: 'inbound',
      from: '+33612345678',
      to: null,
      choices: ['Oui', 'Non']
    })
  })

  test('garde un import honnêtement inconnu', () => {
    const parsed = parseTimelineCommunication(
      activity({
        type: 'communication.imported',
        channel: 'email',
        contenu: JSON.stringify({
          version: 2,
          sender: 'Alice <alice@bailleur.fr>',
          subject: 'Relance loyer',
          body: 'Merci de régulariser.'
        })
      })
    )
    expect(parsed).toMatchObject({
      channel: 'email',
      direction: 'unknown',
      imported: true,
      from: 'Alice <alice@bailleur.fr>',
      statusLine: null
    })
  })

  test('rejette un payload sans version et un type hors communication', () => {
    expect(
      parseTimelineCommunication(activity({ contenu: JSON.stringify({ body: 'Ancien' }) }))
    ).toBeNull()
    expect(
      parseTimelineCommunication(activity({ type: 'note.published', channel: null }))
    ).toBeNull()
  })

  test('attache le statut réussi ou échoué du thread', () => {
    const opened = activity({ thread_id: 'mail-1' })
    expect(
      parseTimelineCommunication(opened, [
        activity({
          type: 'communication.ok',
          contenu: JSON.stringify({ version: 2, result: 'read' })
        })
      ])?.statusLine
    ).toBe('Réussi · Lu')
    expect(
      parseTimelineCommunication(opened, [
        activity({
          type: 'communication.failed',
          contenu: JSON.stringify({ version: 2, reason: 'bounced' })
        })
      ])
    ).toMatchObject({
      statusFailed: true,
      statusLine: 'Échoué · Rebond'
    })
    expect(
      parseTimelineCommunication(opened, [
        activity({
          type: 'communication.failed',
          contenu: JSON.stringify({ version: 2, reason: 'undelivered' })
        })
      ])?.statusLine
    ).toBe('Échoué · Non délivré')
  })

  test('masque une raison technique inconnue derrière un échec générique', () => {
    const parsed = parseTimelineCommunication(activity(), [
      activity({
        type: 'communication.failed',
        contenu: JSON.stringify({ version: 2, reason: 'smtp_550 mailbox unavailable' })
      })
    ])

    expect(parsed?.statusLine).toBe('Échoué')
    expect(parsed?.statusLine).not.toContain('smtp_550')
  })
})

describe('previewTimelineCommunicationBody', () => {
  test('garde 239 et 240 caractères intacts', () => {
    expect(previewTimelineCommunicationBody('é'.repeat(239))).toEqual({
      text: 'é'.repeat(239),
      truncated: false
    })
    expect(previewTimelineCommunicationBody('é'.repeat(240))).toEqual({
      text: 'é'.repeat(240),
      truncated: false
    })
  })

  test('coupe au dernier mot avant 240, ou à 240 s’il n’y a pas de frontière', () => {
    const word = 'bonjour '
    const rest = 'x'.repeat(TIMELINE_COMMUNICATION_PREVIEW_LIMIT)
    expect(previewTimelineCommunicationBody(`${word}${rest}`)).toEqual({
      text: 'bonjour',
      truncated: true
    })
    expect(previewTimelineCommunicationBody('a'.repeat(241))).toEqual({
      text: 'a'.repeat(240),
      truncated: true
    })
  })

  test('coupe au dernier paragraphe qui tient dans 240', () => {
    const greeting = 'Madame, Monsieur,'
    const paragraph =
      'En réponse à votre demande, vous trouverez ci-joint les quittances [Mois/Année].'
    const leftover = `Ces documents sont ${'x'.repeat(TIMELINE_COMMUNICATION_PREVIEW_LIMIT)}`
    expect(previewTimelineCommunicationBody(`${greeting}\n\n${paragraph}\n\n${leftover}`)).toEqual({
      text: `${greeting}\n\n${paragraph}`,
      truncated: true
    })
  })

  test('applique la limite aux paragraphes reflowés', () => {
    const leftover = `Suite ${'x'.repeat(TIMELINE_COMMUNICATION_PREVIEW_LIMIT)}`
    expect(
      previewTimelineCommunicationBody(`Bonjour,\ncomment allez-vous ?\n\n${leftover}`)
    ).toEqual({
      text: 'Bonjour, comment allez-vous ?',
      truncated: true
    })
  })
})

describe('communicationBodyParagraphs', () => {
  test('reflowe les sauts simples et ignore les lignes vides', () => {
    expect(communicationBodyParagraphs('Bonjour,\n\nParagraphe\n\nSuite')).toEqual([
      'Bonjour,',
      'Paragraphe',
      'Suite'
    ])
    expect(communicationBodyParagraphs('Ligne une\nligne deux')).toEqual(['Ligne une ligne deux'])
  })
})

describe('displayTimelineCommunicationBody', () => {
  test('retire une ligne Objet déjà affichée en méta', () => {
    expect(displayTimelineCommunicationBody('Objet :\n\nMadame, Monsieur,', 'Dossier APL')).toBe(
      'Madame, Monsieur,'
    )
    expect(displayTimelineCommunicationBody('Objet : Dossier APL\n\nCorps', 'Dossier APL')).toBe(
      'Corps'
    )
    expect(displayTimelineCommunicationBody('Madame, Monsieur,', 'Dossier APL')).toBe(
      'Madame, Monsieur,'
    )
  })
})

describe('formatTimelineCommunicationPlain', () => {
  test('formate objet et corps', () => {
    expect(
      formatTimelineCommunicationPlain(
        activity({
          contenu: JSON.stringify({ version: 2, sender: 'Alice', subject: 'Sujet', body: 'Corps' })
        })
      )
    ).toBe('Objet : Sujet\n\nCorps')
  })
})
