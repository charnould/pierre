import type { CaseFileChronologyItem } from './activities'
import {
  type CommonData,
  type Installment,
  isLeaseHolder,
  isResident,
  type MonthlyLine,
  type OneOffLine,
  refreshCaseFile,
  type RepaymentCaseFile
} from './repayment-case-file'

export const REPAYMENT_DOCUMENT_TAGS = [
  'DATE',
  'EMAIL',
  'ID_CLIENT',
  'ID_LOCATAIRE',
  'ID_LOT',
  'ADRESSE',
  'CODE_POSTAL',
  'VILLE',
  'TITULAIRES',
  'TITULAIRES.PRENOM',
  'TITULAIRES.NOM',
  'TITULAIRES.CAF',
  'ADULTES',
  'ADULTES.PRENOM',
  'ADULTES.NOM',
  'ADULTES.DATE_NAISSANCE',
  'ADULTES.STATUT_PRO',
  'ADULTES.EMPLOYEUR',
  'ADULTES.CAF',
  'ADULTES.TITULAIRE',
  'ADULTES.OCCUPANT',
  'ADULTES.SITUATION_BAIL',
  'ADULTES.MODE_RESIDENCE',
  'ADULTES.ADRESSE_CORRESPONDANCE',
  'ADULTES.CODE_POSTAL_CORRESPONDANCE',
  'ADULTES.VILLE_CORRESPONDANCE',
  'ADULTES.DATE_RECEPTION_PREAVIS',
  'ADULTES.DATE_EFFET_CONGE',
  'ADULTES.DATE_FIN_SOLIDARITE',
  'CONGE',
  'ENFANTS',
  'ENFANTS.PRENOM',
  'ENFANTS.NOM',
  'ENFANTS.DATE_NAISSANCE',
  'ENFANTS.A_CHARGE',
  'ENFANTS.MODE_RESIDENCE',
  'DEBUT_BAIL',
  'GARANT',
  'GARANT_NOM',
  'GARANT_COORDONNEES',
  'RETRAIT_DETTES',
  'RETRAIT_DETTES_MONTANT',
  'RETRAIT_DETTES_REGULARISATION',
  'ANCIENNE_DETTE',
  'CONTENTIEUX_ANTERIEUR',
  'SOLDE_COMPTE',
  'DETTE',
  'DATE_ARRETE_COMPTE',
  'STATUT_CONTESTATION',
  'MONTANT_CONTESTE',
  'MOTIFS_CONTESTATION',
  'MOTIFS_CONTESTATION.LABEL',
  'PREMIER_IMPAYE',
  'MOTIFS_IMPAYE',
  'MOTIFS_IMPAYE.LABEL',
  'BANQUE_DE_FRANCE',
  'DATE_FIN_MORATOIRE',
  'RESSOURCES',
  'RESSOURCES.TYPE',
  'RESSOURCES.PERSONNE',
  'RESSOURCES.MONTANT',
  'RESSOURCES.PREUVE',
  'RESSOURCES.DATE_PREUVE',
  'RESSOURCES.DATE_DEBUT',
  'RESSOURCES.DATE_FIN',
  'TOTAL_RESSOURCES',
  'RESSOURCES_PONCTUELLES',
  'RESSOURCES_PONCTUELLES.TYPE',
  'RESSOURCES_PONCTUELLES.PERSONNE',
  'RESSOURCES_PONCTUELLES.MOIS',
  'RESSOURCES_PONCTUELLES.MONTANT',
  'RESSOURCES_PONCTUELLES.PREUVE',
  'RESSOURCES_PONCTUELLES.DATE_PREUVE',
  'TOTAL_RESSOURCES_PONCTUELLES',
  'CHARGES',
  'CHARGES.TYPE',
  'CHARGES.PERSONNE',
  'CHARGES.MONTANT',
  'CHARGES.PREUVE',
  'CHARGES.DATE_PREUVE',
  'CHARGES.DATE_DEBUT',
  'CHARGES.DATE_FIN',
  'TOTAL_CHARGES',
  'CHARGES_PONCTUELLES',
  'CHARGES_PONCTUELLES.TYPE',
  'CHARGES_PONCTUELLES.PERSONNE',
  'CHARGES_PONCTUELLES.MOIS',
  'CHARGES_PONCTUELLES.MONTANT',
  'CHARGES_PONCTUELLES.PREUVE',
  'CHARGES_PONCTUELLES.DATE_PREUVE',
  'TOTAL_CHARGES_PONCTUELLES',
  'CONSENTEMENT_DSF',
  'VULNERABILITES',
  'VULNERABILITES.LABEL',
  'RISQUES_EXPULSION',
  'RISQUES_EXPULSION.LABEL',
  'AIDES',
  'AIDES.LABEL',
  'TRAVAILLEUR_SOCIAL_IDENTIFIE',
  'TRAVAILLEUR_SOCIAL',
  'TRAVAILLEUR_SOCIAL_ORGANISME',
  'TRAVAILLEUR_SOCIAL_COORDONNEES',
  'TRAVAILLEUR_SOCIAL_PREMIERE_RENCONTRE',
  'POSITION_MENAGE',
  'OBSERVATIONS_BAILLEUR',
  'ORIENTATION_LOGEMENT',
  'STADE',
  'CHRONOLOGIE',
  'CHRONOLOGIE.TYPE',
  'CHRONOLOGIE.EVENEMENT',
  'CHRONOLOGIE.DATE',
  'CHRONOLOGIE.COMMENTAIRE',
  'ECHEANCIER_PROPOSE',
  'ECHEANCIER_INCLURE_ANCIENNE_DETTE',
  'ECHEANCIER_TRAITEMENT_CONTESTATION',
  'MONTANT_A_APURER',
  'ECART_ECHEANCIER',
  'TOTAL_PLAN',
  'ECHEANCES',
  'ECHEANCES.NUMERO',
  'ECHEANCES.ECHEANCE',
  'ECHEANCES.MONTANT',
  'ECHEANCES.RESSOURCES',
  'ECHEANCES.CHARGES',
  'ECHEANCES.UC',
  'ECHEANCES.TAUX_EFFORT_LOYER_NET',
  'ECHEANCES.RAV_LOYER_NET',
  'ECHEANCES.TAUX_EFFORT_GLOBAL',
  'ECHEANCES.RAV_GLOBAL',
  'SOUTENABILITE_ECHEANCIER',
  'MOTIF_NON_SOUTENABILITE'
] as const

