import { parseLedgerDate } from './ledger-date'

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
})

export function formatEuro(amount: number): string {
  return EUR.format(amount)
}

export function formatSignedEuro(amount: number): string {
  const formatted = formatEuro(Math.abs(amount))
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

/** Date calendaire ISO (YYYY-MM-DD) — tri et filtres colonne. */
export function formatRepaymentDateIso(date: string): string {
  const parsed = parseLedgerDate(date)
  if (!parsed) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatPeriodeLabel(periode: string): string {
  const [year, month] = periode.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

/** Arrondit au demi-mois le plus proche (entier ou ,5). */
export function quantizeDebtRentRatioMonths(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0
  return Math.round(ratio * 2) / 2
}

export function formatDebtRentRatioMonths(ratio: number): string {
  const months = quantizeDebtRentRatioMonths(ratio)
  const label =
    months % 1 === 0
      ? months.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
      : months.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return `∼ ${label} mois`
}

/** Libellé fiche dossier : « 4,6 mois » — une décimale, sans quantification au demi-mois. */
export function formatDebtRentRatioMonthsOneDecimal(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—'
  const months = Math.round(ratio * 10) / 10
  const label = months.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${label} mois`
}

export function formatDaysSinceLastAction(days: number): string {
  if (!Number.isFinite(days) || days < 0) return '—'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return '1 jour'
  return `${days} jours`
}
