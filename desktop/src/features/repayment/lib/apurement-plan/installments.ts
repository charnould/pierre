import type { ApurementPlanFormData, Installment } from './types'
import { DEFAULT_PLAN_DURATION_MONTHS } from './types'

function newInstallmentId(): string {
  return `inst-${Math.random().toString(36).slice(2, 8)}`
}

/** Adds `delta` months to a `YYYY-MM`. */
export function addMonthsYearMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const absolute = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(absolute / 12)
  const nextMonth = (absolute % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

/** Formats `YYYY-MM` as `MM/YYYY`. */
export function formatYearMonthDisplay(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  if (!year || !month) return yearMonth
  return `${month}/${year}`
}

/** Parses `MM/YYYY` (tolerant) to `YYYY-MM`, or `null`. */
export function parseYearMonthInput(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d{1,2})\s*[/\-.\s]\s*(\d{4})$/)
  if (!match) return null
  const month = Number(match[1])
  const year = Number(match[2])
  if (!Number.isFinite(month) || !Number.isFinite(year)) return null
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return null
  return `${year}-${String(month).padStart(2, '0')}`
}

function yearMonthFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function nextMonthAfterIsoDate(iso: string): string | null {
  if (!iso) return null
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return addMonthsYearMonth(yearMonthFromDate(date), 1)
}

/**
 * First installment month (YYYY-MM):
 * - moratorium with end date → month after moratorium end ;
 * - otherwise → month after today.
 */
export function firstInstallmentYearMonth(
  form: Pick<ApurementPlanFormData, 'banqueDeFranceStatus' | 'moratoriumEndDate'>,
  today = new Date()
): string {
  if (form.banqueDeFranceStatus === 'moratorium' && form.moratoriumEndDate) {
    const after = nextMonthAfterIsoDate(form.moratoriumEndDate)
    if (after) return after
  }
  return addMonthsYearMonth(yearMonthFromDate(today), 1)
}

export function clampInstallmentCount(count: number): number {
  return Math.max(1, Math.floor(count) || 1)
}

function splitCents(totalCents: number, count: number): number[] {
  if (count <= 0) return []
  const safeCents = Math.max(0, totalCents)
  const baseCents = Math.floor(safeCents / count)
  const remainderCents = safeCents - baseCents * count
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? baseCents + remainderCents : baseCents
  )
}

/**
 * Splits `debt` across `count` installments. Reuses `existing` ids by index
 * so React inputs keep their local draft state across rebuilds.
 */
export function buildInstallments(params: {
  debt: number
  count: number
  firstYearMonth: string
  existing?: Installment[]
}): Installment[] {
  const count = clampInstallmentCount(params.count)
  const debtCents = Math.max(0, Math.round(params.debt * 100))
  const parts = splitCents(debtCents, count)
  const existing = params.existing ?? []

  return parts.map((cents, index) => ({
    id: existing[index]?.id ?? newInstallmentId(),
    yearMonth: addMonthsYearMonth(params.firstYearMonth, index),
    amount: cents / 100
  }))
}

/** Updates one amount then redistributes the remaining debt on later rows. */
export function updateInstallmentAmount(
  installments: Installment[],
  index: number,
  amount: number,
  debt: number
): Installment[] {
  if (installments.length === 0) return installments
  const clampedIndex = Math.max(0, Math.min(index, installments.length - 1))
  const nextAmount = Math.max(0, Math.round(amount * 100) / 100)

  const next = installments.map((item, i) =>
    i === clampedIndex ? { ...item, amount: nextAmount } : item
  )

  const tailStart = clampedIndex + 1
  if (tailStart >= next.length) return next

  const fixedCents = Math.round(
    next.slice(0, tailStart).reduce((sum, item) => sum + item.amount, 0) * 100
  )
  const remainingCents = Math.max(0, Math.round(debt * 100) - fixedCents)
  const tailParts = splitCents(remainingCents, next.length - tailStart)

  return next.map((item, i) => {
    if (i < tailStart) return item
    return { ...item, amount: tailParts[i - tailStart]! / 100 }
  })
}

/** Updates one month then cascades consecutive months after it. */
export function updateInstallmentYearMonth(
  installments: Installment[],
  index: number,
  yearMonth: string
): Installment[] {
  if (installments.length === 0) return installments
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return installments
  const clampedIndex = Math.max(0, Math.min(index, installments.length - 1))

  return installments.map((item, i) => {
    if (i < clampedIndex) return item
    return {
      ...item,
      yearMonth: addMonthsYearMonth(yearMonth, i - clampedIndex)
    }
  })
}

export function typicalMonthlyAmount(installments: Installment[]): number {
  if (installments.length === 0) return 0
  return installments[0].amount
}

export function sumInstallments(installments: Installment[]): number {
  return installments.reduce((sum, item) => sum + item.amount, 0)
}

/** Rebuilds installments keeping count and stable ids. */
export function rebuildInstallments(
  form: Pick<
    ApurementPlanFormData,
    'rentalDebt' | 'banqueDeFranceStatus' | 'moratoriumEndDate' | 'installments'
  >,
  today = new Date(),
  options?: { resetFirstMonth?: boolean }
): Installment[] {
  const firstYearMonth =
    !options?.resetFirstMonth && form.installments[0]?.yearMonth
      ? form.installments[0].yearMonth
      : firstInstallmentYearMonth(form, today)

  return buildInstallments({
    debt: form.rentalDebt,
    count: form.installments.length || DEFAULT_PLAN_DURATION_MONTHS,
    firstYearMonth,
    existing: form.installments
  })
}
