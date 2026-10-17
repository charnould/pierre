import { MAX_SCHEDULE_MONTHS } from '../../../../../../shared/repayment-plan'
import type { RepaymentPlanForm, Installment } from './types'

function newInstallmentId(): string {
  return `inst-${Math.random().toString(36).slice(2, 8)}`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Adds `delta` months to a `YYYY-MM-DD`, keeping the day when the month has it. */
export function addMonths(date: string, delta: number): string {
  const [yearStr, monthStr, dayStr] = date.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const absolute = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(absolute / 12)
  const nextMonth = (absolute % 12) + 1
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth))
  return `${nextYear}-${pad2(nextMonth)}-${pad2(nextDay)}`
}

/** Formats `YYYY-MM-DD` as `DD/MM/YYYY`. */
export function formatInstallmentDate(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

/** Parses `DD/MM/YYYY` to `YYYY-MM-DD`, or `null`. */
export function parseInstallmentDate(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null
  return `${year}-${pad2(month)}-${pad2(Math.min(day, daysInMonth(year, month)))}`
}

/** Formats `YYYY-MM` as `MM/YYYY`. */
export function formatMonthDisplay(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  return match ? `${match[2]}/${match[1]}` : ''
}

/** Parses `MM/YYYY` to `YYYY-MM`, or `null`. */
export function parseMonthInput(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const month = Number(match[1])
  const year = Number(match[2])
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return null
  return `${year}-${pad2(month)}`
}

function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-01`
}

function nextMonthAfterIsoDate(iso: string): string | null {
  if (!iso) return null
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return addMonths(firstOfMonth(date), 1)
}

/**
 * First installment date (`YYYY-MM-DD`, day 01):
 * - moratorium with end date → month after moratorium end ;
 * - otherwise → month after today.
 */
export function firstInstallmentDate(
  form: Pick<RepaymentPlanForm, 'banqueDeFranceStatus' | 'moratoriumEndDate'>,
  today = new Date()
): string {
  if (form.banqueDeFranceStatus === 'moratorium' && form.moratoriumEndDate) {
    const after = nextMonthAfterIsoDate(form.moratoriumEndDate)
    if (after) return after
  }
  return addMonths(firstOfMonth(today), 1)
}

export function clampInstallmentCount(count: number): number {
  return Math.min(MAX_SCHEDULE_MONTHS, Math.max(1, Math.floor(count) || 1))
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
  firstDate: string
  existing?: Installment[]
}): Installment[] {
  const count = clampInstallmentCount(params.count)
  const debtCents = Math.max(0, Math.round(params.debt * 100))
  const parts = splitCents(debtCents, count)
  const existing = params.existing ?? []

  return parts.map((cents, index) => ({
    id: existing[index]?.id ?? newInstallmentId(),
    date: addMonths(params.firstDate, index),
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

/** Updates one date then cascades that day onto the following months. */
export function updateInstallmentDate(
  installments: Installment[],
  index: number,
  date: string
): Installment[] {
  if (installments.length === 0) return installments
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return installments
  const clampedIndex = Math.max(0, Math.min(index, installments.length - 1))

  return installments.map((item, i) => {
    if (i < clampedIndex) return item
    return {
      ...item,
      date: addMonths(date, i - clampedIndex)
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
    RepaymentPlanForm,
    'rentalDebt' | 'banqueDeFranceStatus' | 'moratoriumEndDate' | 'installments'
  >,
  today = new Date(),
  options?: { resetFirstMonth?: boolean }
): Installment[] {
  const firstDate =
    !options?.resetFirstMonth && form.installments[0]?.date
      ? form.installments[0].date
      : firstInstallmentDate(form, today)

  return buildInstallments({
    debt: form.rentalDebt,
    count: Math.max(form.installments.length, 1),
    firstDate,
    existing: form.installments
  })
}
