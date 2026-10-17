import { dailyAmount } from './money'
import type { AmountLine, RepaymentPlanForm } from './types'
import { TOTAL_RENT_PRESET } from './types'

/** 0,3 avant 14 ans, 0,5 ensuite. 0 si l’enfant n’est pas encore né. Date vide : 0,3. */
function childUnits(birthDate: string, reference: Date): number {
  if (!birthDate) return 0.3
  const birth = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return 0.3
  const ref = new Date(reference)
  ref.setHours(12, 0, 0, 0)
  if (birth.getTime() > ref.getTime()) return 0
  let age = ref.getFullYear() - birth.getFullYear()
  const monthDiff = ref.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) age -= 1
  return age < 14 ? 0.3 : 0.5
}

/**
 * INSEE definition:
 * 1 CU for the first adult, 0.5 CU for other persons 14+,
 * 0.3 CU for children under 14.
 */
export function computeConsumptionUnits(
  household: RepaymentPlanForm['household'],
  reference = new Date()
): number {
  const adults = household.adults
  const children = household.children

  if (adults.length === 0 && children.length === 0) return 1

  let units = 0
  adults.forEach((_adult, index) => {
    units += index === 0 ? 1 : 0.5
  })

  for (const child of children) units += childUnits(child.birthDate, reference)

  return units
}

export interface InstallmentBudget {
  recurringIncome: number
  punctualIncome: number
  recurringExpenses: number
  punctualExpenses: number
  disposableIncome: number
  simplifiedDisposableIncome: number
  dailyRemainder: number
  simplifiedDailyRemainder: number
  effortRate: number | null
  simplifiedEffortRate: number | null
  consumptionUnits: number
}

/** Reste ramené à l’UC. Sans UC, le montant est conservé. */
export function amountPerUnit(amount: number, units: number): number {
  return units > 0 ? amount / units : amount
}

function countsInMonth(line: AmountLine, month: string, punctual: boolean): boolean {
  if (punctual) return line.month === month
  if (line.month) return false
  if (!line.endMonth) return true
  return month <= line.endMonth.slice(0, 7)
}

function sumForMonth(lines: AmountLine[], month: string, punctual: boolean): number {
  return lines.reduce(
    (sum, line) => (countsInMonth(line, month, punctual) ? sum + line.amount : sum),
    0
  )
}

/** Budget d’une échéance. `date` est `YYYY-MM-DD` ; seul `YYYY-MM` rattache les ponctuelles. */
export function computeInstallmentBudget(
  form: RepaymentPlanForm,
  installmentDate: string,
  payment: number
): InstallmentBudget {
  const month = installmentDate.slice(0, 7)
  const recurringIncome = sumForMonth(form.income, month, false)
  const punctualIncome = sumForMonth(form.income, month, true)
  const recurringExpenses = sumForMonth(form.expenses, month, false)
  const punctualExpenses = sumForMonth(form.expenses, month, true)
  const totalIncome = recurringIncome + punctualIncome
  const totalExpenses = recurringExpenses + punctualExpenses
  const housingCost = form.expenses
    .filter((line) => line.month === '' && line.label === TOTAL_RENT_PRESET)
    .reduce((sum, line) => sum + line.amount, 0)
  const reference = new Date(`${installmentDate.slice(0, 10)}T12:00:00`)
  const charges = totalExpenses + payment
  const housing = housingCost + payment
  const consumptionUnits = computeConsumptionUnits(
    form.household,
    Number.isNaN(reference.getTime()) ? new Date() : reference
  )
  const disposableIncome = totalIncome - charges
  const simplifiedDisposableIncome = totalIncome - housing

  return {
    recurringIncome,
    punctualIncome,
    recurringExpenses,
    punctualExpenses,
    disposableIncome,
    simplifiedDisposableIncome,
    dailyRemainder: dailyAmount(amountPerUnit(disposableIncome, consumptionUnits)),
    simplifiedDailyRemainder: dailyAmount(
      amountPerUnit(simplifiedDisposableIncome, consumptionUnits)
    ),
    effortRate: totalIncome > 0 ? charges / totalIncome : null,
    simplifiedEffortRate: totalIncome > 0 ? housing / totalIncome : null,
    consumptionUnits
  }
}
