import { describe, expect, test } from 'bun:test'

import {
  amountToSettle,
  blankAdult,
  blankInstallment,
  blankMonthlyLine,
  calculatedSolidarityEnd,
  type Child,
  type CommonData,
  emptyRepaymentForms,
  installmentMetrics,
  readCommonData,
  readRepaymentForms,
  readSettlementPlan,
  readSocialFinancialDiagnosis,
  recalculateSchedule,
  refreshForms,
  scheduleGap
} from './repayment-plan'

const common = {
  version: 1,
  identification: { id_client: 'CL-1042', id_locataire: 'LOC-8831', id_lot: 'LOT-218' },
  logement: { adresse: '12 rue des Tilleuls', code_postal: '21000', commune: 'Dijon' },
  bail: { debut_bail: '2021-03-01', garant: null },
  foyer: {
    adultes: [
      {
        id_personne: 'personne_1',
        prenom: 'Camille',
        nom: 'Martin',
        date_naissance: '1988-05-14',
        type_emploi: 'Salarié en CDI',
        employeur: 'Entreprise Exemple',
        allocataire_caf: '1234567',
        adresse_correspondance: null,
        statut_bail: 'titulaire_origine_et_actuel',
        mode_residence: 'permanente',
        date_effet_conge: null,
        remplacement_cotitulaire: 'non_concerne',
        date_entree_nouveau_cotitulaire: null,
        date_fin_solidarite: null
      }
    ],
    enfants: []
  },
  compte_locataire: {
    solde_compte_en_euros: 153.54,
    date_arrete_compte: '2026-11-06',
    date_premier_loyer_impaye: '2026-07-01',
    statut_contestation: 'non_conteste',
    montant_conteste_en_euros: 0,
    motif_contestation: null,
    motifs_impaye: ['Baisse d’activité ou de revenus'],
    ancienne_dette_hors_solde_en_euros: 0
  },
  budget: {
    ressources_mensuelles: [
      {
        type: 'salaire_net',
        id_personne: 'personne_1',
        montant_en_euros: 1480,
        date_debut: null,
        date_fin: null,
        niveau_preuve: 'justifie',
        date_niveau_preuve: '2026-11-06'
      }
    ],
    ressources_ponctuelles: [],
    charges_mensuelles: [
      {
        type: 'cout_logement_net',
        id_personne: null,
        montant_en_euros: 512.4,
        date_debut: null,
        date_fin: null,
        niveau_preuve: 'justifie',
        date_niveau_preuve: '2026-11-06'
      },
      {
        type: 'energie_eau',
        id_personne: null,
        montant_en_euros: 120,
        date_debut: null,
        date_fin: null,
        niveau_preuve: 'declare',
        date_niveau_preuve: '2026-11-06'
      }
    ],
    charges_ponctuelles: []
  },
  travailleur_social: null,
  aides_mobilisables: []
}

const installment = {
  date_echeance: '2026-12-01',
  montant_en_euros: 153.54,
  ressources_totales_du_mois_en_euros: 1480,
  charges_totales_du_mois_en_euros: 632.4,
  unites_de_consommation: 1,
  taux_effort_loyer_net: 0.449959,
  reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: 27.14,
  taux_effort_global: 0.531041,
  reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: 23.14
}

const schedule = {
  traitement_montant_conteste: 'non_concerne' as const,
  inclure_ancienne_dette_locative: false,
  montant_a_apurer_en_euros: 153.54,
  echeances: [installment]
}

