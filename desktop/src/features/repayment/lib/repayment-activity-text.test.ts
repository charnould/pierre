import { beforeAll, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'
import type { Activity } from '@/shared/types/activites'

import { emptyCase } from '../plan/document'
import {
  formatRepaymentActivityBody,
  formatRepaymentStatusChangeText,
  formatStatusChangeTimelineSentence,
  latestActiveRepaymentPlan,
  latestEditableRepaymentPlan,
  parseRepaymentPlanForm,
  parseRepaymentPlanProposal,
  parseRepaymentStatusChange,
  parseRepaymentStatusChangeComment,
  statusChangeTimelineSentence
} from './repayment-activity-text'
function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 1,
    createdAt: '2026-08-22T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@example.org',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2 }),
    ...overrides
  }
}

describe('repayment phase and assignment activities', () => {
  beforeAll(() => {
    loadCustomizationFixture()
  })

  test('lit un changement de phase explicite', () => {
    const row = activity({
      type: 'case.group_changed',
      contenu: JSON.stringify({
        version: 2,
        before: 'Recouvrement amiable',
        after: 'Contentieux'
      })
    })

    expect(parseRepaymentStatusChange(row)).toEqual({
      champ: 'bucket',
      avant: 'Recouvrement amiable',
      apres: 'Contentieux',
      avantUnset: false
    })
    expect(formatRepaymentStatusChangeText(row)).toContain('→')
    expect(formatStatusChangeTimelineSentence(parseRepaymentStatusChange(row)!)).toBe(
      'a changé la phase de Recouvrement amiable vers Contentieux'
    )
    expect(parseRepaymentStatusChangeComment(row)).toBeNull()
  })

  test('lit le commentaire porté par un changement de groupe', () => {
    expect(
      parseRepaymentStatusChangeComment(
        activity({
          type: 'case.group_changed',
          contenu: JSON.stringify({
            version: 2,
            before: 'Recouvrement amiable',
            after: 'Contentieux',
            note: '  Échec des relances amiables.  '
          })
        })
      )
    ).toBe('Échec des relances amiables.')
  })

  test('lit une affectation explicite', () => {
    const change = parseRepaymentStatusChange(
      activity({
        type: 'case.assignee_changed',
        contenu: JSON.stringify({
          version: 2,
          before: null,
          after: { id: 'alice@example.org', label: 'alice' }
        })
      })
    )
    expect(change).toEqual({
      champ: 'gestionnaire',
      avant: null,
      apres: 'alice@example.org',
      login: 'alice',
      avantUnset: true
    })
    expect(formatStatusChangeTimelineSentence(change!)).toBe('a affecté le dossier à Alice')
    expect(
      parseRepaymentStatusChangeComment(
        activity({
          type: 'case.assignee_changed',
          contenu: JSON.stringify({
            version: 2,
            before: null,
            after: { id: 'alice@example.org', label: 'alice' },
            note: 'Dossier transféré.'
          })
        })
      )
    ).toBe('Dossier transféré.')
  })

  test('formule une réaffectation de A vers B', () => {
    const change = parseRepaymentStatusChange(
      activity({
        type: 'case.assignee_changed',
        contenu: JSON.stringify({
          version: 2,
          before: { id: 'abraconnier@example.org', label: 'abraconnier' },
          after: { id: 'avwoillard@example.org', label: 'avwoillard' }
        })
      })
    )
    expect(statusChangeTimelineSentence(change!)).toEqual([
      { type: 'text', text: 'a réaffecté le dossier de' },
      { type: 'person', identity: 'abraconnier' },
      { type: 'text', text: 'à' },
      { type: 'person', identity: 'avwoillard' }
    ])
    expect(formatStatusChangeTimelineSentence(change!)).toBe(
      'a réaffecté le dossier de Abraconnier à Avwoillard'
    )
  })

  test('formate un snapshot de tags', () => {
    expect(
      formatRepaymentActivityBody(
        activity({
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: [],
            after: ['décès'],
            note: 'Prioritaire'
          })
        })
      )
    ).toBe('décès\nPrioritaire')
    expect(
      formatRepaymentActivityBody(
        activity({
          type: 'case.tags_changed',
          contenu: JSON.stringify({
            version: 2,
            before: ['décès'],
            after: []
          })
        })
      )
    ).toBe('Aucun tag')
  })
})

describe('repayment plan payload', () => {
  beforeAll(() => {
    loadCustomizationFixture()
  })

  test('lit le dossier enregistré', () => {
    const dossier = emptyCase()
    dossier.identification.identifiant_locataire = 'LOC-1'
    dossier.identification.identifiant_client = 'CLI-1'
    dossier.dette.montant_restant_du_euros = 1_200
    dossier.foyer.adultes.push({ ...dossier.foyer.adultes[0]! })
    dossier.foyer.enfants.push({
      prenom: 'Lina',
      nom: 'Martin',
      date_naissance: null,
      a_charge: true
    })
    const row = activity({
      type: 'repayment_plan.created',
      contenu: JSON.stringify(dossier)
    })

    expect(parseRepaymentPlanForm(row)?.foyer.adultes).toHaveLength(2)
    expect(parseRepaymentPlanForm(row)?.foyer.enfants).toHaveLength(2)
    expect(parseRepaymentPlanForm(row)?.dette.montant_restant_du_euros).toBe(1_200)
    expect(parseRepaymentPlanProposal(row)).toEqual({ titre: 'Plan d’apurement' })
    expect(latestEditableRepaymentPlan([activity({}), row])?.id).toBe(row.id)
    expect(latestActiveRepaymentPlan([activity({}), row])).toEqual({ row })
  })

  test('une ligne sans dossier n’est pas un plan actif', () => {
    const closed = activity({
      id: 11,
      type: 'repayment_plan.closed',
      contenu: JSON.stringify({ version: 2, title: "Plan d'apurement" })
    })
    expect(parseRepaymentPlanForm(closed)).toBeNull()
    expect(latestActiveRepaymentPlan([closed])).toBeNull()
  })
})
