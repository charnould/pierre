import { describe, expect, test } from 'bun:test'

import { buildPlanDocxData, formatMoneyPlain, resolveLeaseHolders } from './build-plan-docx-data'
import {
  createAdultMember,
  createAidItem,
  createAmountLine,
  createChildMember,
  createDefaultApurementPlanForm
} from './defaults'

const CTX = {
  id_locataire: 'LOC-1',
  id_client: 'CLI-1',
  email: 'hlebras@granddijonhabitat.fr'
}

describe('buildPlanDocxData', () => {
  const now = new Date('2026-07-31T12:00:00')

  test('n’expose que des clés ALL CAPS du contrat', () => {
    const form = createDefaultApurementPlanForm()
    const data = buildPlanDocxData(form, CTX, now)
    const keys = Object.keys(data).sort()
    expect(keys).toEqual([
      'ADRESSE',
      'ADULTES',
      'AIDES',
      'BANQUE_DE_FRANCE',
      'CCAPEX',
      'CHARGES',
      'CODE_POSTAL',
      'COMMANDEMENT',
      'DATE',
      'DETTE',
      'ECHEANCES',
      'EMAIL',
      'ENFANTS',
      'ID_CLIENT',
      'ID_LOCATAIRE',
      'PREMIER_IMPAYE',
      'RESSOURCES',
      'RESTE_A_VIVRE',
      'RESTE_A_VIVRE_UC',
      'TITULAIRES',
      'TOTAL_CHARGES',
      'TOTAL_PLAN',
      'TOTAL_RESSOURCES',
      'TRAVAILLEUR_SOCIAL',
      'TYPE_PLAN',
      'UC',
      'VILLE'
    ])
    expect(data.EMAIL).toBe('hlebras@granddijonhabitat.fr')
    expect(data.ID_CLIENT).toBe('CLI-1')
    expect(data.ID_LOCATAIRE).toBe('LOC-1')
  })

  test('formate la dette sans symbole monétaire', () => {
    const form = createDefaultApurementPlanForm()
    form.rentalDebt = 1234.5
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.DETTE).toBe(formatMoneyPlain(1234.5))
    expect(data.DETTE).not.toContain('€')
  })

  test('boucle TITULAIRES sur tous les titulaires du bail', () => {
    const form = createDefaultApurementPlanForm()
    form.household.adults = [
      createAdultMember({
        firstName: 'Emile',
        lastName: 'Zola',
        cafNumber: '111',
        isLeaseHolder: true
      }),
      createAdultMember({
        firstName: 'Marcel',
        lastName: 'Droitier',
        cafNumber: '39929F999C',
        isLeaseHolder: true
      }),
      createAdultMember({
        firstName: 'Autre',
        lastName: 'NonTitulaire',
        cafNumber: '999',
        isLeaseHolder: false
      })
    ]
    expect(resolveLeaseHolders(form.household.adults)).toHaveLength(2)
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.TITULAIRES).toEqual([
      { PRENOM: 'Emile', NOM: 'Zola', CAF: '111' },
      { PRENOM: 'Marcel', NOM: 'Droitier', CAF: '39929F999C' }
    ])
  })

  test('produit des tableaux de même longueur que les listes formulaire', () => {
    const form = createDefaultApurementPlanForm()
    form.household.adults = [
      createAdultMember({ firstName: 'A', lastName: 'Un' }),
      createAdultMember({ firstName: 'B', lastName: 'Deux', isLeaseHolder: false })
    ]
    form.household.children = [createChildMember({ firstName: 'C', lastName: 'Trois' })]
    form.income = [
      createAmountLine({
        label: 'Salaire(s) net(s)',
        amount: 1000,
        personId: form.household.adults[0].id
      })
    ]
    form.expenses = [createAmountLine({ label: 'Loyer total', amount: 400 })]
    form.requestedAids = [
      createAidItem({ label: 'FSL' }),
      createAidItem({ label: 'Action Logement' })
    ]
    form.installments = [
      { id: 'i1', yearMonth: '2026-08', amount: 50 },
      { id: 'i2', yearMonth: '2026-09', amount: 50 }
    ]

    const data = buildPlanDocxData(form, CTX, now)
    expect(data.ADULTES).toHaveLength(2)
    expect(data.ADULTES[0]?.CAISSE_RETRAITE).toBe('')
    form.household.adults[0]!.pensionFund = 'CARSAT'
    form.household.adults[0]!.employmentStatus = 'retired'
    expect(buildPlanDocxData(form, CTX, now).ADULTES[0]?.CAISSE_RETRAITE).toBe('CARSAT')
    expect(data.ENFANTS).toHaveLength(1)
    expect(data.RESSOURCES).toHaveLength(1)
    expect(data.CHARGES).toHaveLength(1)
    expect(data.AIDES).toHaveLength(2)
    expect(data.ECHEANCES).toHaveLength(2)
    expect(data.ECHEANCES[0]).toEqual({
      NUMERO: '1',
      ECHEANCE: '08/2026',
      MONTANT: formatMoneyPlain(50)
    })
    expect(data.RESSOURCES[0].PERSONNE).toBe('A Un')
  })

  test('mappe la Banque de France en un seul champ', () => {
    const form = createDefaultApurementPlanForm()
    form.banqueDeFranceStatus = 'moratorium'
    form.moratoriumEndDate = '2026-12-31'
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.BANQUE_DE_FRANCE).toContain('Moratoire')
    expect(data.BANQUE_DE_FRANCE).toContain('31/12/2026')
    expect(data).not.toHaveProperty('prp')
    expect(data).not.toHaveProperty('moratoire_ligne')
  })

  test('expose la date du document', () => {
    const form = createDefaultApurementPlanForm()
    const data = buildPlanDocxData(form, { ...CTX, id_locataire: 'LOC-9' }, now)
    expect(data.DATE).toContain('2026')
    expect(data.ID_LOCATAIRE).toBe('LOC-9')
    expect(data.TYPE_PLAN).toBe("Plan d'apurement")
  })
})
