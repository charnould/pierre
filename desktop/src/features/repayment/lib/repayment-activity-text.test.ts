import { beforeAll, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'
import type { Activite } from '@/shared/types/activites'

import { createDefaultApurementPlanForm } from './apurement-plan/defaults'
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
import { repaymentPlanFormToSnapshot } from './repayment-plan-persist'

function activity(overrides: Partial<Activite>): Activite {
  return {
    id: 1,
    date_creation: '2026-08-22T10:00:00',
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
        before: 'amiable',
        after: 'contentieux'
      })
    })

    expect(parseRepaymentStatusChange(row)).toEqual({
      champ: 'bucket',
      avant: 'amiable',
      apres: 'contentieux',
      avantUnset: false
    })
    expect(formatRepaymentStatusChangeText(row)).toContain('→')
    expect(formatStatusChangeTimelineSentence(parseRepaymentStatusChange(row)!)).toBe(
      'a déplacé le dossier du groupe Recouvrement amiable vers Contentieux'
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
            before: 'amiable',
            after: 'contentieux',
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
  test('lit le formulaire, le statut et le résumé structurés', () => {
    const formulaire = createDefaultApurementPlanForm()
    formulaire.idLocataire = 'LOC-1'
    formulaire.idClient = 'CLI-1'
    formulaire.rentalDebt = 1_200
    formulaire.installments = formulaire.installments.slice(0, 12).map((installment) => ({
      ...installment,
      amount: 100
    }))
    const row = activity({
      type: 'repayment_plan.finalized',
      contenu: JSON.stringify({
        version: 2,
        title: "Plan d'apurement",
        note: 'Accord confirmé.',
        plan: repaymentPlanFormToSnapshot(formulaire)
      })
    })

    expect(parseRepaymentPlanForm(row)).toMatchObject({
      idLocataire: 'LOC-1',
      idClient: 'CLI-1',
      rentalDebt: 1_200
    })
    expect(parseRepaymentPlanProposal(row)).toMatchObject({
      signed: true,
      planValide: true,
      note: 'Accord confirmé.',
      resume: '100 € × 12 mois'
    })
    expect(latestEditableRepaymentPlan([activity({}), row])?.id).toBe(row.id)
    expect(latestActiveRepaymentPlan([activity({}), row])).toEqual({
      row,
      signed: true
    })
  })

  test('un plan clôturé n’est plus actif', () => {
    const formulaire = createDefaultApurementPlanForm()
    const plan = activity({
      id: 10,
      type: 'repayment_plan.finalized',
      thread_id: 'plan-1',
      contenu: JSON.stringify({
        version: 2,
        title: "Plan d'apurement",
        plan: repaymentPlanFormToSnapshot(formulaire)
      })
    })
    const closed = activity({
      id: 11,
      date_creation: '2026-08-23T10:00:00',
      type: 'repayment_plan.closed',
      thread_id: 'plan-1',
      contenu: JSON.stringify({
        version: 2,
        title: "Plan d'apurement",
        plan: repaymentPlanFormToSnapshot(formulaire),
        reason: 'execution_complete'
      })
    })
    expect(latestActiveRepaymentPlan([plan, closed])).toBeNull()
  })

  test('un brouillon non signé reste modifiable', () => {
    const formulaire = createDefaultApurementPlanForm()
    formulaire.rentalDebt = 200
    const plan = activity({
      id: 4,
      type: 'repayment_plan.updated',
      contenu: JSON.stringify({
        version: 2,
        title: "Plan d'apurement",
        plan: repaymentPlanFormToSnapshot(formulaire)
      })
    })
    expect(latestActiveRepaymentPlan([plan])).toEqual({ row: plan, signed: false })
  })
})
