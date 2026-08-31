import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

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

function activity(overrides: Partial<Activite>): Activite {
  return {
    id: 1,
    date_creation: '2026-08-22T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@example.org',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: '{}',
    ...overrides
  }
}

describe('repayment phase and assignment activities', () => {
  test('lit un changement de phase explicite', () => {
    const row = activity({
      type: 'repayment_phase_change',
      contenu: JSON.stringify({
        version: 1,
        phase_precedente: 'amiable',
        phase: 'pre_contentieux'
      })
    })

    expect(parseRepaymentStatusChange(row)).toEqual({
      champ: 'bucket',
      avant: 'amiable',
      apres: 'pre_contentieux',
      avantUnset: false
    })
    expect(formatRepaymentStatusChangeText(row)).toContain('→')
    expect(formatStatusChangeTimelineSentence(parseRepaymentStatusChange(row)!)).toBe(
      'a déplacé le dossier du groupe Recouvrement amiable vers Précontentieux'
    )
    expect(parseRepaymentStatusChangeComment(row)).toBeNull()
  })

  test('lit le commentaire porté par un changement de groupe', () => {
    expect(
      parseRepaymentStatusChangeComment(
        activity({
          type: 'repayment_phase_change',
          contenu: JSON.stringify({
            version: 1,
            phase_precedente: 'amiable',
            phase: 'pre_contentieux',
            note: '  Échec des relances amiables.  '
          })
        })
      )
    ).toBe('Échec des relances amiables.')
  })

  test('lit une affectation explicite', () => {
    const change = parseRepaymentStatusChange(
      activity({
        type: 'repayment_assignment',
        contenu: JSON.stringify({
          version: 1,
          gestionnaire_precedent: null,
          gestionnaire: 'alice@example.org'
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
          type: 'repayment_assignment',
          contenu: JSON.stringify({
            version: 1,
            gestionnaire_precedent: null,
            gestionnaire: 'alice@example.org',
            note: 'Dossier transféré.'
          })
        })
      )
    ).toBe('Dossier transféré.')
  })

  test('formule une réaffectation de A vers B', () => {
    const change = parseRepaymentStatusChange(
      activity({
        type: 'repayment_assignment',
        contenu: JSON.stringify({
          version: 1,
          gestionnaire_precedent: 'abraconnier@example.org',
          gestionnaire: 'avwoillard@example.org',
          login: 'avwoillard'
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
          type: 'repayment_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['décès'],
            note: 'Prioritaire'
          })
        })
      )
    ).toBe('décès\nPrioritaire')
    expect(
      formatRepaymentActivityBody(
        activity({
          type: 'repayment_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: ['décès'],
            tags: []
          })
        })
      )
    ).toBe('Aucun tag')
  })
})

describe('repayment plan payload', () => {
  test('lit le formulaire, le statut et le résumé structurés', () => {
    const formulaire = {
      idLocataire: 'LOC-1',
      idClient: 'CLI-1',
      rentalDebt: 1200,
      signed: true,
      planType: 'plan_apurement',
      address: '1 rue Pierre',
      installments: [],
      household: { adults: [], children: [] },
      income: [],
      expenses: [],
      requestedAids: []
    }
    const row = activity({
      type: 'repayment_plan',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'signe',
        resume: { mensualite: 100, nombre_echeances: 12, montant_total: 1200 },
        note: 'Accord confirmé.',
        formulaire,
        calculs: {}
      })
    })

    expect(parseRepaymentPlanForm(row)).toMatchObject(formulaire)
    expect(parseRepaymentPlanProposal(row)).toMatchObject({
      signed: true,
      planValide: true,
      note: 'Accord confirmé.',
      resume: '100 € × 12 mois'
    })
    expect(latestEditableRepaymentPlan([activity({ type: 'note' }), row])?.id).toBe(row.id)
    expect(latestActiveRepaymentPlan([activity({ type: 'note' }), row])).toEqual({
      row,
      signed: true
    })
  })

  test('un plan clôturé n’est plus actif', () => {
    const formulaire = {
      idLocataire: 'LOC-1',
      idClient: 'CLI-1',
      rentalDebt: 1200,
      signed: true,
      planType: 'plan_apurement',
      address: '1 rue Pierre',
      installments: [],
      household: { adults: [], children: [] },
      income: [],
      expenses: [],
      requestedAids: []
    }
    const plan = activity({
      id: 10,
      type: 'repayment_plan',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'signe',
        formulaire,
        calculs: {}
      })
    })
    const closed = activity({
      id: 11,
      date_creation: '2026-08-23T10:00:00',
      type: 'repayment_plan_close',
      contenu: JSON.stringify({ version: 1, id_activite_plan: 10, motif: 'Soldé' })
    })
    expect(latestActiveRepaymentPlan([plan, closed])).toBeNull()
  })

  test('un brouillon non signé reste modifiable', () => {
    const formulaire = {
      idLocataire: 'LOC-1',
      idClient: 'CLI-1',
      rentalDebt: 200,
      signed: false,
      planType: 'plan_apurement',
      address: '1 rue Pierre',
      installments: [],
      household: { adults: [], children: [] },
      income: [],
      expenses: [],
      requestedAids: []
    }
    const plan = activity({
      id: 4,
      type: 'repayment_plan',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'brouillon',
        formulaire,
        calculs: {}
      })
    })
    expect(latestActiveRepaymentPlan([plan])).toEqual({ row: plan, signed: false })
  })
})