const TAGS = new Set<string>(REPAYMENT_DOCUMENT_TAGS)

const EMPLOYER_OPTIONAL = new Set([
  'Indépendant / Auto-entrepreneur',
  'Chef d’entreprise',
  'Sans emploi',
  'Étudiant',
  'En formation',
  'Retraité',
  'Sans activité professionnelle',
  'Autre'
])

const IDENTIFICATION = 'Identification'
const HOUSEHOLD = 'Membres du foyer'
const LEASE = 'Bail et compte locataire'
const BUDGET = 'Budget du foyer'
const DIAGNOSIS = 'Diagnostic social'
const CHRONOLOGY = 'Chronologie'
const SCHEDULE = 'Proposition d’échéancier'

export type DocumentChronologyRow = {
  key: string
  kind: CaseFileChronologyItem['kind']
  label: string
  date: string
  commentaire: string | null
}

export type MissingDocumentField = {
  targetId: string
  section: string
  label: string
  adultPopoverIndex?: number
}

export function isRepaymentDocumentTag(tag: string): boolean {
  return TAGS.has(tag)
}

export function documentChronologyRows(
  entries: readonly { key: string; item: CaseFileChronologyItem }[]
): DocumentChronologyRow[] {
  return entries.map((entry) => ({
    key: entry.key,
    kind: entry.item.kind,
    label: entry.item.kind === 'action' ? entry.item.action : entry.item.phase,
    date: entry.item.date_realisation,
    commentaire: entry.item.commentaire
  }))
}

export function repaymentDocumentStage(
  chronology: readonly DocumentChronologyRow[],
  fallback: string
): string {
  const phases = chronology.filter(
    (row) => row.kind === 'phase' && row.label.trim() && row.date.trim()
  )
  const last = [...phases].sort((left, right) => left.date.localeCompare(right.date)).at(-1)
  return last?.label.trim() || fallback.trim()
}

export function missingRepaymentDocumentMessage(fields: readonly MissingDocumentField[]): string {
  const labels = fields.map((field) => field.label)
  const shown = labels.slice(0, 12)
  const rest = labels.length - shown.length
  const list = rest > 0 ? `${shown.join(', ')}…` : shown.join(', ')
  return `Il manque : ${list}.`
}

