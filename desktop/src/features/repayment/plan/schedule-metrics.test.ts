import { describe, expect, test } from 'bun:test'

import { type CaseFile, emptyCase } from './document'
import {
  applyInstallmentEdit,
  firstOfNextMonth,
  installmentAmounts,
  installmentFigures,
  loanNetAlert
} from './schedule-metrics'

function dossier(): CaseFile {
  const file = emptyCase()
  file.foyer.adultes[0]!.date_naissance = '1980-01-01'
  file.foyer.enfants = []
  file.budget.ressources_mensuelles = [
    { type: 'Salaire net', personne: 'Foyer (non assigné)', montant_euros: 2000 }
  ]
  file.budget.ressources_ponctuelles = []
  file.budget.loyer_charges_moins_aides_au_logement_euros = 400
  file.budget.charges_mensuelles = []
  file.budget.charges_ponctuelles = []
  return file
}

describe('installmentAmounts', () => {
  test('laisse les centimes restants sur la dernière échéance', () => {
    const amounts = installmentAmounts(100.01, 3)
    expect(amounts).toEqual([33.33, 33.33, 33.35])
    expect(amounts.reduce((sum: number, value) => sum + (value ?? 0), 0)).toBeCloseTo(100.01)
  })

  test('reste vide sans dette', () => {
    expect(installmentAmounts(null, 3)).toEqual([null, null, null])
  })
})

describe('échéancier', () => {
  const today = new Date(2026, 9, 27)
  const row = (
    date: string | null
  ): { date_echeance: string | null; mensualite_euros: number | null } => ({
    date_echeance: date,
    mensualite_euros: null
  })

  test('un plan neuf commence le 1er du mois suivant', () => {
    expect(firstOfNextMonth(today)).toBe('2026-11-01')
    const created = applyInstallmentEdit(90, [], [row(null), row(null), row(null)], today)
    expect(created.map((item) => item.date_echeance)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01'
    ])
    expect(created.map((item) => item.mensualite_euros)).toEqual([30, 30, 30])
  })

  test('un jour saisi est recopié sur toutes les échéances', () => {
    const previous = [row('2026-11-01'), row('2026-12-01'), row('2027-01-01')]
    const next = [row('2026-11-01'), row('2026-12-09'), row('2027-01-01')]
    expect(
      applyInstallmentEdit(90, previous, next, today).map((item) => item.date_echeance)
    ).toEqual(['2026-11-09', '2026-12-09', '2027-01-09'])
  })

  test('un 31 est ramené au dernier jour de février', () => {
    const previous = [row('2026-01-01'), row('2026-02-01')]
    const next = [row('2026-01-31'), row('2026-02-01')]
    expect(
      applyInstallmentEdit(10, previous, next, today).map((item) => item.date_echeance)
    ).toEqual(['2026-01-31', '2026-02-28'])
  })

  test('ajouter ou retirer recale la série sur le mois suivant, au jour choisi', () => {
    const previous = [row('2027-03-09'), row('2027-04-09'), row('2027-05-09')]
    const added = applyInstallmentEdit(100, previous, [...previous, row(null)], today)
    expect(added.map((item) => item.date_echeance)).toEqual([
      '2026-11-09',
      '2026-12-09',
      '2027-01-09',
      '2027-02-09'
    ])
    const removed = applyInstallmentEdit(100, previous, [previous[0]!, previous[2]!], today)
    expect(removed.map((item) => item.date_echeance)).toEqual(['2026-11-09', '2026-12-09'])
    expect(removed.map((item) => item.mensualite_euros)).toEqual([50, 50])
  })

  test('une mensualité saisie recalcule seulement les suivantes', () => {
    const previous = [25, 25, 25, 25].map((amount) => ({
      date_echeance: '2026-11-01',
      mensualite_euros: amount
    }))
    const next = previous.map((item, index) =>
      index === 1 ? { ...item, mensualite_euros: 10 } : item
    )
    expect(
      applyInstallmentEdit(100, previous, next, today).map((item) => item.mensualite_euros)
    ).toEqual([25, 10, 32.5, 32.5])
  })
})

