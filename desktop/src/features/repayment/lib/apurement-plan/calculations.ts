import { sumInstallments } from './installments'
import type { AmountLine, ApurementPlanCalculations, ApurementPlanFormData } from './types'

function sumLines(items: AmountLine[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/** Age in full years at `reference` ; `null` if missing/invalid. */
function ageFromIso(iso: string, reference = new Date()): number | null {
  if (!iso) return null
  const birth = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  let age = reference.getFullYear() - birth.getFullYear()
  const monthDiff = reference.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age -= 1
  }
  return Math.max(0, age)
}

/**
 * INSEE definition:
 * 1 CU for the first adult, 0.5 CU for other persons 14+,
 * 0.3 CU for children under 14.
 */
export function computeConsumptionUnits(
  household: ApurementPlanFormData['household'],
  reference = new Date()
): number {
  const adults = household.adults
  const children = household.children

  if (adults.length === 0 && children.length === 0) return 1

  let units = 0
  adults.forEach((_adult, index) => {
    units += index === 0 ? 1 : 0.5
  })

  for (const child of children) {
    const age = ageFromIso(child.birthDate, reference)
    units += age == null || age < 14 ? 0.3 : 0.5
  }

  return units
}

export function computeApurementPlanCalculations(
  form: ApurementPlanFormData
): ApurementPlanCalculations {
  const totalDebt = form.rentalDebt
  const totalIncome = sumLines(form.income)
  const totalExpenses = sumLines(form.expenses)
  const disposableIncome = totalIncome - totalExpenses
  const consumptionUnits = computeConsumptionUnits(form.household)
  const disposableIncomePerCu =
    consumptionUnits > 0 ? disposableIncome / consumptionUnits : disposableIncome

  const planTotal = form.installments.length > 0 ? sumInstallments(form.installments) : null

  return {
    totalDebt,
    totalIncome,
    totalExpenses,
    disposableIncome,
    consumptionUnits,
    disposableIncomePerCu,
    planTotal
  }
}