export function missingRepaymentDocumentFields(
  tags: readonly string[],
  caseFile: RepaymentCaseFile,
  chronology: readonly DocumentChronologyRow[],
  stageFallback = ''
): MissingDocumentField[] {
  const used = new Set(tags)
  const current = refreshCaseFile(caseFile)
  const common = current.donnees_communes
  const fields: MissingDocumentField[] = []
  const seen = new Set<string>()
  const has = (...names: string[]) => names.some((name) => used.has(name))
  const add = (field: MissingDocumentField) => {
    if (seen.has(field.targetId)) return
    seen.add(field.targetId)
    fields.push(field)
  }

  if (has('ID_CLIENT') && !common.identification.id_client) {
    add({ targetId: 'id_client', section: IDENTIFICATION, label: 'Identifiant client' })
  }
  if (has('ID_LOCATAIRE') && !common.identification.id_locataire) {
    add({ targetId: 'id_locataire', section: IDENTIFICATION, label: 'Identifiant locataire' })
  }
  if (has('ID_LOT') && !common.identification.id_lot) {
    add({ targetId: 'id_lot', section: IDENTIFICATION, label: 'Identifiant logement' })
  }
  if (has('ADRESSE') && !common.logement.adresse) {
    add({ targetId: 'adresse', section: IDENTIFICATION, label: 'Adresse' })
  }
  if (has('CODE_POSTAL') && !common.logement.code_postal) {
    add({ targetId: 'code_postal', section: IDENTIFICATION, label: 'Code postal' })
  }
  if (has('VILLE') && !common.logement.commune) {
    add({ targetId: 'commune', section: IDENTIFICATION, label: 'Commune' })
  }

  const adults = common.foyer.adultes
  const holders = adults.flatMap((adult, index) =>
    isLeaseHolder(adult.statut_bail) ? [{ adult, index }] : []
  )
  if (
    has('TITULAIRES', 'TITULAIRES.PRENOM', 'TITULAIRES.NOM', 'TITULAIRES.CAF') &&
    holders.length === 0
  ) {
    add({
      targetId: 'adult_0_statut_bail',
      section: HOUSEHOLD,
      label: 'Situation au bail d’un titulaire'
    })
  }
  adults.forEach((adult, index) => {
    const name = adultLabel(adult, index)
    if (has('ADULTES.PRENOM') && needsAdult(adult, holders, index) && !adult.prenom) {
      add({ targetId: `adult_${index}_prenom`, section: HOUSEHOLD, label: `Prénom de ${name}` })
    }
    if (has('TITULAIRES.PRENOM') && isLeaseHolder(adult.statut_bail) && !adult.prenom) {
      add({ targetId: `adult_${index}_prenom`, section: HOUSEHOLD, label: `Prénom de ${name}` })
    }
    if (has('ADULTES.NOM') && needsAdult(adult, holders, index) && !adult.nom) {
      add({ targetId: `adult_${index}_nom`, section: HOUSEHOLD, label: `Nom de ${name}` })
    }
    if (has('TITULAIRES.NOM') && isLeaseHolder(adult.statut_bail) && !adult.nom) {
      add({ targetId: `adult_${index}_nom`, section: HOUSEHOLD, label: `Nom de ${name}` })
    }
    if (
      has('ADULTES.DATE_NAISSANCE') &&
      needsAdult(adult, holders, index) &&
      !adult.date_naissance
    ) {
      add({
        targetId: `adult_${index}_date_naissance`,
        section: HOUSEHOLD,
        label: `Naissance de ${name}`
      })
    }
    if (has('ADULTES.STATUT_PRO') && needsAdult(adult, holders, index) && !adult.type_emploi) {
      add({
        targetId: `adult_${index}_type_emploi`,
        section: HOUSEHOLD,
        label: `Emploi de ${name}`
      })
    }
    if (
      has('ADULTES.EMPLOYEUR') &&
      needsAdult(adult, holders, index) &&
      (!adult.type_emploi || !EMPLOYER_OPTIONAL.has(adult.type_emploi)) &&
      !adult.employeur
    ) {
      add({
        targetId: `adult_${index}_employeur`,
        section: HOUSEHOLD,
        label: `Employeur de ${name}`
      })
    }
    if (has('ADULTES.CAF') && needsAdult(adult, holders, index) && !adult.allocataire_caf) {
      add({
        targetId: `adult_${index}_allocataire_caf`,
        section: HOUSEHOLD,
        label: `N° CAF de ${name}`
      })
    }
    if (has('TITULAIRES.CAF') && isLeaseHolder(adult.statut_bail) && !adult.allocataire_caf) {
      add({
        targetId: `adult_${index}_allocataire_caf`,
        section: HOUSEHOLD,
        label: `N° CAF de ${name}`
      })
    }
    if (
      has('ADULTES.TITULAIRE', 'ADULTES.SITUATION_BAIL') &&
      needsAdult(adult, holders, index) &&
      adult.statut_bail === 'inconnu'
    ) {
      add({
        targetId: `adult_${index}_statut_bail`,
        section: HOUSEHOLD,
        label: `Situation au bail de ${name}`
      })
    }
    if (
      has('ADULTES.OCCUPANT', 'ADULTES.MODE_RESIDENCE') &&
      needsAdult(adult, holders, index) &&
      !adult.mode_residence
    ) {
      add({
        targetId: `adult_${index}_mode_residence`,
        section: HOUSEHOLD,
        label: `Occupation de ${name}`,
        adultPopoverIndex: index
      })
    }
    const mail = adult.adresse_correspondance
    if (mail && has('ADULTES.ADRESSE_CORRESPONDANCE') && !mail.adresse) {
      add({
        targetId: `adult_${index}_correspondance_adresse`,
        section: HOUSEHOLD,
        label: `Adresse de correspondance de ${name}`,
        adultPopoverIndex: index
      })
    }
    if (mail && has('ADULTES.CODE_POSTAL_CORRESPONDANCE') && !mail.code_postal) {
      add({
        targetId: `adult_${index}_correspondance_code_postal`,
        section: HOUSEHOLD,
        label: `Code postal de correspondance de ${name}`,
        adultPopoverIndex: index
      })
    }
    if (mail && has('ADULTES.VILLE_CORRESPONDANCE') && !mail.commune) {
      add({
        targetId: `adult_${index}_correspondance_commune`,
        section: HOUSEHOLD,
        label: `Ville de correspondance de ${name}`,
        adultPopoverIndex: index
      })
    }
    const hasNotice = Boolean(adult.date_reception_preavis || adult.date_effet_conge)
    if (
      hasNotice &&
      has('ADULTES.DATE_RECEPTION_PREAVIS', 'ADULTES.DATE_FIN_SOLIDARITE') &&
      !adult.date_reception_preavis
    ) {
      add({
        targetId: `adult_${index}_date_reception_preavis`,
        section: HOUSEHOLD,
        label: `Réception du préavis de ${name}`,
        adultPopoverIndex: index
      })
    }
    if (hasNotice && has('ADULTES.DATE_EFFET_CONGE') && !adult.date_effet_conge) {
      add({
        targetId: `adult_${index}_date_effet_conge`,
        section: HOUSEHOLD,
        label: `Effet du congé de ${name}`,
        adultPopoverIndex: index
      })
    }
  })

  if (
    has(
      'ENFANTS.PRENOM',
      'ENFANTS.NOM',
      'ENFANTS.DATE_NAISSANCE',
      'ENFANTS.A_CHARGE',
      'ENFANTS.MODE_RESIDENCE'
    )
  ) {
    common.foyer.enfants.forEach((child, index) => {
      const name = [child.prenom, child.nom].filter(Boolean).join(' ') || `l’enfant ${index + 1}`
      if (has('ENFANTS.PRENOM') && !child.prenom) {
        add({ targetId: `child_${index}_prenom`, section: HOUSEHOLD, label: `Prénom de ${name}` })
      }
      if (has('ENFANTS.NOM') && !child.nom) {
        add({ targetId: `child_${index}_nom`, section: HOUSEHOLD, label: `Nom de ${name}` })
      }
      if (has('ENFANTS.DATE_NAISSANCE') && !child.date_naissance) {
        add({
          targetId: `child_${index}_date_naissance`,
          section: HOUSEHOLD,
          label: `Naissance de ${name}`
        })
      }
      if (has('ENFANTS.A_CHARGE') && child.a_charge === 'inconnu') {
        add({
          targetId: `child_${index}_a_charge`,
          section: HOUSEHOLD,
          label: `À charge de ${name}`
        })
      }
      if (has('ENFANTS.MODE_RESIDENCE') && !child.mode_residence) {
        add({
          targetId: `child_${index}_mode_residence`,
          section: HOUSEHOLD,
          label: `Résidence de ${name}`
        })
      }
    })
  }

  const lease = common.bail
  const account = common.compte_locataire
  if (has('DEBUT_BAIL') && !lease.debut_bail) {
    add({ targetId: 'debut_bail', section: LEASE, label: 'Début du bail' })
  }
  if (lease.garant && has('GARANT_NOM') && !lease.garant.prenom_et_nom) {
    add({ targetId: 'garant_prenom_et_nom', section: LEASE, label: 'Prénom et nom du garant' })
  }
  if (lease.garant && has('GARANT_COORDONNEES') && !lease.garant.coordonnees) {
    add({ targetId: 'garant_coordonnees', section: LEASE, label: 'Coordonnées du garant' })
  }
  if (
    lease.retrait_dettes &&
    has('RETRAIT_DETTES_MONTANT') &&
    lease.retrait_dettes.montant_en_euros == null
  ) {
    add({
      targetId: 'retrait_dettes_montant',
      section: LEASE,
      label: 'Montant du retrait de dettes'
    })
  }
  if (has('ANCIENNE_DETTE') && account.ancienne_dette_hors_solde_en_euros == null) {
    add({
      targetId: 'ancienne_dette_hors_solde_en_euros',
      section: LEASE,
      label: 'Ancienne dette locative'
    })
  }
  if (has('SOLDE_COMPTE', 'DETTE') && account.solde_compte_en_euros == null) {
    add({ targetId: 'solde_compte_en_euros', section: LEASE, label: 'Solde du compte' })
  }
  if (has('DATE_ARRETE_COMPTE') && !account.date_arrete_compte) {
    add({ targetId: 'date_arrete_compte', section: LEASE, label: 'Date d’arrêté' })
  }
  if (
    has(
      'STATUT_CONTESTATION',
      'MONTANT_CONTESTE',
      'MOTIFS_CONTESTATION',
      'MOTIFS_CONTESTATION.LABEL'
    ) &&
    account.statut_contestation === 'inconnu'
  ) {
    add({ targetId: 'statut_contestation', section: LEASE, label: 'Contestation' })
  }
  if (
    account.statut_contestation === 'conteste' &&
    has('MONTANT_CONTESTE') &&
    account.montant_conteste_en_euros == null
  ) {
    add({ targetId: 'montant_conteste_en_euros', section: LEASE, label: 'Montant contesté' })
  }
  if (
    account.statut_contestation === 'conteste' &&
    has('MOTIFS_CONTESTATION', 'MOTIFS_CONTESTATION.LABEL') &&
    account.motifs_contestation.length === 0
  ) {
    add({
      targetId: 'motifs_contestation_choix',
      section: LEASE,
      label: 'Motif de la contestation'
    })
  }
  if (has('PREMIER_IMPAYE') && !account.date_premier_loyer_impaye) {
    add({ targetId: 'date_premier_loyer_impaye', section: LEASE, label: 'Premier impayé' })
  }
  if (has('MOTIFS_IMPAYE', 'MOTIFS_IMPAYE.LABEL') && account.motifs_impaye.length === 0) {
    add({ targetId: 'motifs_impaye_choix', section: LEASE, label: 'Motif de l’impayé' })
  }
  if (
    lease.situation_banque_de_france === 'moratoire' &&
    has('DATE_FIN_MORATOIRE') &&
    !lease.date_fin_moratoire
  ) {
    add({ targetId: 'date_fin_moratoire', section: LEASE, label: 'Date de fin du moratoire' })
  }

  budgetLines(common.budget.ressources_mensuelles, 'ressource_mensuelle', 'ressource', has, add)
  oneOffLines(
    common.budget.ressources_ponctuelles,
    'ressource_ponctuelle',
    'ressource ponctuelle',
    has,
    add
  )
  budgetLines(common.budget.charges_mensuelles, 'charge_mensuelle', 'charge', has, add)
  oneOffLines(common.budget.charges_ponctuelles, 'charge_ponctuelle', 'charge ponctuelle', has, add)

  const diagnosis = current.diagnostic_social_financier
  if (has('CONSENTEMENT_DSF') && diagnosis.consentement_recherche_pour_dsf === 'non_renseigne') {
    add({ targetId: 'consentement_recherche_pour_dsf', section: DIAGNOSIS, label: 'Consentement' })
  }
  const social = common.travailleur_social
  if (social && has('TRAVAILLEUR_SOCIAL') && !social.prenom_et_nom) {
    add({
      targetId: 'travailleur_social_prenom_et_nom',
      section: DIAGNOSIS,
      label: 'Nom du travailleur social'
    })
  }
  if (social && has('TRAVAILLEUR_SOCIAL_ORGANISME') && !social.organisme) {
    add({ targetId: 'travailleur_social_organisme', section: DIAGNOSIS, label: 'Structure' })
  }
  if (social && has('TRAVAILLEUR_SOCIAL_COORDONNEES') && !social.coordonnees) {
    add({
      targetId: 'travailleur_social_coordonnees',
      section: DIAGNOSIS,
      label: 'Coordonnées du travailleur social'
    })
  }
  if (social && has('TRAVAILLEUR_SOCIAL_PREMIERE_RENCONTRE') && !social.date_premiere_rencontre) {
    add({
      targetId: 'travailleur_social_date_premiere_rencontre',
      section: DIAGNOSIS,
      label: 'Première rencontre'
    })
  }
  if (has('POSITION_MENAGE') && !diagnosis.position_et_solutions_proposees_par_menage) {
    add({ targetId: 'position_menage', section: DIAGNOSIS, label: 'Position du ménage' })
  }
  if (has('OBSERVATIONS_BAILLEUR') && !diagnosis.observations_bailleur) {
    add({
      targetId: 'observations_bailleur',
      section: DIAGNOSIS,
      label: 'Observations du bailleur'
    })
  }
  if (has('ORIENTATION_LOGEMENT') && diagnosis.orientation_logement.orientation === 'a_evaluer') {
    add({ targetId: 'orientation', section: DIAGNOSIS, label: 'Orientation' })
  }

  if (has('STADE') && !repaymentDocumentStage(chronology, stageFallback)) {
    add({ targetId: 'chronologie', section: CHRONOLOGY, label: 'Phase' })
  }
  if (
    has(
      'CHRONOLOGIE',
      'CHRONOLOGIE.TYPE',
      'CHRONOLOGIE.EVENEMENT',
      'CHRONOLOGIE.DATE',
      'CHRONOLOGIE.COMMENTAIRE'
    )
  ) {
    if (chronology.length === 0) {
      add({
        targetId: 'chronologie_ajouter_action',
        section: CHRONOLOGY,
        label: 'Événement de chronologie'
      })
    }
    chronology.forEach((row) => {
      const kind = row.kind === 'action' ? 'action' : 'phase'
      if (has('CHRONOLOGIE.EVENEMENT', 'CHRONOLOGIE') && !row.label.trim()) {
        add({
          targetId: `chronologie_${row.key}_${kind}`,
          section: CHRONOLOGY,
          label: row.kind === 'action' ? 'Action de la chronologie' : 'Phase de la chronologie'
        })
      }
      if (has('CHRONOLOGIE.DATE', 'CHRONOLOGIE') && !row.date.trim()) {
        add({
          targetId: `chronologie_${row.key}_date`,
          section: CHRONOLOGY,
          label: 'Date de la chronologie'
        })
      }
    })
  }

  const scheduleTags = has(
    'ECHEANCES',
    'ECHEANCES.NUMERO',
    'ECHEANCES.ECHEANCE',
    'ECHEANCES.MONTANT',
    'ECHEANCES.RESSOURCES',
    'ECHEANCES.CHARGES',
    'ECHEANCES.UC',
    'ECHEANCES.TAUX_EFFORT_LOYER_NET',
    'ECHEANCES.RAV_LOYER_NET',
    'ECHEANCES.TAUX_EFFORT_GLOBAL',
    'ECHEANCES.RAV_GLOBAL',
    'TOTAL_PLAN',
    'MONTANT_A_APURER',
    'ECART_ECHEANCIER',
    'ECHEANCIER_INCLURE_ANCIENNE_DETTE',
    'ECHEANCIER_TRAITEMENT_CONTESTATION',
    'SOUTENABILITE_ECHEANCIER',
    'MOTIF_NON_SOUTENABILITE'
  )
  const schedule = current.echeancier
  if (scheduleTags && !schedule) {
    add({ targetId: 'echeancier_proposer', section: SCHEDULE, label: 'Proposer un échéancier' })
  }
  if (
    schedule &&
    has('MONTANT_A_APURER', 'ECART_ECHEANCIER') &&
    schedule.montant_a_apurer_en_euros == null
  ) {
    add(settleField(current))
  }
  if (
    schedule &&
    has('ECHEANCES', 'ECHEANCES.NUMERO', 'ECHEANCES.ECHEANCE', 'ECHEANCES.MONTANT', 'TOTAL_PLAN') &&
    schedule.echeances.length === 0
  ) {
    add({ targetId: 'echeancier_ajouter', section: SCHEDULE, label: 'Ajouter une échéance' })
  }
  schedule?.echeances.forEach((row, index) => {
    const number = index + 1
    if (has('ECHEANCES.ECHEANCE', 'ECHEANCES') && !row.date_echeance) {
      add({
        targetId: `echeancier_${index}_date`,
        section: SCHEDULE,
        label: `Date de l’échéance ${number}`
      })
    }
    if (has('ECHEANCES.MONTANT', 'ECHEANCES', 'ECART_ECHEANCIER') && row.montant_en_euros == null) {
      add({
        targetId: `echeancier_${index}_montant`,
        section: SCHEDULE,
        label: `Mensualité ${number}`
      })
    }
    const metric = metricField(current, row, index, has)
    if (metric) add(metric)
  })
  if (
    schedule &&
    has('SOUTENABILITE_ECHEANCIER') &&
    diagnosis.appreciation_echeancier === 'non_evalue'
  ) {
    add({
      targetId: 'appreciation_echeancier',
      section: SCHEDULE,
      label: 'Soutenabilité de l’échéancier'
    })
  }
  if (
    schedule &&
    has('MOTIF_NON_SOUTENABILITE') &&
    diagnosis.appreciation_echeancier === 'non_soutenable' &&
    !diagnosis.motif_non_soutenabilite
  ) {
    add({
      targetId: 'motif_non_soutenabilite',
      section: SCHEDULE,
      label: 'Motif de non-soutenabilité'
    })
  }

  return fields
}

