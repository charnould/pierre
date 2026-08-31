import type { LedgerMovementRow } from '@/shared/types/ledger'

import { isSettledBalance, roundToCents } from './euro-amount'

export type TenantBalancePoint = {
  period: string
  label: string
  balance: number
}

function movementMontant(row: LedgerMovementRow): number | null {
  const raw = row.montant_en_euros
  if (raw == null) return null
  const amount = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(amount) ? amount : null
}

function movementPeriod(row: LedgerMovementRow): string | null {
  const raw = row.date_exigibilite
  if (raw == null || raw === '') return null
  const text = typeof raw === 'string' ? raw.trim() : String(raw).trim()
  if (!text) return null

  const isoMonth = text.match(/^(\d{4})-(\d{2})/)
  if (isoMonth) return `${isoMonth[1]}-${isoMonth[2]}`

  const slashMonth = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMonth) {
    const month = slashMonth[2]!.padStart(2, '0')
    return `${slashMonth[3]}-${month}`
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  return null
}

export function formatTenantBalancePeriodLabel(period: string): string {
  const [yearText, monthText] = period.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return period
  }
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric'
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function previousCalendarMonth(period: string): string {
  const [yearText, monthText] = period.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function pointForPeriod(
  points: TenantBalancePoint[],
  period: string,
  balance: number
): TenantBalancePoint {
  const existing = points.find((point) => point.period === period)
  if (existing) return existing
  return {
    period,
    label: formatTenantBalancePeriodLabel(period),
    balance
  }
}

/** Découpe la série en épisodes de dette (mois préfixe + dette > 0 + 1er retour à 0). */
function buildDebtEpisodes(points: TenantBalancePoint[]): TenantBalancePoint[][] {
  const episodes: TenantBalancePoint[][] = []
  let index = 0

  while (index < points.length) {
    while (index < points.length && isSettledBalance(points[index]!.balance)) index += 1
    if (index >= points.length) break

    const episode: TenantBalancePoint[] = []
    const firstDebt = points[index]!
    const priorPeriod = previousCalendarMonth(firstDebt.period)
    episode.push(pointForPeriod(points, priorPeriod, 0))

    while (index < points.length) {
      const point = points[index]!
      episode.push(point)
      index += 1
      if (isSettledBalance(point.balance)) break
    }

    if (episode.length >= 2) {
      episodes.push(episode)
    }
  }

  return episodes
}

export type DebtEpisodeMetrics = {
  firstUnpaidPeriod: string
  firstUnpaidLabel: string
  ageMonths: number
}

function calendarMonthsInclusive(startPeriod: string, endPeriod: string): number {
  const [startYearText, startMonthText] = startPeriod.split('-')
  const [endYearText, endMonthText] = endPeriod.split('-')
  const startYear = Number(startYearText)
  const startMonth = Number(startMonthText)
  const endYear = Number(endYearText)
  const endMonth = Number(endMonthText)
  if (
    !Number.isFinite(startYear) ||
    !Number.isFinite(startMonth) ||
    !Number.isFinite(endYear) ||
    !Number.isFinite(endMonth)
  ) {
    return 0
  }
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
}

export type DebtEpisodeTrend = 'up' | 'down' | 'flat'

/** First vs last balance of the current episode. */
export function debtEpisodeTrend(
  episode: TenantBalancePoint[] | null | undefined
): DebtEpisodeTrend {
  if (!episode || episode.length < 2) return 'flat'
  const first = episode[0]!.balance
  const last = episode.at(-1)!.balance
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'flat'
}

export function computeDebtEpisodeMetrics(
  episode: TenantBalancePoint[] | null
): DebtEpisodeMetrics | null {
  if (!episode?.length) return null

  const firstUnpaid = episode.find((point) => !isSettledBalance(point.balance))
  const last = episode.at(-1)
  if (!firstUnpaid || !last) return null

  const ageMonths = calendarMonthsInclusive(firstUnpaid.period, last.period)
  if (ageMonths <= 0) return null

  return {
    firstUnpaidPeriod: firstUnpaid.period,
    firstUnpaidLabel: firstUnpaid.label,
    ageMonths
  }
}

export function resolveTenantDebtEpisode(
  movements: LedgerMovementRow[],
  currentBalance: number
): TenantBalancePoint[] | null {
  return selectDebtEpisode(buildTenantBalanceSeries(movements), currentBalance)
}

/** Épisode en cours si solde > 0, sinon dernier épisode terminé. */
export function selectDebtEpisode(
  points: TenantBalancePoint[] | null,
  currentBalance: number
): TenantBalancePoint[] | null {
  if (!points?.length) return null

  const episodes = buildDebtEpisodes(points)
  if (episodes.length === 0) return null

  if (!isSettledBalance(currentBalance)) {
    const openEpisodes = episodes.filter(
      (episode) => !isSettledBalance(episode.at(-1)?.balance ?? 0)
    )
    return openEpisodes.at(-1) ?? episodes.at(-1) ?? null
  }

  const completedEpisodes = episodes.filter((episode) =>
    isSettledBalance(episode.at(-1)?.balance ?? 0)
  )
  return completedEpisodes.at(-1) ?? null
}

/** Solde cumulé mensuel depuis le premier mouvement comptable. */
export function buildTenantBalanceSeries(
  movements: LedgerMovementRow[]
): TenantBalancePoint[] | null {
  const deltasByPeriod = new Map<string, number>()

  for (const row of movements) {
    const period = movementPeriod(row)
    const amount = movementMontant(row)
    if (!period || amount == null) continue
    deltasByPeriod.set(period, (deltasByPeriod.get(period) ?? 0) + amount)
  }

  if (deltasByPeriod.size === 0) return null

  const periods = [...deltasByPeriod.keys()].sort((a, b) => a.localeCompare(b))
  let running = 0

  return periods.map((period) => {
    running = roundToCents(running + (deltasByPeriod.get(period) ?? 0))
    return {
      period,
      label: formatTenantBalancePeriodLabel(period),
      balance: running
    }
  })
}
