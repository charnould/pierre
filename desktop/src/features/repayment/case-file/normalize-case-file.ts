import {
  type Adult,
  type CommonData,
  type OneOffLine,
  type RepaymentCaseFile,
  type ScheduleAssessment,
  showsCorrespondenceAddress
} from '@pierre/shared/repayment-case-file'

function trimToNull(value: string | null): string | null {
  if (value == null) return null
  const text = value.trim()
  return text === '' ? null : text
}

function normalizeCorrespondenceAddress(
  value: Adult['adresse_correspondance']
): Adult['adresse_correspondance'] {
  if (!value) return null
  const adresse = trimToNull(value.adresse)
  const code_postal = trimToNull(value.code_postal)
  const commune = trimToNull(value.commune)
  if (adresse == null && code_postal == null && commune == null) return null
  return { adresse, code_postal, commune }
}

function roundEuros(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function roundLineAmount<T extends { montant_en_euros: number | null }>(line: T): T {
  return { ...line, montant_en_euros: roundEuros(line.montant_en_euros) }
}

export function normalizeCaseFile(caseFile: RepaymentCaseFile): RepaymentCaseFile {
  const common = caseFile.donnees_communes
  const social = common.travailleur_social
  const guarantor = common.bail.garant
  const withdrawal = common.bail.retrait_dettes
  const account = common.compte_locataire
  const contested =
    account.statut_contestation === 'non_conteste'
      ? { montant_conteste_en_euros: 0, motifs_contestation: [] }
      : account.statut_contestation === 'inconnu'
        ? { montant_conteste_en_euros: null, motifs_contestation: [] }
        : {
            montant_conteste_en_euros: roundEuros(account.montant_conteste_en_euros),
            motifs_contestation: account.motifs_contestation
              .map((motive) => motive.trim())
              .filter(Boolean)
          }
  const diagnosis = caseFile.diagnostic_social_financier
  return {
    donnees_communes: {
      ...common,
      identification: {
        id_client: trimToNull(common.identification.id_client),
        id_locataire: trimToNull(common.identification.id_locataire),
        id_lot: trimToNull(common.identification.id_lot)
      },
      logement: {
        adresse: trimToNull(common.logement.adresse),
        code_postal: trimToNull(common.logement.code_postal),
        commune: trimToNull(common.logement.commune)
      },
      bail: {
        debut_bail: trimToNull(common.bail.debut_bail),
        contentieux_anterieur: common.bail.contentieux_anterieur,
        situation_banque_de_france: common.bail.situation_banque_de_france,
        date_fin_moratoire:
          common.bail.situation_banque_de_france === 'moratoire'
            ? trimToNull(common.bail.date_fin_moratoire)
            : null,
        retrait_dettes: withdrawal
          ? {
              montant_en_euros: roundEuros(withdrawal.montant_en_euros),
              en_cours_de_regularisation: withdrawal.en_cours_de_regularisation
            }
          : null,
        garant: guarantor
          ? {
              prenom_et_nom: trimToNull(guarantor.prenom_et_nom),
              coordonnees: trimToNull(guarantor.coordonnees)
            }
          : null
      },
      foyer: {
        adultes: common.foyer.adultes.map((adult) => {
          const date_reception_preavis = trimToNull(adult.date_reception_preavis)
          return {
            ...adult,
            prenom: trimToNull(adult.prenom),
            nom: trimToNull(adult.nom),
            date_naissance: trimToNull(adult.date_naissance),
            type_emploi: trimToNull(adult.type_emploi),
            employeur: trimToNull(adult.employeur),
            allocataire_caf: trimToNull(adult.allocataire_caf),
            adresse_correspondance: showsCorrespondenceAddress(adult.mode_residence)
              ? normalizeCorrespondenceAddress(adult.adresse_correspondance)
              : null,
            date_reception_preavis,
            date_effet_conge: trimToNull(adult.date_effet_conge),
            date_fin_solidarite: trimToNull(adult.date_fin_solidarite)
          }
        }),
        enfants: common.foyer.enfants.map((child) => ({
          ...child,
          prenom: trimToNull(child.prenom),
          nom: trimToNull(child.nom),
          date_naissance: trimToNull(child.date_naissance)
        }))
      },
      compte_locataire: {
        ...account,
        solde_compte_en_euros: roundEuros(account.solde_compte_en_euros),
        date_arrete_compte: trimToNull(account.date_arrete_compte),
        date_premier_loyer_impaye: trimToNull(account.date_premier_loyer_impaye),
        ...contested,
        motifs_impaye: account.motifs_impaye.map((motive) => motive.trim()).filter(Boolean),
        ancienne_dette_hors_solde_en_euros: roundEuros(account.ancienne_dette_hors_solde_en_euros)
      },
      budget: {
        ressources_mensuelles: common.budget.ressources_mensuelles.map(normalizeMonthlyLine),
        ressources_ponctuelles: common.budget.ressources_ponctuelles.map(normalizeOneOffLine),
        charges_mensuelles: common.budget.charges_mensuelles.map(normalizeMonthlyLine),
        charges_ponctuelles: common.budget.charges_ponctuelles.map(normalizeOneOffLine)
      },
      travailleur_social: social
        ? {
            prenom_et_nom: trimToNull(social.prenom_et_nom),
            organisme: trimToNull(social.organisme),
            coordonnees: trimToNull(social.coordonnees),
            date_premiere_rencontre: trimToNull(social.date_premiere_rencontre)
          }
        : null,
      aides_mobilisables: common.aides_mobilisables.map((aid) => aid.trim()).filter(Boolean)
    },
    diagnostic_social_financier: {
      ...diagnosis,
      position_et_solutions_proposees_par_menage: trimToNull(
        diagnosis.position_et_solutions_proposees_par_menage
      ),
      observations_bailleur: trimToNull(diagnosis.observations_bailleur),
      vulnerabilites: diagnosis.vulnerabilites.map((item) => item.trim()).filter(Boolean),
      risques_expulsion: diagnosis.risques_expulsion.map((item) => item.trim()).filter(Boolean),
      orientation_logement: diagnosis.orientation_logement,
      motif_non_soutenabilite: normalizeUnsustainabilityMotive(
        diagnosis.appreciation_echeancier,
        diagnosis.motif_non_soutenabilite
      )
    },
    plan_apurement: caseFile.plan_apurement,
    protocole_cohesion_sociale: caseFile.protocole_cohesion_sociale,
    echeancier: caseFile.echeancier == null ? null : normalizeSchedule(caseFile.echeancier)
  }
}

function normalizeUnsustainabilityMotive(
  assessment: ScheduleAssessment,
  motive: string | null
): string | null {
  return assessment === 'non_soutenable' ? trimToNull(motive) : null
}

function normalizeMonthlyLine(line: CommonData['budget']['charges_mensuelles'][number]) {
  return {
    ...roundLineAmount(line),
    type: trimToNull(line.type),
    date_debut: trimToNull(line.date_debut),
    date_fin: trimToNull(line.date_fin),
    date_niveau_preuve: trimToNull(line.date_niveau_preuve)
  }
}

function normalizeOneOffLine(line: OneOffLine) {
  return {
    ...roundLineAmount(line),
    type: trimToNull(line.type),
    mois_imputation: trimToNull(line.mois_imputation),
    date_niveau_preuve: trimToNull(line.date_niveau_preuve)
  }
}

function normalizeSchedule(schedule: NonNullable<RepaymentCaseFile['echeancier']>) {
  return {
    ...schedule,
    montant_a_apurer_en_euros: roundEuros(schedule.montant_a_apurer_en_euros),
    echeances: schedule.echeances.map((row) => ({
      ...row,
      date_echeance: trimToNull(row.date_echeance),
      montant_en_euros: roundEuros(row.montant_en_euros),
      ressources_totales_du_mois_en_euros: roundEuros(row.ressources_totales_du_mois_en_euros),
      charges_totales_du_mois_en_euros: roundEuros(row.charges_totales_du_mois_en_euros),
      reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: roundEuros(
        row.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros
      ),
      reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: roundEuros(
        row.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros
      )
    }))
  }
}