function needsAdult(
  adult: CommonData['foyer']['adultes'][number],
  holders: { adult: CommonData['foyer']['adultes'][number]; index: number }[],
  index: number
): boolean {
  if (presentAdult(adult)) return true
  return holders.length === 0 && index === 0
}

function presentAdult(adult: CommonData['foyer']['adultes'][number]): boolean {
  return (
    [
      adult.prenom,
      adult.nom,
      adult.date_naissance,
      adult.type_emploi,
      adult.employeur,
      adult.allocataire_caf,
      adult.mode_residence,
      adult.adresse_correspondance,
      adult.date_reception_preavis,
      adult.date_effet_conge
    ].some((value) => value != null && value !== '') || adult.statut_bail !== 'inconnu'
  )
}

function adultLabel(adult: CommonData['foyer']['adultes'][number], index: number): string {
  return [adult.prenom, adult.nom].filter(Boolean).join(' ') || `l’adulte ${index + 1}`
}

function budgetLines(
  lines: readonly MonthlyLine[],
  prefix: 'ressource_mensuelle' | 'charge_mensuelle',
  noun: string,
  has: (...names: string[]) => boolean,
  add: (field: MissingDocumentField) => void
) {
  const tag = prefix.startsWith('ressource') ? 'RESSOURCES' : 'CHARGES'
  const used = has(
    tag,
    `TOTAL_${tag}`,
    `${tag}.TYPE`,
    `${tag}.PERSONNE`,
    `${tag}.MONTANT`,
    `${tag}.PREUVE`,
    `${tag}.DATE_PREUVE`,
    `${tag}.DATE_DEBUT`,
    `${tag}.DATE_FIN`
  )
  if (!used) return
  const empty = lines.every(blankMonthly)
  if (lines.length === 0) {
    add({
      targetId:
        prefix === 'ressource_mensuelle'
          ? 'ressources_mensuelles_ajouter'
          : 'charges_mensuelles_ajouter',
      section: BUDGET,
      label: prefix === 'ressource_mensuelle' ? 'Ressource mensuelle' : 'Charge mensuelle'
    })
    return
  }
  lines.forEach((line, index) => {
    if (blankMonthly(line) && !(empty && index === 0)) return
    const label = `${noun} ${index + 1}`
    if (has(tag, `${tag}.TYPE`) && !line.type) {
      add({ targetId: `${prefix}_${index}_type`, section: BUDGET, label: `Type de la ${label}` })
    }
    if (has(tag, `TOTAL_${tag}`, `${tag}.MONTANT`) && line.montant_en_euros == null) {
      add({
        targetId: `${prefix}_${index}_montant`,
        section: BUDGET,
        label: `Montant de la ${label}`
      })
    }
    if (has(`${tag}.PREUVE`, `${tag}.DATE_PREUVE`) && !line.niveau_preuve) {
      add({
        targetId: `${prefix}_${index}_preuve`,
        section: BUDGET,
        label: `Preuve de la ${label}`
      })
    }
  })
}