describe('installmentFigures', () => {
  test('compte l’UC à la date, et ignore un enfant pas encore né', () => {
    const file = dossier()
    file.foyer.enfants = [
      { prenom: null, nom: null, date_naissance: '2016-06-01', a_charge: false },
      { prenom: null, nom: null, date_naissance: '2027-01-01', a_charge: true }
    ]
    const onChild = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-10-01',
      mensualite_euros: 100
    })
    expect(onChild.units).toBeCloseTo(1.3)

    file.foyer.enfants[0]!.date_naissance = '2010-01-01'
    const onTeen = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-10-01',
      mensualite_euros: 100
    })
    expect(onTeen.units).toBeCloseTo(1.5)
  })

  test('le premier adulte de 18 ans reçoit 1, même s’il n’est pas le premier de la liste', () => {
    const file = dossier()
    file.foyer.adultes = [
      { ...file.foyer.adultes[0]!, date_naissance: '2010-01-01' },
      { ...file.foyer.adultes[0]!, date_naissance: '1980-01-01' }
    ]
    const figures = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-10-01',
      mensualite_euros: 100
    })
    expect(figures.units).toBeCloseTo(1.5)
  })

  test('une ressource ponctuelle et une fin de crédit suivent le mois de l’échéance', () => {
    const file = dossier()
    file.budget.ressources_ponctuelles = [
      {
        type: 'Prime exceptionnelle',
        personne: 'Foyer (non assigné)',
        date_imputation: '2026-03-15',
        montant_euros: 500
      }
    ]
    file.budget.charges_mensuelles = [
      {
        type: 'Crédits en cours',
        personne: 'Foyer (non assigné)',
        date_fin: '2026-03-01',
        montant_euros: 100
      }
    ]
    const march = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-03-09',
      mensualite_euros: 100
    })
    const april = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-04-01',
      mensualite_euros: 100
    })
    expect(march.resources).toBe(2500)
    expect(march.charges).toBe(500)
    expect(april.resources).toBe(2000)
    expect(april.charges).toBe(400)
    expect(march.teLn).toBeCloseTo(0.2)
    expect(march.ravLn).toBeCloseTo((2500 - 400 - 100) / 30)
    expect(march.teG).toBeCloseTo(600 / 2500)
    expect(march.ravG).toBeCloseTo((2500 - 500 - 100) / 30)
  })

  test('sans date, seules les mensualités sans fin de crédit comptent', () => {
    const file = dossier()
    file.budget.charges_mensuelles = [
      {
        type: 'Crédits en cours',
        personne: 'Foyer (non assigné)',
        date_fin: '2026-03-31',
        montant_euros: 100
      },
      {
        type: 'Énergie et fluide',
        personne: 'Foyer (non assigné)',
        date_fin: null,
        montant_euros: 50
      }
    ]
    const figures = installmentFigures(file.foyer, file.budget, {
      date_echeance: null,
      mensualite_euros: 100
    })
    expect(figures.resources).toBe(2000)
    expect(figures.charges).toBe(450)
    expect(figures.units).toBeNull()
    expect(figures.ravLn).toBeNull()
  })

  test('TE·LN et RAV·LN sont en alerte seulement quand les deux seuils sont franchis', () => {
    const file = dossier()
    const calm = installmentFigures(file.foyer, file.budget, {
      date_echeance: '2026-10-01',
      mensualite_euros: 100
    })
    expect(calm.teLn).toBeCloseTo(0.25)
    expect(calm.ravLn).toBeCloseTo(50)
    expect(loanNetAlert(calm.teLn, calm.ravLn, 35, 15)).toBe(false)
    expect(loanNetAlert(0.36, 10, 35, 15)).toBe(true)
    expect(loanNetAlert(0.36, 15, 35, 15)).toBe(false)
    expect(loanNetAlert(0.35, 10, 35, 15)).toBe(false)
    expect(loanNetAlert(null, 10, 35, 15)).toBe(false)
  })
})
