import { blankInstallment, type Installment } from '../../../../../shared/repayment-plan'

export function installmentAmounts(debt: number | null, count: number): (number | null)[] {
  if (count <= 0) return []
  if (debt == null || !Number.isFinite(debt) || debt <= 0) {
    return Array.from({ length: count }, () => null)
  }
  return splitCents(Math.round(debt * 100), count).map((cents) => cents / 100)
}

export function firstOfNextMonth(today: Date): string {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return isoDate(next.getFullYear(), next.getMonth() + 1, 1)
}

export function scheduleDates(start: string, count: number, day: number): string[] {
  const year = Number(start.slice(0, 4))
  const month = Number(start.slice(5, 7))
  return Array.from({ length: count }, (_, index) => {
    const absolute = year * 12 + (month - 1) + index
    return isoDate(Math.floor(absolute / 12), (absolute % 12) + 1, day)
  })
}

export function applyInstallmentEdit(
  debt: number | null,
  previous: readonly Installment[],
  next: readonly Installment[],
  today: Date
): Installment[] {
  if (next.length === 0) return []
  if (next.length !== previous.length) {
    const amounts = installmentAmounts(debt, next.length)
    const kept = previous.find((row) => row.date_echeance)?.date_echeance
    const dates = scheduleDates(
      firstOfNextMonth(today),
      next.length,
      kept ? Number(kept.slice(8, 10)) : 1
    )
    return next.map((_, index) => blankInstallment(dates[index] ?? null, amounts[index] ?? null))
  }
  const dateEdited = next.findIndex(
    (row, index) => row.date_echeance !== previous[index]?.date_echeance
  )
  if (dateEdited >= 0 && next[dateEdited]?.date_echeance) {
    const anchor =
      previous.find((row) => row.date_echeance)?.date_echeance ?? firstOfNextMonth(today)
    const dates = scheduleDates(
      anchor,
      next.length,
      Number(next[dateEdited].date_echeance.slice(8, 10))
    )
    return next.map((row, index) => ({ ...row, date_echeance: dates[index] ?? null }))
  }
  if (dateEdited >= 0) return previous.map((row) => ({ ...row }))
  const amountEdited = next.findIndex(
    (row, index) => row.montant_en_euros !== previous[index]?.montant_en_euros
  )
  if (amountEdited >= 0) return applyManualAmount(debt, next, amountEdited)
  return next.map((row) => ({ ...row }))
}

export function loanNetAlert(
  teLn: number | null,
  ravLn: number | null,
  maxEffortRate: number,
  minDailyRemainder: number
): boolean {
  return teLn != null && ravLn != null && teLn * 100 > maxEffortRate && ravLn < minDailyRemainder
}

function applyManualAmount(
  debt: number | null,
  rows: readonly Installment[],
  index: number
): Installment[] {
  const typed = rows[index]?.montant_en_euros ?? null
  const tailStart = typed == null ? index : index + 1
  if (debt == null || !Number.isFinite(debt) || debt <= 0) {
    return rows.map((row, rowIndex) =>
      rowIndex < tailStart ? row : { ...row, montant_en_euros: null }
    )
  }
  let remaining = Math.round(debt * 100)
  for (let rowIndex = 0; rowIndex < tailStart; rowIndex++) {
    const value = rows[rowIndex]?.montant_en_euros
    if (value != null && Number.isFinite(value)) remaining -= Math.round(value * 100)
  }
  const tailCount = rows.length - tailStart
  const tail =
    tailCount === 0 || remaining <= 0
      ? Array.from({ length: tailCount }, () => 0)
      : splitCents(remaining, tailCount).map((cents) => cents / 100)
  return rows.map((row, rowIndex) =>
    rowIndex < tailStart ? row : { ...row, montant_en_euros: tail[rowIndex - tailStart] ?? 0 }
  )
}

function splitCents(cents: number, count: number): number[] {
  const part = Math.floor(cents / count)
  const last = cents - part * (count - 1)
  return Array.from({ length: count }, (_, index) => (index === count - 1 ? last : part))
}

function isoDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate()
  const clamped = Math.min(Math.max(day, 1), last)
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}
