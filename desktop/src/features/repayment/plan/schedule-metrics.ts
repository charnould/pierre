import type { CaseFile, Installment } from './document'

export type InstallmentFigures = {
  resources: number | null
  charges: number | null
  units: number | null
  teLn: number | null
  ravLn: number | null
  teG: number | null
  ravG: number | null
}

export function installmentFigures(
  foyer: CaseFile['foyer'],
  budget: CaseFile['budget'],
  installment: Installment
): InstallmentFigures {
  const on = installment.date_echeance
  const resources = sum([
    ...budget.ressources_mensuelles.map((row) => amount(row.montant_euros)),
    ...budget.ressources_ponctuelles
      .filter((row) => sameMonth(row.date_imputation, on))
      .map((row) => amount(row.montant_euros))
  ])
  const charges = sum([
    amount(budget.loyer_charges_moins_aides_au_logement_euros),
    ...budget.charges_mensuelles
      .filter((row) => creditActive(row.date_fin, on))
      .map((row) => amount(row.montant_euros)),
    ...budget.charges_ponctuelles
      .filter((row) => sameMonth(row.date_imputation, on))
      .map((row) => amount(row.montant_euros))
  ])
  const units = consumptionUnits(foyer, on)
  const rent = amount(budget.loyer_charges_moins_aides_au_logement_euros)
  const payment = amount(installment.mensualite_euros)
  const teLn =
    rent != null && payment != null && resources != null && resources > 0
      ? (rent + payment) / resources
      : null
  const ravLn =
    rent != null && payment != null && resources != null && units != null && units > 0
      ? (resources - rent - payment) / (units * 30)
      : null
  const teG =
    charges != null && payment != null && resources != null && resources > 0
      ? (charges + payment) / resources
      : null
  const ravG =
    resources != null && charges != null && payment != null && units != null && units > 0
      ? (resources - charges - payment) / (units * 30)
      : null
  return { resources, charges, units, teLn, ravLn, teG, ravG }
}

export function installmentAmounts(debt: number | null, count: number): (number | null)[] {
  if (count <= 0) return []
  if (debt == null || !Number.isFinite(debt) || debt < 0)
    return Array.from({ length: count }, () => null)
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
    return next.map((row, index) => ({
      ...row,
      date_echeance: dates[index] ?? null,
      mensualite_euros: amounts[index] ?? null
    }))
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
    (row, index) => row.mensualite_euros !== previous[index]?.mensualite_euros
  )
  if (amountEdited >= 0) return applyManualAmount(debt, next, amountEdited)
  return next.map((row) => ({ ...row }))
}

function applyManualAmount(
  debt: number | null,
  rows: readonly Installment[],
  index: number
): Installment[] {
  const typed = rows[index]?.mensualite_euros ?? null
  const tailStart = typed == null ? index : index + 1
  if (debt == null || !Number.isFinite(debt) || debt < 0) {
    return rows.map((row, rowIndex) =>
      rowIndex < tailStart ? row : { ...row, mensualite_euros: null }
    )
  }
  let remaining = Math.round(debt * 100)
  for (let rowIndex = 0; rowIndex < tailStart; rowIndex++) {
    const value = rows[rowIndex]?.mensualite_euros
    if (value != null && Number.isFinite(value)) remaining -= Math.round(value * 100)
  }
  const tailCount = rows.length - tailStart
  const tail =
    tailCount === 0 || remaining <= 0
      ? Array.from({ length: tailCount }, () => 0)
      : splitCents(remaining, tailCount).map((cents) => cents / 100)
  return rows.map((row, rowIndex) =>
    rowIndex < tailStart ? row : { ...row, mensualite_euros: tail[rowIndex - tailStart] ?? 0 }
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

export function loanNetAlert(
  teLn: number | null,
  ravLn: number | null,
  maxEffortRate: number,
  minDailyRemainder: number
): boolean {
  return teLn != null && ravLn != null && teLn * 100 > maxEffortRate && ravLn < minDailyRemainder
}

function amount(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function sum(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value != null)
  if (present.length === 0) return null
  return present.reduce((total, value) => total + value, 0)
}

function sameMonth(imputation: string | null, on: string | null): boolean {
  return imputation != null && on != null && imputation.slice(0, 7) === on.slice(0, 7)
}

function creditActive(end: string | null, on: string | null): boolean {
  if (end == null) return true
  return on != null && on.slice(0, 7) <= end.slice(0, 7)
}

function consumptionUnits(foyer: CaseFile['foyer'], on: string | null): number | null {
  if (on == null) return null
  const births = [
    ...foyer.adultes.map((person) => person.date_naissance),
    ...foyer.enfants.map((person) => person.date_naissance)
  ]
  let total = 0
  let counted = 0
  let firstAdult = true
  for (const birth of births) {
    if (birth == null || birth > on) continue
    const years = age(birth, on)
    counted += 1
    if (years >= 18 && firstAdult) {
      total += 1
      firstAdult = false
    } else if (years >= 14) {
      total += 0.5
    } else {
      total += 0.3
    }
  }
  return counted === 0 ? null : total
}

function age(birth: string, on: string): number {
  let years = Number(on.slice(0, 4)) - Number(birth.slice(0, 4))
  const month = on.slice(5, 7)
  const day = on.slice(8, 10)
  if (month < birth.slice(5, 7) || (month === birth.slice(5, 7) && day < birth.slice(8, 10))) {
    years -= 1
  }
  return years
}
