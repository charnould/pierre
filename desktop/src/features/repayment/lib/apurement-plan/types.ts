export type PlanType = 'repayment_plan' | 'social_cohesion_protocol'

export type OccupancyType = 'lease' | 'accession'

export type BanqueDeFranceStatus =
  | 'none'
  | 'admissible_pending'
  | 'repayment_plan_active'
  | 'moratorium'

export type EmploymentStatus =
  | 'permanent'
  | 'permanent_trial'
  | 'fixed_term'
  | 'fixed_term_trial'
  | 'temporary'
  | 'unemployed'
  | 'retired'

export interface AdultMember {
  id: string
  lastName: string
  firstName: string
  birthDate: string
  employmentStatus: EmploymentStatus
  /** Acronyme caisse (ex. CARSAT) si statut CDI/CDD/retraité ; sinon ''. */
  pensionFund: string
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
  'Pensions alimentaires reçues'
] as const

export const EXPENSE_PRESETS = [
  'Loyer total',
  'Crédits en cours (cumulé)',
  'Assurance habitation',
  'Mutuelle santé',
  'Électricité / gaz',
  'Eau',
  'Téléphone(s)',
  'Transport',
  'Garde / scolarité',
  'Pensions alimentaires versées',
  'Impôt sur le revenu (mensuel)',
  'Abonnements'
] as const

export const TOTAL_RENT_PRESET = EXPENSE_PRESETS[0]

export const DEFAULT_PLAN_DURATION_MONTHS = 24

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
  repayment_plan_active: 'Plan ou mesures de remboursement en vigueur',
  moratorium: 'Moratoire'
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  permanent: 'CDI',
  permanent_trial: "CDI (période d'essai)",
  fixed_term: 'CDD',
  fixed_term_trial: "CDD (période d'essai)",
  temporary: 'Intérim',
  unemployed: 'Sans emploi',
  retired: 'Retraité'
}

/** Ordre UI : peu de champs en plus d’abord, essai en dernier. */
export const EMPLOYMENT_STATUS_ORDER: readonly EmploymentStatus[] = [
  'unemployed',
  'temporary',
  'retired',
  'permanent',
  'fixed_term',
  'permanent_trial',
  'fixed_term_trial'
] as const

const PENSION_FUND_ELIGIBLE: ReadonlySet<EmploymentStatus> = new Set([
  'permanent',
  'permanent_trial',
  'fixed_term',
  'fixed_term_trial',
  'retired'
])

export function employmentStatusNeedsPensionFund(status: EmploymentStatus): boolean {
  return PENSION_FUND_ELIGIBLE.has(status)
}

/** Acronymes (sauf Banque de France), dédupliqués, tri alphanumérique (`fr`). */
export const PENSION_FUND_OPTIONS: readonly string[] = [
  'Agirc-Arrco',
  'Banque de France',
  'CARCDSF',
  'CARMF',
  'CARPIMKO',
  'CARSAT',
  'CAVAMAC',
  'CAVEC',
  'CAVIMAC',
  'CAVP',
  'CIPAV',
  'CNAV',
  'CNBF',
  'CNIEG',
  'CNRACL',
  'CPRP SNCF',
  'CRP RATP',
  'CRPCEN',
  'ENIM',
  'MSA',
  'SRE'
]

const EMPLOYMENT_SELECT_SEP = '::'

/** Valeur Select : `unemployed` | `temporary` | `retired::CARSAT`. */
export function encodeEmploymentSelectValue(
  status: EmploymentStatus,
  pensionFund: string
): string | null {
  if (!employmentStatusNeedsPensionFund(status)) return status
  const fund = pensionFund.trim()
  if (!fund) return null
  return `${status}${EMPLOYMENT_SELECT_SEP}${fund}`
}

export function decodeEmploymentSelectValue(value: string): {
  employmentStatus: EmploymentStatus
  pensionFund: string
} | null {
  const sep = value.indexOf(EMPLOYMENT_SELECT_SEP)
  if (sep === -1) {
    if (value !== 'unemployed' && value !== 'temporary') return null
    return { employmentStatus: value, pensionFund: '' }
  }
  const status = value.slice(0, sep) as EmploymentStatus
  const fund = value.slice(sep + EMPLOYMENT_SELECT_SEP.length)
  if (!employmentStatusNeedsPensionFund(status)) return null
  if (!PENSION_FUND_OPTIONS.includes(fund)) return null
  return { employmentStatus: status, pensionFund: fund }
}

export function employmentSelectLabel(status: EmploymentStatus, pensionFund: string): string {
  const statusLabel = EMPLOYMENT_STATUS_LABELS[status]
  if (!employmentStatusNeedsPensionFund(status) || !pensionFund.trim()) return statusLabel
  return `${statusLabel} · ${pensionFund.trim()}`
}

export type EmploymentSelectOption = { value: string; label: string }

/** Items plats pour la racine `Select` (résolution SelectValue). */
export function buildEmploymentSelectItems(): EmploymentSelectOption[] {
  const items: EmploymentSelectOption[] = []
  for (const status of EMPLOYMENT_STATUS_ORDER) {
    if (!employmentStatusNeedsPensionFund(status)) {
      items.push({ value: status, label: EMPLOYMENT_STATUS_LABELS[status] })
      continue
    }
    for (const fund of PENSION_FUND_OPTIONS) {
      items.push({
        value: encodeEmploymentSelectValue(status, fund)!,
        label: employmentSelectLabel(status, fund)
      })
    }
  }
  return items
}
