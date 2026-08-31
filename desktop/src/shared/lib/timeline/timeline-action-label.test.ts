import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

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
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'Relance',
    ...overrides
  }
}

describe('timelineActivityActionVerb', () => {
  test('maps channel and plan types', () => {
    expect(timelineActivityActionVerb(sampleActivity({ type: 'note' }))).toBe('a laissé une note')
    expect(timelineActivityActionVerb(sampleActivity({ type: 'ticket_memo' }))).toBe(
      'a laissé une note'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'rcs' }))).toBe('a envoyé un RCS')
    expect(timelineActivityActionVerb(sampleActivity({ type: 'email' }))).toBe(
      'a envoyé un courriel'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'email_import' }))).toBe(
      'a importé un courriel'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'courrier' }))).toBe(
      'a envoyé un courrier'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'bulk_run' }))).toBe(
      'a exécuté un traitement de masse'
    )
    expect(
      timelineActivityActionVerb(sampleActivity({ type: 'rcs', auteur: 'tenant:LOC-1' }))
    ).toBe('a répondu par RCS')
    expect(
      timelineActivityActionVerb(sampleActivity({ type: 'email', auteur: 'tenant:LOC-1' }))
    ).toBe('a répondu par courriel')
    expect(timelineActivityActionVerb(sampleActivity({ type: 'repayment_plan' }))).toBe(
      'a créé un plan d’apurement'
    )
  })

  test('maps repayment events and action states', () => {
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'repayment_phase_change'
        })
      )
    ).toBe('a changé le groupe')
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'repayment_assignment'
        })
      )
    ).toBe('a affecté le dossier')
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'repayment_tag_change'
        })
      )
    ).toBe('a mis à jour les tags')
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'action',
          event: 'created',
          contenu: JSON.stringify({
            version: 1,
            action: 'Joindre le locataire',
            etat: 'a_faire',
            assigne_a: 'alice@example.org',
            date_echeance: '2026-06-20'
          })
        })
      )
    ).toBe('a créé une tâche')
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'action',
          event: 'completed',
          contenu: JSON.stringify({
            version: 1,
            action: 'Joindre le locataire',
            etat: 'fait'
          })
        })
      )
    ).toBe('a réalisé une tâche')
  })

  test('maps ticket and automation types', () => {
    expect(timelineActivityActionVerb(sampleActivity({ type: 'automation_report' }))).toBe(
      'a publié un rapport'
    )
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'ticket_reply',
          contenu: JSON.stringify({ titre: 'Réponses' })
        })
      )
    ).toBe('a pré-généré des réponses')
    expect(timelineActivityActionVerb(sampleActivity({ type: 'ticket_change' }))).toBe(
      'a mis à jour le ticket'
    )
    expect(timelineActivityActionVerb(sampleActivity({ type: 'ticket_summary' }))).toBe(
      'a résumé le ticket'
    )
  })

  test('identifies the object boosted from the notification payload', () => {
    expect(
      timelineActivityActionVerb(
        sampleActivity({
          type: 'activity_boost',
          contenu: JSON.stringify({
            version: 1,
            activite_source_id: 42,
            type_activite_source: 'note',
            emoji: '👍'
          })
        })
      )
    ).toBe('a boosté une note 👍')
  })
})

describe('formatTimelineActivityTitle', () => {
  test('joins actor name and verb', () => {
    expect(
      formatTimelineActivityTitle('Charles-H. Arnould', sampleActivity({ type: 'note' }))
    ).toBe('Charles-H. Arnould a laissé une note')
  })

  test('falls back when name is blank', () => {
    expect(formatTimelineActivityTitle('  ', sampleActivity({ type: 'note' }))).toBe(
      'Inconnu a laissé une note'
    )
  })
})

describe('TIMELINE_MOVEMENT_TITLE', () => {
  test('is fixed ledger label', () => {
    expect(TIMELINE_MOVEMENT_TITLE).toBe('Mouvement comptable')
  })
})
