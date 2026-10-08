export type PlanType = 'repayment_plan' | 'social_cohesion_protocol'

export type OccupancyType = 'lease' | 'accession'

export type BanqueDeFranceStatus =
  | 'none'
  | 'admissible_pending'
  | 'repayment_plan_active'
  | 'prp'
  | 'moratorium'

export type EmploymentStatus =
  | 'permanent'
  | 'permanent_trial'
  | 'fixed_term'
  | 'fixed_term_trial'
  | 'temporary'
  | 'unemployed'
  | 'student'
  | 'retired'

export interface AdultMember {
  id: string
  lastName: string
  firstName: string
  birthDate: string
  employmentStatus: EmploymentStatus
  cafNumber: string
  isLeaseHolder: boolean
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

const RETIREMENT_PENSION_PRESET = 'Pension de retraite' as const

const APL_THIRD_PARTY_PRESET = 'APL / ALF / ALS (tiers payant)' as const
const APL_DIRECT_PRESET = 'APL / ALF / ALS (direct locataire)' as const

export const INCOME_PRESETS = [
  'Salaire(s) net(s)',
  'RSA',
  APL_THIRD_PARTY_PRESET,
  APL_DIRECT_PRESET,
  'Prestations familiales',
  "Prime d'activité",
  'ARE',
  'AAH',
  RETIREMENT_PENSION_PRESET,
  "Pension d'invalidité",
  'Pensions alimentaires reçues'
] as const

export const TOTAL_RENT_PRESET = 'Loyer + Charges - Aide au logement'

/** Types proposés dans le menu. Le loyer net n’y figure pas : il est une ligne fixe. */
export const EXPENSE_PRESETS = [
  'Crédits en cours (cumulé)',
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

export const DEFAULT_PLAN_DURATION_MONTHS = 24

export const MAX_PLAN_DURATION_MONTHS = 36

export interface Installment {
  id: string
  /** Format `YYYY-MM`. */
  yearMonth: string
  amount: number
}

export interface ApurementPlanFormData {
  banqueDeFranceStatus: BanqueDeFranceStatus
  moratoriumEndDate: string
  planType: PlanType
  occupancyType: OccupancyType
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
  paymentOrderDate: string
  ccapexOpened: boolean
  hasSocialWorker: boolean
  socialWorkerName: string
  socialWorkerOrganization: string
  /** E-mail et/ou téléphone. Vide si non saisi. */
  socialWorkerContact: string
  income: AmountLine[]
  expenses: AmountLine[]
  household: {
    adults: AdultMember[]
    children: ChildMember[]
  }
  requestedAids: AidItem[]
  installments: Installment[]
}

export interface ApurementPlanCalculations {
  totalDebt: number
  totalIncome: number
  totalExpenses: number
  disposableIncome: number
  consumptionUnits: number
  disposableIncomePerCu: number
  /** Sum of installments ; `null` if none. */
  planTotal: number | null
}

export interface ApurementPlanOutput {
  tenantId: string
  generatedAt: string
  form: ApurementPlanFormData
  calculations: ApurementPlanCalculations
  summary: {
    monthlyAmount: number
    durationMonths: number
    totalDebt: number
    coversDebt: boolean
  }
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  repayment_plan: "Plan d'apurement",
  social_cohesion_protocol: 'Protocole de cohésion sociale'
}

export const OCCUPANCY_TYPE_LABELS: Record<OccupancyType, string> = {
  lease: 'Bail',
  accession: 'Accession'
}

export const BANQUE_DE_FRANCE_STATUS_LABELS: Record<BanqueDeFranceStatus, string> = {
  none: 'Aucune procédure',
  admissible_pending: "Dossier recevable en cours d'instruction",
  repayment_plan_active: 'Plan ou mesures imposés',
  prp: 'Plan de redressement personnel (PRP)',
  moratorium: 'Moratoire'
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  permanent: 'CDI',
  permanent_trial: "CDI (période d'essai)",
  fixed_term: 'CDD',
  fixed_term_trial: "CDD (période d'essai)",
  temporary: 'Intérim',
  unemployed: 'Sans emploi',
  student: 'Étudiant',
  retired: 'Retraité'
}

/** Ordre UI : peu de champs en plus d’abord, essai en dernier. */
export const EMPLOYMENT_STATUS_ORDER: readonly EmploymentStatus[] = [
  'unemployed',
  'student',
  'temporary',
  'retired',
  'permanent',
  'fixed_term',
  'permanent_trial',
  'fixed_term_trial'
] as const