function oneOffLines(
  lines: readonly OneOffLine[],
  prefix: 'ressource_ponctuelle' | 'charge_ponctuelle',
  noun: string,
  has: (...names: string[]) => boolean,
  add: (field: MissingDocumentField) => void
) {
  const tag = prefix.startsWith('ressource') ? 'RESSOURCES_PONCTUELLES' : 'CHARGES_PONCTUELLES'
  lines.forEach((line, index) => {
    if (blankOneOff(line)) return
    const label = `${noun} ${index + 1}`
    if (has(`${tag}.TYPE`) && !line.type) {
      add({ targetId: `${prefix}_${index}_type`, section: BUDGET, label: `Type de la ${label}` })
    }
    if (has(`${tag}.MONTANT`) && line.montant_en_euros == null) {
      add({
        targetId: `${prefix}_${index}_montant`,
        section: BUDGET,
        label: `Montant de la ${label}`
      })
    }
    if (has(`${tag}.MOIS`) && !line.mois_imputation) {
      add({ targetId: `${prefix}_${index}_mois`, section: BUDGET, label: `Mois de la ${label}` })
    }
    if (has(`${tag}.PREUVE`, `${tag}.DATE_PREUVE`) && !line.niveau_preuve) {
      add({
        targetId: `${prefix}_${index}_preuve`,
        section: BUDGET,
        label: `Preuve de la ${label}`
      })
    }
  })
}