describe('formulaires', () => {
  test('relit les quatre objets du contrat et un dossier vide', () => {
    expect(readCommonData(common).ok).toBe(true)
    expect(
      readSocialFinancialDiagnosis({
        version: 1,
        menage_informe_du_dsf: 'oui',
        consentement_recherche_pour_dsf: 'accorde',
        signature_diagnostic_par_menage: 'non_renseignee',
        position_et_solutions_proposees_par_menage: 'Le ménage souhaite rester.',
        observations_bailleur: null,
        vulnerabilites: [],
        impact_vulnerabilites: null,
        orientation_logement: { orientation: 'maintien', motifs: 'Logement adapté.' },
        appreciation_echeancier: 'soutenable',
        motif_non_soutenabilite: null,
        synthese_professionnelle: 'Proposition soutenable.'
      }).ok
    ).toBe(true)
    const read = readCommonData(common)
    if (!read.ok) throw new Error(read.error)
    const forms = emptyRepaymentForms()
    forms.donnees_communes = read.value
    forms.echeancier = schedule
    expect(readRepaymentForms(forms).ok).toBe(true)
    expect(
      readRepaymentForms({
        ...forms,
        diagnostic_social_financier: { ...forms.diagnostic_social_financier, echeancier: schedule }
      }).ok
    ).toBe(false)
    expect(readRepaymentForms(emptyRepaymentForms()).ok).toBe(true)
  })

  test('refuse une contestation, un accord ou une appréciation incohérents', () => {
    const contested = structuredClone(common)
    contested.compte_locataire.statut_contestation = 'conteste'
    contested.compte_locataire.montant_conteste_en_euros = 0
    expect(readCommonData(contested).ok).toBe(false)

    const plan = {
      version: 1,
      accord_bailleur: 'oui',
      accord_menage: 'oui',
      date_accord: null,
      mode_de_paiement_echeances: 'virement'
    }
    expect(readSettlementPlan(plan).ok).toBe(false)
    expect(
      readSettlementPlan({ ...plan, accord_menage: 'non', date_accord: '2026-11-06' }).ok
    ).toBe(false)

    const diagnosis = readSocialFinancialDiagnosis({
      version: 1,
      menage_informe_du_dsf: 'oui',
      consentement_recherche_pour_dsf: 'accorde',
      signature_diagnostic_par_menage: 'non_renseignee',
      position_et_solutions_proposees_par_menage: null,
      observations_bailleur: null,
      vulnerabilites: [],
      impact_vulnerabilites: null,
      orientation_logement: { orientation: 'maintien', motifs: null },
      appreciation_echeancier: 'non_soutenable',
      motif_non_soutenabilite: null,
      synthese_professionnelle: null
    })
    expect(diagnosis.ok).toBe(false)
  })
})

