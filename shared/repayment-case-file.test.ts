import { describe, expect, test } from 'bun:test'

import {
  amountToSettle,
  blankInstallment,
  blankMonthlyLine,
  type Child,
  type CommonData,
  emptyRepaymentCaseFile,
  installmentMetrics,
  readCommonData,
  readRepaymentCaseFile,
  readSocialFinancialDiagnosis,
  recalculateSchedule,
  refreshCaseFile,
  repaymentCaseFileContent,
  scheduleGap
} from './repayment-case-file'

const common = {
  version: 1,
  identification: { id_client: 'CL-1042', id_locataire: 'LOC-8831', id_lot: 'LOT-218' },
  logement: { adresse: '12 rue des Tilleuls', code_postal: '21000', commune: 'Dijon' },
  bail: {
    debut_bail: '2021-03-01',
    contentieux_anterieur: false,
    situation_banque_de_france: 'aucune' as 'aucune' | 'moratoire',
    date_fin_moratoire: null as string | null,
    retrait_dettes: null as CommonData['bail']['retrait_dettes'],
    garant: null
  },
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
        statut_bail: 'titulaire_actuel',
        mode_residence: 'permanente',
        date_reception_preavis: null,
        date_effet_conge: null,
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
    motifs_contestation: [] as string[],
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
        consentement_recherche_pour_dsf: 'accorde',
        position_et_solutions_proposees_par_menage: 'Le ménage souhaite rester.',
        observations_bailleur: 'Proposition soutenable.',
        vulnerabilites: [],
        orientation_logement: { orientation: 'maintien' },
        appreciation_echeancier: 'soutenable',
        motif_non_soutenabilite: null
      }).ok
    ).toBe(true)
    const read = readCommonData(common)
    if (!read.ok) throw new Error(read.error)
    const forms = emptyRepaymentCaseFile()
    forms.donnees_communes = read.value
    forms.echeancier = schedule
    expect(readRepaymentCaseFile(forms).ok).toBe(true)
    expect(
      readRepaymentCaseFile({
        ...forms,
        diagnostic_social_financier: { ...forms.diagnostic_social_financier, echeancier: schedule }
      }).ok
    ).toBe(false)
    expect(readRepaymentCaseFile(emptyRepaymentCaseFile()).ok).toBe(true)
  })

  test('place le loyer net en tête des charges mensuelles', () => {
    const missing = structuredClone(common)
    missing.budget.charges_mensuelles = missing.budget.charges_mensuelles.filter(
      (line) => line.type !== 'cout_logement_net'
    )
    const inserted = readCommonData(missing)
    if (!inserted.ok) throw new Error(inserted.error)
    expect(inserted.value.budget.charges_mensuelles[0]?.type).toBe('cout_logement_net')
    expect(inserted.value.budget.charges_mensuelles[0]?.montant_en_euros).toBeNull()

    const later = structuredClone(common)
    const [rent, energy] = later.budget.charges_mensuelles
    later.budget.charges_mensuelles = [energy!, rent!]
    const moved = readCommonData(later)
    if (!moved.ok) throw new Error(moved.error)
    expect(moved.value.budget.charges_mensuelles.map((line) => line.type)).toEqual([
      'cout_logement_net',
      'energie_eau'
    ])
    expect(moved.value.budget.charges_mensuelles[0]?.montant_en_euros).toBe(512.4)
  })

  test('refuse une contestation, un ancien accord ou une appréciation incohérents', () => {
    const contested = structuredClone(common)
    contested.compte_locataire.statut_contestation = 'conteste'
    contested.compte_locataire.montant_conteste_en_euros = 0
    expect(readCommonData(contested).ok).toBe(false)

    const forms = emptyRepaymentCaseFile()
    expect(
      readRepaymentCaseFile({
        ...forms,
        plan_apurement: { version: 1, accord_bailleur: 'oui' }
      }).ok
    ).toBe(false)

    const diagnosis = readSocialFinancialDiagnosis({
      version: 1,
      consentement_recherche_pour_dsf: 'accorde',
      position_et_solutions_proposees_par_menage: null,
      observations_bailleur: null,
      vulnerabilites: [],
      orientation_logement: { orientation: 'maintien' },
      appreciation_echeancier: 'non_soutenable',
      motif_non_soutenabilite: null
    })
    expect(diagnosis.ok).toBe(false)
  })

  test('rassemble les anciens textes du bailleur', () => {
    const read = readSocialFinancialDiagnosis({
      version: 1,
      consentement_recherche_pour_dsf: 'accorde',
      position_et_solutions_proposees_par_menage: 'Le ménage souhaite rester.',
      observations_bailleur: 'Le bail peut se poursuivre.',
      vulnerabilites: [],
      impact_vulnerabilites: 'Le logement est trop petit.',
      orientation_logement: { orientation: 'maintien', motifs: 'Logement adapté.' },
      appreciation_echeancier: 'soutenable',
      motif_non_soutenabilite: null,
      synthese_professionnelle: 'Proposition soutenable.'
    })
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.observations_bailleur).toBe(
      'Le logement est trop petit.\n\nLe bail peut se poursuivre.\n\nLogement adapté.\n\nProposition soutenable.'
    )
    expect(read.value.orientation_logement).toEqual({ orientation: 'maintien' })
    expect(read.value.risques_expulsion).toEqual([])
  })

  test('relit les risques d’expulsion et la première rencontre', () => {
    const diagnosis = readSocialFinancialDiagnosis({
      version: 1,
      consentement_recherche_pour_dsf: 'accorde',
      position_et_solutions_proposees_par_menage: null,
      observations_bailleur: null,
      vulnerabilites: [],
      risques_expulsion: ['Enfants mineurs', 'Femme enceinte'],
      orientation_logement: { orientation: 'maintien' },
      appreciation_echeancier: 'non_evalue',
      motif_non_soutenabilite: null
    })
    expect(diagnosis.ok).toBe(true)
    if (!diagnosis.ok) return
    expect(diagnosis.value.risques_expulsion).toEqual(['Enfants mineurs', 'Femme enceinte'])

    const refused = readSocialFinancialDiagnosis({
      version: 1,
      consentement_recherche_pour_dsf: 'accorde',
      position_et_solutions_proposees_par_menage: null,
      observations_bailleur: null,
      vulnerabilites: [],
      risques_expulsion: ['Handicap'],
      orientation_logement: { orientation: 'maintien' },
      appreciation_echeancier: 'non_evalue',
      motif_non_soutenabilite: null
    })
    expect(refused.ok).toBe(false)

    const worker = readCommonData({
      ...structuredClone(common),
      travailleur_social: {
        prenom_et_nom: 'Camille Martin',
        organisme: 'CCAS',
        coordonnees: null
      }
    })
    expect(worker.ok).toBe(true)
    if (!worker.ok) return
    expect(worker.value.travailleur_social?.date_premiere_rencontre).toBeNull()
    const dated = readCommonData({
      ...structuredClone(common),
      travailleur_social: {
        prenom_et_nom: 'Camille Martin',
        organisme: 'CCAS',
        coordonnees: null,
        date_premiere_rencontre: '2026-03-12'
      }
    })
    expect(dated.ok).toBe(true)
    if (!dated.ok) return
    expect(dated.value.travailleur_social?.date_premiere_rencontre).toBe('2026-03-12')
  })

  test('ferme les motifs de contestation', () => {
    const outside = structuredClone(common)
    outside.compte_locataire.statut_contestation = 'conteste'
    outside.compte_locataire.montant_conteste_en_euros = 40
    outside.compte_locataire.motifs_contestation = ['Peinture']
    expect(readCommonData(outside).ok).toBe(false)

    const missing = structuredClone(common)
    missing.compte_locataire.statut_contestation = 'conteste'
    missing.compte_locataire.montant_conteste_en_euros = 40
    expect(readCommonData(missing).ok).toBe(false)

    const idle = structuredClone(common)
    idle.compte_locataire.motifs_contestation = ['Charges']
    expect(readCommonData(idle).ok).toBe(false)

    const legacy = structuredClone(common)
    const compte = legacy.compte_locataire as {
      motif_contestation?: string
      motifs_contestation?: string[]
    }
    compte.motif_contestation = 'Charges'
    delete compte.motifs_contestation
    expect(readCommonData(legacy).ok).toBe(false)

    const accepted = structuredClone(common)
    accepted.compte_locataire.statut_contestation = 'conteste'
    accepted.compte_locataire.montant_conteste_en_euros = 40
    accepted.compte_locataire.motifs_contestation = ['Loyer', 'Aide au logement']
    const read = readCommonData(accepted)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.compte_locataire.motifs_contestation).toEqual(['Loyer', 'Aide au logement'])
  })

  test('complète un bail ancien sans retrait de dettes', () => {
    const legacy = structuredClone(common)
    delete (legacy.bail as { retrait_dettes?: null }).retrait_dettes
    const read = readCommonData(legacy)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.bail.retrait_dettes).toBeNull()

    const withdrawn = structuredClone(common)
    withdrawn.bail.retrait_dettes = {
      montant_en_euros: null,
      en_cours_de_regularisation: false
    }
    const open = readCommonData(withdrawn)
    expect(open.ok).toBe(true)
    if (!open.ok) return
    expect(open.value.bail.retrait_dettes).toEqual({
      montant_en_euros: null,
      en_cours_de_regularisation: false
    })
  })

  test('borne la situation Banque de France', () => {
    const dated = structuredClone(common)
    dated.bail.date_fin_moratoire = '2026-12-01'
    expect(readCommonData(dated).ok).toBe(false)

    const moratoire = structuredClone(common)
    moratoire.bail.situation_banque_de_france = 'moratoire'
    moratoire.bail.date_fin_moratoire = '2026-12-01'
    const read = readCommonData(moratoire)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.bail.date_fin_moratoire).toBe('2026-12-01')

    const legacy = structuredClone(common)
    const bail = legacy.bail as {
      situation_banque_de_france?: string
      date_fin_moratoire?: string | null
    }
    delete bail.situation_banque_de_france
    delete bail.date_fin_moratoire
    const opened = readCommonData(legacy)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.value.bail.situation_banque_de_france).toBe('aucune')
    expect(opened.value.bail.date_fin_moratoire).toBeNull()
  })

  test('omet un échéancier replié et relit un échéancier présent', () => {
    const folded = emptyRepaymentCaseFile()
    const stored = JSON.parse(repaymentCaseFileContent(folded)) as Record<string, unknown>
    expect(stored).not.toHaveProperty('echeancier')
    const read = readRepaymentCaseFile(stored)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.echeancier).toBeNull()

    const open = emptyRepaymentCaseFile()
    open.echeancier = schedule
    const kept = JSON.parse(repaymentCaseFileContent(open)) as Record<string, unknown>
    expect(kept).toHaveProperty('echeancier')
    const opened = readRepaymentCaseFile(kept)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.value.echeancier?.echeances[0]?.montant_en_euros).toBe(153.54)
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
    due.compte_locataire.motifs_contestation = ['Charges']
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'exclu' })).toBe(103.54)
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'a_decider' })).toBeNull()
    expect(amountToSettle(due, { ...header, inclure_ancienne_dette_locative: true })).toBe(153.54)
    due.compte_locataire.ancienne_dette_hors_solde_en_euros = null
    expect(amountToSettle(due, { ...header, inclure_ancienne_dette_locative: true })).toBeNull()
    due.compte_locataire.solde_compte_en_euros = 10
    due.compte_locataire.ancienne_dette_hors_solde_en_euros = 0
    expect(amountToSettle(due, { ...header, traitement_montant_conteste: 'exclu' })).toBe(0)
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
    expect(refreshCaseFile(emptyRepaymentCaseFile()).echeancier).toBeNull()
  })

  test('une échéance sans date n’a pas de métrique', () => {
    expect(installmentMetrics(data(), blankInstallment(null, 10)).taux_effort_global).toBeNull()
  })
})