function blankMonthly(line: MonthlyLine): boolean {
  return (
    line.type == null &&
    line.montant_en_euros == null &&
    line.date_debut == null &&
    line.date_fin == null &&
    line.niveau_preuve == null
  )
}

function blankOneOff(line: OneOffLine): boolean {
  return (
    line.type == null &&
    line.montant_en_euros == null &&
    line.mois_imputation == null &&
    line.niveau_preuve == null
  )
}

function settleField(caseFile: RepaymentCaseFile): MissingDocumentField {
  const account = caseFile.donnees_communes.compte_locataire
  const schedule = caseFile.echeancier
  if (account.solde_compte_en_euros == null) {
    return { targetId: 'solde_compte_en_euros', section: LEASE, label: 'Solde du compte' }
  }
  if (schedule?.traitement_montant_conteste === 'a_decider') {
    return {
      targetId: 'echeancier_contestation',
      section: SCHEDULE,
      label: 'Montant contesté dans l’échéancier'
    }
  }
  if (
    schedule?.traitement_montant_conteste === 'exclu' &&
    account.statut_contestation === 'inconnu'
  ) {
    return { targetId: 'statut_contestation', section: LEASE, label: 'Contestation' }
  }
  if (
    schedule?.traitement_montant_conteste === 'exclu' &&
    account.montant_conteste_en_euros == null
  ) {
    return { targetId: 'montant_conteste_en_euros', section: LEASE, label: 'Montant contesté' }
  }
  if (
    schedule?.inclure_ancienne_dette_locative &&
    account.ancienne_dette_hors_solde_en_euros == null
  ) {
    return {
      targetId: 'ancienne_dette_hors_solde_en_euros',
      section: LEASE,
      label: 'Ancienne dette locative'
    }
  }
  return { targetId: 'montant_a_apurer', section: SCHEDULE, label: 'Montant total à apurer' }
}