describe('calculs', () => {
  const data = (): CommonData => {
    const read = readCommonData(structuredClone(common))
    if (!read.ok) throw new Error(read.error)
    return read.value
  }

  test('retrouve les quatre métriques de la fixture', () => {
    expect(installmentMetrics(data(), installment)).toEqual({
      ressources_totales_du_mois_en_euros: 1480,
      charges_totales_du_mois_en_euros: 632.4,
      unites_de_consommation: 1,
      taux_effort_loyer_net: 0.449959,
      reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: 27.14,
      taux_effort_global: 0.531041,
      reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: 23.14
    })
  })

  test('calcule le montant à apurer', () => {
    const file = data()
    const header = {
      traitement_montant_conteste: 'non_concerne' as const,
      inclure_ancienne_dette_locative: false
    }
    expect(amountToSettle(file, header)).toBe(153.54)
    file.compte_locataire.solde_compte_en_euros = -20
    expect(amountToSettle(file, header)).toBe(0)
    file.compte_locataire.solde_compte_en_euros = null
    expect(amountToSettle(file, header)).toBeNull()

    const due = data()
    due.compte_locataire.statut_contestation = 'conteste'
    due.compte_locataire.montant_conteste_en_euros = 50
    due.compte_locataire.motif_contestation = 'Charges'
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'exclu' })).toBe(103.54)
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'a_decider' })).toBeNull()
    expect(amountToSettle(due, { ...header, inclure_ancienne_dette_locative: true })).toBe(153.54)
    due.compte_locataire.ancienne_dette_hors_solde_en_euros = null
    expect(amountToSettle(due, { ...header, inclure_ancienne_dette_locative: true })).toBeNull()
    due.compte_locataire.solde_compte_en_euros = 10
    due.compte_locataire.ancienne_dette_hors_solde_en_euros = 0
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'exclu' })).toBe(0)
  })

  test('calcule la fin de solidarité', () => {
    const adult = blankAdult()
    adult.statut_bail = 'ancien_titulaire'
    adult.remplacement_cotitulaire = 'non'
    adult.date_effet_conge = '2026-08-31'
    expect(calculatedSolidarityEnd(adult)).toBe('2027-02-28')
    adult.date_effet_conge = '2023-08-31'
    expect(calculatedSolidarityEnd(adult)).toBe('2024-02-29')
    adult.remplacement_cotitulaire = 'oui'
    adult.date_effet_conge = '2026-03-01'
    adult.date_entree_nouveau_cotitulaire = '2026-05-01'
    expect(calculatedSolidarityEnd(adult)).toBe('2026-05-01')
    adult.statut_bail = 'non_titulaire'
    expect(calculatedSolidarityEnd(adult)).toBeNull()
    adult.statut_bail = 'ancien_titulaire'
    adult.remplacement_cotitulaire = 'inconnu'
    expect(calculatedSolidarityEnd(adult)).toBeNull()
  })

  test('ignore les résidents occasionnels et une naissance future', () => {
    const file = data()
    const child: Child = {
      id_personne: 'personne_2',
      prenom: 'Lina',
      nom: 'Martin',
      date_naissance: '2016-06-01',
      a_charge: 'oui',
      mode_residence: 'alternee'
    }
    file.foyer.enfants = [child]
    expect(installmentMetrics(file, installment).unites_de_consommation).toBe(1.3)
    child.date_naissance = '2012-12-01'
    expect(
      installmentMetrics(file, { ...installment, date_echeance: '2026-12-01' })
        .unites_de_consommation
    ).toBe(1.5)
    child.mode_residence = 'occasionnelle'
    expect(installmentMetrics(file, installment).unites_de_consommation).toBe(1)
    child.mode_residence = 'alternee'
    child.date_naissance = '2027-01-01'
    expect(installmentMetrics(file, installment).unites_de_consommation).toBe(1)
    child.date_naissance = null
    expect(installmentMetrics(file, installment).unites_de_consommation).toBeNull()
  })

  test('annule les taux sans ressource et le loyer net sans coût de logement', () => {
    const file = data()
    file.budget.ressources_mensuelles[0]!.montant_en_euros = 0
    const paid = installmentMetrics(file, installment)
    expect(paid.taux_effort_loyer_net).toBeNull()
    expect(paid.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros).toBe(-22.2)
    file.budget.charges_mensuelles = file.budget.charges_mensuelles.filter(
      (line) => line.type !== 'cout_logement_net'
    )
    file.budget.ressources_mensuelles[0]!.montant_en_euros = 1480
    expect(installmentMetrics(file, installment).taux_effort_loyer_net).toBeNull()
    expect(installmentMetrics(file, installment).taux_effort_global).toBeCloseTo(
      (120 + 153.54) / 1480,
      5
    )
  })

  test('respecte les bornes et le mois d’imputation', () => {
    const file = data()
    const bonus = {
      type: 'prime_exceptionnelle',
      id_personne: null,
      montant_en_euros: 20,
      mois_imputation: '2026-12',
      niveau_preuve: 'declare' as const,
      date_niveau_preuve: '2026-11-06'
    }
    file.budget.ressources_ponctuelles = [bonus]
    file.budget.charges_mensuelles[1]!.date_fin = '2026-11-30'
    const december = installmentMetrics(file, installment)
    const january = installmentMetrics(file, { ...installment, date_echeance: '2027-01-01' })
    expect(december.ressources_totales_du_mois_en_euros).toBe(1500)
    expect(december.charges_totales_du_mois_en_euros).toBe(512.4)
    expect(january.ressources_totales_du_mois_en_euros).toBe(1480)
    expect(january.charges_totales_du_mois_en_euros).toBe(512.4)
    file.budget.ressources_mensuelles.push({ ...blankMonthlyLine(), type: 'salaire_net' })
    expect(installmentMetrics(file, installment).ressources_totales_du_mois_en_euros).toBeNull()
  })

  test('recalcule l’échéancier unique', () => {
    const file = data()
    const refreshed = recalculateSchedule(file, schedule)
    expect(refreshed.echeances[0]?.taux_effort_loyer_net).toBe(0.449959)
    expect(scheduleGap(refreshed)).toBe(0)
    expect(refreshForms(emptyRepaymentForms()).echeancier.montant_a_apurer_en_euros).toBeNull()
  })

  test('une échéance sans date n’a pas de métrique', () => {
    expect(installmentMetrics(data(), blankInstallment(null, 10)).taux_effort_global).toBeNull()
  })
})
