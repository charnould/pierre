import {
  blankInstallment,
  blankMonthlyLine,
  blankOneOffLine,
  blankSchedule,
  emptyRepaymentCaseFile,
  type RepaymentCaseFile
} from '../../shared/repayment-case-file'
import type { DocumentChronologyRow } from '../../shared/repayment-document-fields'

const proved = {
  niveau_preuve: 'justifie' as const,
  date_niveau_preuve: '2026-05-01'
}

export function filledRepaymentCaseFile(): RepaymentCaseFile {
  const caseFile = emptyRepaymentCaseFile()
  const common = caseFile.donnees_communes
  common.identification = { id_client: 'CLI-1', id_locataire: 'LOC-1', id_lot: 'LOT-1' }
  common.logement = { adresse: '1 rue des Lilas', code_postal: '21000', commune: 'Dijon' }
  common.bail.debut_bail = '2020-01-01'
  common.compte_locataire.solde_compte_en_euros = 1200
  common.compte_locataire.date_arrete_compte = '2026-11-01'
  common.compte_locataire.date_premier_loyer_impaye = '2026-01-05'
  common.compte_locataire.statut_contestation = 'non_conteste'
  common.compte_locataire.montant_conteste_en_euros = 0
  common.compte_locataire.motifs_impaye = ['Perte d’emploi']
  common.compte_locataire.ancienne_dette_hors_solde_en_euros = 50
  common.travailleur_social = {
    prenom_et_nom: 'Camille Martin',
    organisme: 'CCAS',
    coordonnees: 'camille@example.org',
    date_premiere_rencontre: '2026-02-01'
  }
  common.aides_mobilisables = ['FSL']
  common.foyer.adultes = [
    {
      ...caseFile.donnees_communes.foyer.adultes[0]!,
      id_personne: 'personne_2',
      prenom: 'Ada',
      nom: 'Lovelace',
      date_naissance: '1980-12-10',
      type_emploi: 'Salarié en CDI',
      employeur: 'Atelier',
      allocataire_caf: '1234567',
      statut_bail: 'titulaire_actuel',
      mode_residence: 'permanente'
    }
  ]
  common.foyer.enfants = [
    {
      id_personne: 'personne_4',
      prenom: 'Lina',
      nom: 'Lovelace',
      date_naissance: '2016-04-02',
      a_charge: 'oui',
      mode_residence: 'permanente'
    }
  ]
  common.budget.ressources_mensuelles = [
    {
      ...blankMonthlyLine(),
      type: 'salaire_net',
      id_personne: 'personne_2',
      montant_en_euros: 1500,
      ...proved
    }
  ]
  common.budget.ressources_ponctuelles = [
    {
      ...blankOneOffLine(),
      type: 'prime_exceptionnelle',
      id_personne: 'personne_2',
      mois_imputation: '2026-04',
      montant_en_euros: 300,
      ...proved
    }
  ]
  common.budget.charges_mensuelles = [
    { ...blankMonthlyLine(), type: 'cout_logement_net', montant_en_euros: 400, ...proved },
    {
      ...blankMonthlyLine(),
      type: 'energie_eau',
      id_personne: 'personne_2',
      date_fin: '2027-01-01',
      montant_en_euros: 80,
      ...proved
    }
  ]
  common.budget.charges_ponctuelles = [
    {
      ...blankOneOffLine(),
      type: 'sante_ponctuelle',
      id_personne: 'personne_2',
      mois_imputation: '2026-05',
      montant_en_euros: 120,
      ...proved
    }
  ]
  caseFile.diagnostic_social_financier.consentement_recherche_pour_dsf = 'accorde'
  caseFile.diagnostic_social_financier.position_et_solutions_proposees_par_menage =
    'Rester dans le logement.'
  caseFile.diagnostic_social_financier.observations_bailleur = 'Le bail peut se poursuivre.'
  caseFile.diagnostic_social_financier.orientation_logement.orientation = 'maintien'
  caseFile.diagnostic_social_financier.appreciation_echeancier = 'soutenable'
  caseFile.echeancier = blankSchedule()
  caseFile.echeancier.echeances = [blankInstallment('2026-06-01', 100)]
  return caseFile
}

export const filledChronology: DocumentChronologyRow[] = [
  {
    key: 'phase-1',
    kind: 'phase',
    label: 'Recouvrement amiable',
    date: '2026-04-01',
    commentaire: null
  }
]