function metricField(
  caseFile: RepaymentCaseFile,
  row: Installment,
  index: number,
  has: (...names: string[]) => boolean
): MissingDocumentField | null {
  const number = index + 1
  const checks: [string, number | null][] = [
    ['ECHEANCES.RESSOURCES', row.ressources_totales_du_mois_en_euros],
    ['ECHEANCES.CHARGES', row.charges_totales_du_mois_en_euros],
    ['ECHEANCES.UC', row.unites_de_consommation],
    ['ECHEANCES.TAUX_EFFORT_LOYER_NET', row.taux_effort_loyer_net],
    [
      'ECHEANCES.RAV_LOYER_NET',
      row.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros
    ],
    ['ECHEANCES.TAUX_EFFORT_GLOBAL', row.taux_effort_global],
    ['ECHEANCES.RAV_GLOBAL', row.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros]
  ]
  const missing = checks.find(([tag, value]) => has(tag) && value == null)
  if (!missing) return null
  if (!row.date_echeance) {
    return {
      targetId: `echeancier_${index}_date`,
      section: SCHEDULE,
      label: `Date de l’échéance ${number}`
    }
  }
  const birth = residentWithoutBirth(caseFile, row.date_echeance)
  if (
    birth &&
    (missing[0] === 'ECHEANCES.UC' || missing[0].includes('RAV') || missing[0].includes('TAUX'))
  ) {
    return birth
  }
  const line = unpaidLine(caseFile, row.date_echeance)
  if (line) return line
  if (row.montant_en_euros == null) {
    return {
      targetId: `echeancier_${index}_montant`,
      section: SCHEDULE,
      label: `Mensualité ${number}`
    }
  }
  return {
    targetId: `echeancier_${index}_date`,
    section: SCHEDULE,
    label: `Indicateurs de l’échéance ${number}`
  }
}

