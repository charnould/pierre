import {
  type Adult,
  calculatedSolidarityEnd,
  type CommonData,
  type OneOffLine,
  type RepaymentForms,
  type ScheduleAssessment
} from '../../../../../shared/repayment-plan'

export const JOBS = [
  'Salarié en CDI',
  'Salarié en CDI (période d’essai)',
  'Salarié en CDD',
  'Salarié en CDD (période d’essai)',
  'Intérimaire',
  'Indépendant / Auto-entrepreneur',
  'Chef d’entreprise',
  'Fonctionnaire / Agent public',
  'Sans emploi',
  'Étudiant',
  'Retraité',
  'Sans activité professionnelle',
  'Autre'
] as const

export const MOTIVES = [
  'Perte d’emploi',
  'Crédit à la consommation',
  'Séparation',
  'Deuil',
  'Fin du titre de séjour',
  'Frais médicaux',
  'Frais de réparation du véhicule',
  'Modification de la composition familiale',
  'Maladie',
  'Dépendance administrative et budgétaire',
  'Violence conjugale',
  'SLS'
] as const

export const AIDS = [
  'FSL',
  'Action Logement',
  'Secours catholique',
  'Ligue contre le cancer'
] as const

export const FOYER = 'foyer'

export type PersonChoice = { id: string; label: string }

export function householdPeople(foyer: CommonData['foyer']): PersonChoice[] {
  const people = [...foyer.adultes, ...foyer.enfants].flatMap((person) => {
    const label = [person.prenom, person.nom]
      .map((part) => part?.trim() ?? '')
      .filter((part) => part !== '')
      .join(' ')
    if (!label) return []
    return [{ id: person.id_personne, label }]
  })
  return [{ id: FOYER, label: 'Foyer' }, ...people]
}

export function personChoices(people: readonly PersonChoice[], current: string): PersonChoice[] {
  return people.some((person) => person.id === current)
    ? [...people]
    : [...people, { id: current, label: current }]
}

export function patchAdult(adult: Adult, patch: Partial<Adult>): Adult {
  if (patch.date_fin_solidarite !== undefined) return { ...adult, ...patch }
  const previous = calculatedSolidarityEnd(adult)
  const next = { ...adult, ...patch }
  if (adult.date_fin_solidarite == null || adult.date_fin_solidarite === previous) {
    next.date_fin_solidarite = calculatedSolidarityEnd(next)
  }
  return next
}

function blank(value: string | null): string | null {
  if (value == null) return null
  const text = value.trim()
  return text === '' ? null : text
}

