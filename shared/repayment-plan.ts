/** Longest schedule a user can enter. Confirmation thresholds stop before this. */
export const MAX_SCHEDULE_MONTHS = 36

const REPAYMENT_PLAN_EVENT_TYPES = [
  'repayment_plan.created',
  'repayment_plan.updated',
  'repayment_plan.finalized',
  'repayment_plan.closed'
] as const

export type RepaymentPlanEventType = (typeof REPAYMENT_PLAN_EVENT_TYPES)[number]

const CASE_KEYS = [
  'identification',
  'dette',
  'procedure',
  'accompagnement',
  'bail',
  'budget',
  'echeancier'
] as const

export type RepaymentPlanCase = Record<(typeof CASE_KEYS)[number] | 'foyer', unknown>

export const isRepaymentPlanEventType = (type: string): type is RepaymentPlanEventType =>
  (REPAYMENT_PLAN_EVENT_TYPES as readonly string[]).includes(type)

const as_record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

/** The stored plan is the dossier itself. Returns that object, or null. */
export const parseRepaymentPlanContent = (type: string, raw: string): RepaymentPlanCase | null => {
  if (!isRepaymentPlanEventType(type)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }
  const record = as_record(parsed)
  if (!record) return null
  for (const key of CASE_KEYS) {
    if (!as_record(record[key])) return null
  }
  const foyer = as_record(record['foyer'])
  if (!foyer || !Array.isArray(foyer['adultes']) || !Array.isArray(foyer['enfants'])) return null
  return record as RepaymentPlanCase
}
