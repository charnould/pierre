import { describe, expect, test } from 'bun:test'

import type { Activite, CommunicationChannel } from '@/shared/types/activites'

import {
  formatTimelineActivityTitle,
  TIMELINE_MOVEMENT_TITLE,
  timelineActivityActionVerb
} from './timeline-action-label'

function sampleActivity(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10T14:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:cdubois@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'Relance' }),
    ...overrides
  }
}

function sent(channel: CommunicationChannel, extras: Partial<Activite> = {}): Activite {
  return sampleActivity({
    type: 'communication.sent',
    channel,
    contenu: JSON.stringify({ version: 2, sender: 'Alice', body: 'Bonjour' }),
    ...extras
  })
}

describe('timelineActivityActionVerb', () => {
  test('maps notes, channels and plans', () => {
    expect(timelineActivityActionVerb(sampleActivity({ type: 'note.published' }))).toBe(
      'a laissé une note'
    )
    expect(timelineActivityActionVerb(sent('rcs'))).toBe('a envoyé un RCS')
    expect(timelineActivityActionVerb(sent('email'))).toBe('a envoyé un courriel')
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'communication.imported',
          channel: 'email',
          contenu: JSON.stringify({ version: 2, sender: 'Alice', body: 'Bonjour' })
        })
      )
    ).toBe('a importé un courriel')
    expect(timelineActivityActionVerb(sent('postal_letter'))).toBe(
      'a envoyé un courrier postal simple'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'bulk.ran' }))).toBe(
      'a exécuté un traitement de masse'
    )
    expect(timelineActivityActionVerb(sent('rcs', { auteur: 'tenant:LOC-1' }))).toBe(
      'a répondu par RCS'
    )
    expect(timelineActivityActionVerb(sent('email', { auteur: 'tenant:LOC-1' }))).toBe(
      'a répondu par Courriel'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'repayment_plan.created' }))).toBe(
      'a créé un plan d’apurement'
    )
  })

  test('maps case changes and task states', () => {
    expect(timelineActivityActionVerb(sampleActivity({ type: 'case.group_changed' }))).toBe(
      'a déplacé le dossier de groupe'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'case.assignee_changed' }))).toBe(
      'a affecté le dossier'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'case.tags_changed' }))).toBe(
      'a mis à jour les tags'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'task.created' }))).toBe(
      'a créé une tâche'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'task.completed' }))).toBe(
      'a réalisé une tâche'
    )
  })

  test('maps artifacts and ticket fields', () => {
    expect(timelineActivityActionVerb(sampleActivity({ type: 'automation.reported' }))).toBe(
      'a publié un rapport'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'artifact.generated' }))).toBe(
      'a généré un document'
    )
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'ticket.field_changed',
          contenu: JSON.stringify({ version: 2, field: 'statut', before: 'ouvert', after: 'clos' })
        })
      )
    ).toBe('a modifié statut')
  })

  test('ajoute l’action métier au courriel', () => {
    expect(
      timelineActivityActionVerb(
        sent('email', {
          contenu: JSON.stringify({
            version: 2,
            sender: 'Alice',
            action: 'Contacter la CAF',
            body: 'Bonjour'
          })
        })
      )
    ).toBe('a envoyé un courriel · Contacter la CAF')
  })
})

describe('formatTimelineActivityTitle', () => {
  test('joins actor name and verb', () => {
    expect(
      formatTimelineActivityTitle('Charles-H. Arnould', sampleActivity({ type: 'note.published' }))
    ).toBe('Charles-H. Arnould a laissé une note')
  })

  test('falls back when name is blank', () => {
    expect(formatTimelineActivityTitle('  ', sampleActivity({ type: 'note.published' }))).toBe(
      'Inconnu a laissé une note'
    )
  })
})

describe('TIMELINE_MOVEMENT_TITLE', () => {
  test('is fixed ledger label', () => {
    expect(TIMELINE_MOVEMENT_TITLE).toBe('Mouvement comptable')
  })
})