function money(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function lineMoney<T extends { montant_en_euros: number | null }>(line: T): T {
  return { ...line, montant_en_euros: money(line.montant_en_euros) }
}

export function normalize(forms: RepaymentForms): RepaymentForms {
  const common = forms.donnees_communes
  const social = common.travailleur_social
  const guarantor = common.bail.garant
  const compte = common.compte_locataire
  const contested =
    compte.statut_contestation === 'non_conteste'
      ? { montant_conteste_en_euros: 0, motif_contestation: null }
      : compte.statut_contestation === 'inconnu'
        ? { montant_conteste_en_euros: null, motif_contestation: null }
        : {
            montant_conteste_en_euros: money(compte.montant_conteste_en_euros),
            motif_contestation: blank(compte.motif_contestation)
          }
  const diagnosis = forms.diagnostic_social_financier
  const plan = forms.plan_apurement
  const accepted = plan.accord_bailleur === 'oui' && plan.accord_menage === 'oui'
  return {
    donnees_communes: {
      ...common,
      identification: {
        id_client: blank(common.identification.id_client),
        id_locataire: blank(common.identification.id_locataire),
        id_lot: blank(common.identification.id_lot)
      },
      logement: {
        adresse: blank(common.logement.adresse),
        code_postal: blank(common.logement.code_postal),
        commune: blank(common.logement.commune)
      },
      bail: {
        debut_bail: blank(common.bail.debut_bail),
        garant: guarantor ? { prenom: blank(guarantor.prenom), nom: blank(guarantor.nom) } : null
      },
      foyer: {
        adultes: common.foyer.adultes.map((adult) => ({
          ...adult,
          prenom: blank(adult.prenom),
          nom: blank(adult.nom),
          date_naissance: blank(adult.date_naissance),
          type_emploi: blank(adult.type_emploi),
          employeur: blank(adult.employeur),
          allocataire_caf: blank(adult.allocataire_caf),
          adresse_correspondance: adult.adresse_correspondance
            ? {
                adresse: blank(adult.adresse_correspondance.adresse),
                code_postal: blank(adult.adresse_correspondance.code_postal),
                commune: blank(adult.adresse_correspondance.commune)
              }
            : null,
          date_effet_conge: blank(adult.date_effet_conge),
          date_entree_nouveau_cotitulaire: blank(adult.date_entree_nouveau_cotitulaire),
          date_fin_solidarite: blank(adult.date_fin_solidarite)
        })),
        enfants: common.foyer.enfants.map((child) => ({
          ...child,
          prenom: blank(child.prenom),
          nom: blank(child.nom),
          date_naissance: blank(child.date_naissance)
        }))
      },
      compte_locataire: {
        ...compte,
        solde_compte_en_euros: money(compte.solde_compte_en_euros),
        date_arrete_compte: blank(compte.date_arrete_compte),
        date_premier_loyer_impaye: blank(compte.date_premier_loyer_impaye),
        ...contested,
        motifs_impaye: compte.motifs_impaye.map((motive) => motive.trim()).filter(Boolean),
        ancienne_dette_hors_solde_en_euros: money(compte.ancienne_dette_hors_solde_en_euros)
      },
      budget: {
        ressources_mensuelles: common.budget.ressources_mensuelles.map(cleanMonthly),
        ressources_ponctuelles: common.budget.ressources_ponctuelles.map(cleanOneOff),
        charges_mensuelles: common.budget.charges_mensuelles.map(cleanMonthly),
        charges_ponctuelles: common.budget.charges_ponctuelles.map(cleanOneOff)
      },
      travailleur_social: social
        ? {
            prenom_et_nom: blank(social.prenom_et_nom),
            organisme: blank(social.organisme),
            coordonnees: blank(social.coordonnees)
          }
        : null,
      aides_mobilisables: common.aides_mobilisables.map((aid) => aid.trim()).filter(Boolean)
    },
    diagnostic_social_financier: {
      ...diagnosis,
      position_et_solutions_proposees_par_menage: blank(
        diagnosis.position_et_solutions_proposees_par_menage
      ),
      observations_bailleur: blank(diagnosis.observations_bailleur),
      vulnerabilites: diagnosis.vulnerabilites.map((item) => item.trim()).filter(Boolean),
      impact_vulnerabilites: blank(diagnosis.impact_vulnerabilites),
      orientation_logement: {
        ...diagnosis.orientation_logement,
        motifs: blank(diagnosis.orientation_logement.motifs)
      },
      motif_non_soutenabilite: assessmentMotive(
        diagnosis.appreciation_echeancier,
        diagnosis.motif_non_soutenabilite
      ),
      synthese_professionnelle: blank(diagnosis.synthese_professionnelle)
    },
    plan_apurement: {
      ...plan,
      date_accord: accepted ? blank(plan.date_accord) : null
    },
    protocole_cohesion_sociale: forms.protocole_cohesion_sociale,
    echeancier: cleanSchedule(forms.echeancier)
  }
}

function assessmentMotive(assessment: ScheduleAssessment, motive: string | null): string | null {
  return assessment === 'non_soutenable' ? blank(motive) : null
}

function cleanMonthly(line: CommonData['budget']['charges_mensuelles'][number]) {
  return {
    ...lineMoney(line),
    type: blank(line.type),
    date_debut: blank(line.date_debut),
    date_fin: blank(line.date_fin),
    date_niveau_preuve: blank(line.date_niveau_preuve)
  }
}

function cleanOneOff(line: OneOffLine) {
  return {
    ...lineMoney(line),
    type: blank(line.type),
    mois_imputation: blank(line.mois_imputation),
    date_niveau_preuve: blank(line.date_niveau_preuve)
  }
}

function cleanSchedule(schedule: RepaymentForms['echeancier']) {
  return {
    ...schedule,
    montant_a_apurer_en_euros: money(schedule.montant_a_apurer_en_euros),
    echeances: schedule.echeances.map((row) => ({
      ...row,
      date_echeance: blank(row.date_echeance),
      montant_en_euros: money(row.montant_en_euros),
      ressources_totales_du_mois_en_euros: money(row.ressources_totales_du_mois_en_euros),
      charges_totales_du_mois_en_euros: money(row.charges_totales_du_mois_en_euros),
      reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: money(
        row.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros
      ),
      reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: money(
        row.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros
      )
    }))
  }
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function withProof<
  T extends { niveau_preuve: OneOffLine['niveau_preuve']; date_niveau_preuve: string | null }
>(line: T, niveau_preuve: OneOffLine['niveau_preuve']): T {
  return {
    ...line,
    niveau_preuve,
    date_niveau_preuve: niveau_preuve == null ? null : todayIso()
  }
}

export function storedPerson(value: string | null): string | null {
  return value == null || value === FOYER ? null : value
}

export function selectedPerson(value: string | null): string {
  return value ?? FOYER
}