function residentWithoutBirth(
  caseFile: RepaymentCaseFile,
  on: string
): MissingDocumentField | null {
  const common = caseFile.donnees_communes
  for (const [index, adult] of common.foyer.adultes.entries()) {
    if (!isResident(adult.mode_residence) || (adult.date_naissance && adult.date_naissance <= on))
      continue
    if (adult.date_naissance) continue
    return {
      targetId: `adult_${index}_date_naissance`,
      section: HOUSEHOLD,
      label: `Naissance de ${adultLabel(adult, index)}`
    }
  }
  for (const [index, child] of common.foyer.enfants.entries()) {
    if (!isResident(child.mode_residence) || child.date_naissance) continue
    const name = [child.prenom, child.nom].filter(Boolean).join(' ') || `l’enfant ${index + 1}`
    return {
      targetId: `child_${index}_date_naissance`,
      section: HOUSEHOLD,
      label: `Naissance de ${name}`
    }
  }
  return null
}

function unpaidLine(caseFile: RepaymentCaseFile, on: string): MissingDocumentField | null {
  const budget = caseFile.donnees_communes.budget
  for (const [index, line] of budget.charges_mensuelles.entries()) {
    if (
      blankMonthly(line) ||
      !covers(line.date_debut, line.date_fin, on) ||
      line.montant_en_euros != null
    ) {
      continue
    }
    return {
      targetId: `charge_mensuelle_${index}_montant`,
      section: BUDGET,
      label:
        index === 0 && line.type === 'cout_logement_net'
          ? 'Loyer net'
          : `Montant de la charge ${index + 1}`
    }
  }
  for (const [index, line] of budget.ressources_mensuelles.entries()) {
    if (
      blankMonthly(line) ||
      !covers(line.date_debut, line.date_fin, on) ||
      line.montant_en_euros != null
    ) {
      continue
    }
    return {
      targetId: `ressource_mensuelle_${index}_montant`,
      section: BUDGET,
      label: `Montant de la ressource ${index + 1}`
    }
  }
  const month = on.slice(0, 7)
  for (const [index, line] of budget.charges_ponctuelles.entries()) {
    if (blankOneOff(line) || line.mois_imputation !== month || line.montant_en_euros != null)
      continue
    return {
      targetId: `charge_ponctuelle_${index}_montant`,
      section: BUDGET,
      label: `Montant de la charge ponctuelle ${index + 1}`
    }
  }
  for (const [index, line] of budget.ressources_ponctuelles.entries()) {
    if (blankOneOff(line) || line.mois_imputation !== month || line.montant_en_euros != null)
      continue
    return {
      targetId: `ressource_ponctuelle_${index}_montant`,
      section: BUDGET,
      label: `Montant de la ressource ponctuelle ${index + 1}`
    }
  }
  return null
}

function covers(start: string | null, end: string | null, on: string): boolean {
  if (start != null && start > on) return false
  if (end != null && end < on) return false
  return true
}
