import type { ProcedureStage } from '../../../../../../shared/repayment-plan'

export type { ProcedureStage }

export type PlanType = 'repayment_plan' | 'social_cohesion_protocol'

export type BanqueDeFranceStatus =
  | 'none'
  | 'admissible_pending'
  | 'repayment_plan_active'
  | 'prp'
  | 'moratorium'

export const PROCEDURE_STAGE_LABELS: Record<ProcedureStage, string> = {
  amiable: 'Recouvrement amiable',
  cdp: 'Commandement de payer',
  assignation: 'Assignation au tribunal',
  audience: 'Audience au tribunal',
  delibere: 'Décision en attente',
  jugement: 'Décision du juge rendue',
  signification: 'Décision de justice signifiée',
  cql: 'Commandement de quitter les lieux'
}

export type EmploymentStatus = keyof typeof EMPLOYMENT_STATUS_LABELS

export interface AdultMember {
  id: string
  lastName: string
  firstName: string
  birthDate: string
  employmentStatus: EmploymentStatus
  employer: string
  cafNumber: string
  isLeaseHolder: boolean
  isOccupant: boolean
}

export interface ChildMember {
  id: string
  lastName: string
  firstName: string
  birthDate: string
  isDependent: boolean
}

export interface AmountLine {
  id: string
  label: string
  amount: number
  custom: boolean
  personId: string | null
  /** Fin d’un crédit en cours, `YYYY-MM`. Vide sinon. */
  endMonth: string
  /** Vide : mensuelle. `YYYY-MM` : ne compte que pour ce mois. */
  month: string
}

export interface AidItem {
  id: string
  label: string
  custom: boolean
}

export const AID_PRESETS = [
  'FSL',
  'Action Logement',
  'Secours catholique',
  'Ligue contre le cancer'
] as const

export const INCOME_GROUPS = [
  {
    label: "Ressources d'activité",
    presets: [
      'Salaire(s) net(s)',
      "Revenus d'activité indépendante",
      'Indemnités journalières',
      'ARE / Allocation chômage'
    ]
  },
  {
    label: 'Prestations sociales',
    presets: [
      'AAH',
      'RSA',
      "Prime d'activité",
      'Prestations familiales',
      'APL / ALF / ALS (direct locataire)',
      'APL / ALF / ALS (tiers payant)',
      "Bourse d'études"
    ]
  },
  {
    label: 'Pensions / rentes',
    presets: [
      "Pension d'invalidité",
      'Pension de retraite',
      "Rente d'accident du travail / maladie professionnelle",
      'Pensions alimentaires reçues'
    ]
  },
  {
    label: 'Autres revenus',
    presets: ['Revenus fonciers', 'Autres revenus réguliers']
  },
  {
    label: 'Ressources ponctuelles',
    presets: [
      'Prime exceptionnelle',
      'Rappel de salaire',
      'Rappel de prestations sociales',
      'Indemnité de licenciement',
      'Indemnité de rupture conventionnelle',
      'Aide financière ponctuelle',
      'Don familial',
      'Succession et héritage',
      "Produit de la vente d'un bien",
      'Autre ressource ponctuelle'
    ]
  }
] as const

export const INCOME_PRESETS: readonly string[] = INCOME_GROUPS.flatMap((group) => group.presets)

export const RECURRING_INCOME_GROUPS = INCOME_GROUPS.filter(
  (group) => group.label !== 'Ressources ponctuelles'
)

export const PUNCTUAL_INCOME_PRESETS = INCOME_GROUPS.flatMap((group) =>
  group.label === 'Ressources ponctuelles' ? group.presets : []
)

export const TOTAL_RENT_PRESET = 'Loyer + Charges - Aide au logement'

export const CREDIT_EXPENSE_PRESET = 'Crédit en cours'

/** Types proposés dans le menu. Le loyer net n’y figure pas : il est une ligne fixe. */
export const EXPENSE_PRESETS = [
  CREDIT_EXPENSE_PRESET,
  'Assurance habitation',
  'Mutuelle santé',
  'Energie (électricité, gaz, autre)',
  'Eau',
  'Téléphonie, télévision et internet',
  'Transport et essence',
  'Garde / scolarité',
  'Pensions alimentaires versées',
  'Dépenses du quotidien',
  'Abonnements'
] as const

export interface Installment {
  id: string
  /** Format `YYYY-MM-DD`. */
  date: string
  amount: number
}

export interface RepaymentPlanForm {
  banqueDeFranceStatus: BanqueDeFranceStatus
  moratoriumEndDate: string
  planType: PlanType
  /** Plan signé par le locataire — piloté à l’enregistrement (phase / dernière action). */
  signed: boolean
  /** Identifiants dossier — éditables dans le formulaire (export) ; le rattachement activité reste sur le tenant. */
  idLocataire: string
  idClient: string
  /** Identifiant du patrimoine (`id_lot`). Chaîne vide si le dossier n’en a pas. */
  idLot: string
  address: string
  postalCode: string
  city: string
  rentalDebt: number
  firstMissedPaymentDate: string
  procedureStage: ProcedureStage | ''
  procedureStageDate: string
  ccapexDate: string
  ctesiDate: string
  tenantVisitedAtHome: boolean
  hasSocialWorker: boolean
  socialWorkerName: string
  socialWorkerOrganization: string
  /** E-mail et/ou téléphone. Vide si non saisi. */
  socialWorkerContact: string
  /** Dernier contact du bailleur (`YYYY-MM-DD`), vide s’il n’est pas renseigné. */
  socialWorkerLastContactDate: string
  amendmentSigned: boolean
  /** Date de dépôt du préavis (`YYYY-MM-DD`), vide s’il n’y en a pas. */
  noticeDate: string
  income: AmountLine[]
  expenses: AmountLine[]
  household: {
    adults: AdultMember[]
    children: ChildMember[]
  }
  requestedAids: AidItem[]
  installments: Installment[]
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  repayment_plan: "Plan d'apurement",
  social_cohesion_protocol: 'Protocole de cohésion sociale'
}

export const BANQUE_DE_FRANCE_STATUS_LABELS: Record<BanqueDeFranceStatus, string> = {
  none: 'Aucune procédure',
  admissible_pending: "Dossier recevable en cours d'instruction",
  repayment_plan_active: 'Plan ou mesures imposés',
  prp: 'Plan de redressement personnel (PRP)',
  moratorium: 'Moratoire'
}

export const EMPLOYMENT_STATUS_LABELS = {
  permanent: 'Salarié en CDI',
  permanent_trial: "Salarié en CDI (période d'essai)",
  fixed_term: 'Salarié en CDD',
  fixed_term_trial: "Salarié en CDD (période d'essai)",
  temporary: 'Intérimaire',
  self_employed: 'Indépendant / Auto-entrepreneur',
  business_owner: "Chef d'entreprise",
  civil_servant: 'Fonctionnaire / Agent public',
  unemployed: 'Sans emploi',
  student: 'Étudiant',
  retired: 'Retraité',
  inactive: 'Sans activité professionnelle',
  other: 'Autre'
} as const
