import { actionTimelineDate } from '@/shared/lib/activities/action-activity'
import { is_boost_notification, type Activite } from '@/shared/types/activites'
import type { LedgerMovementRow } from '@/shared/types/ledger'

import {
  computeDebtEpisodeMetrics,
  resolveTenantDebtEpisode,
  type TenantBalancePoint
} from './build-tenant-balance-series'
import { roundToCents } from './euro-amount'
import { formatSignedEuro } from './format-repayment'
import { compareLedgerDatesAsc, compareLedgerDatesDesc, parseLedgerDate } from './ledger-date'

function movementMontant(row: LedgerMovementRow): number | null {
  const raw = row.montant_en_euros
  if (raw == null) return null
  const amount = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(amount) ? amount : null
}

export type MovementBalanceSnapshot = {
  soldeAfter: number
  /** Variation vs le mouvement chronologiquement précédent ; `null` pour le premier. */
  soldeDelta: number | null
}

type MovementRecord = {
  row: LedgerMovementRow
  id: string
  sortId: string
  inputIndex: number
}

function movementRecords(movements: LedgerMovementRow[]): MovementRecord[] {
  const baseIds = movements.map(movementId)
  const counts = new Map<string, number>()
  for (const id of baseIds) counts.set(id, (counts.get(id) ?? 0) + 1)

  const occurrences = new Map<string, number>()
  const used = new Set<string>()
  return movements.map((row, inputIndex) => {
    const sortId = baseIds[inputIndex]!
    const occurrence = (occurrences.get(sortId) ?? 0) + 1
    occurrences.set(sortId, occurrence)

    let id = counts.get(sortId) === 1 ? sortId : `${sortId}:occurrence:${occurrence}`
    while (used.has(id)) id += ':collision'
    used.add(id)

    return { row, id, sortId, inputIndex }
  })
}

function computeMovementBalanceResult(records: MovementRecord[]): {
  balances: Map<string, MovementBalanceSnapshot>
  finalBalance: number
} {
  const sorted = [...records].sort((a, b) => {
    const dateCmp = compareLedgerDatesAsc(movementDate(a.row), movementDate(b.row))
    if (dateCmp !== 0) return dateCmp
    const idCmp = a.sortId.localeCompare(b.sortId)
    return idCmp !== 0 ? idCmp : a.inputIndex - b.inputIndex
  })

  const balances = new Map<string, MovementBalanceSnapshot>()
  let running = 0

  for (const [index, record] of sorted.entries()) {
    const amount = movementMontant(record.row) ?? 0
    running = roundToCents(running + amount)
    balances.set(record.id, {
      soldeAfter: running,
      soldeDelta: index === 0 ? null : amount
    })
  }

  return { balances, finalBalance: running }
}

export function computeMovementBalances(
  movements: LedgerMovementRow[]
): Map<string, MovementBalanceSnapshot> {
  return computeMovementBalanceResult(movementRecords(movements)).balances
}

/** Final running balance after the chronologically last movement (0 if empty). */
export function finalMovementBalance(movements: LedgerMovementRow[]): number {
  return computeMovementBalanceResult(movementRecords(movements)).finalBalance
}

export type RepaymentTimelineItem =
  | {
      source: 'movement'
      id: string
      date: string
      row: LedgerMovementRow
      soldeAfter: number
      soldeDelta: number | null
    }
  | { source: 'activity'; id: string; date: string; row: Activite }

const CATEGORY_LABELS: Record<string, string> = {
  loyer_principal: 'Loyer principal',
  charges: 'Charges',
  regularisation_charges: 'Régularisation de charges',
  apurement: 'Échéance plan d’apurement',
  frais: 'Frais',
  travaux: 'Travaux récupérables',
  materiel: 'Matériel',
  caf_apl: 'CAF / aides',
  encaissement_locataire: 'Encaissement locataire',
  remboursement_locataire: 'Remboursement locataire',
  rejet_paiement: 'Rejet de paiement',
  annulation: 'Annulation',
  solde_initial: 'Solde initial'
}

export function movementCategoryLabel(categorie: string | null | undefined): string {
  if (!categorie?.trim()) return 'Mouvement financier'
  const normalized = categorie.trim().toLowerCase()
  return CATEGORY_LABELS[normalized] ?? categorie.replaceAll('_', ' ')
}

function movementDate(row: LedgerMovementRow): string {
  const raw = row.date_exigibilite
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (raw != null && raw !== '') return String(raw).trim()
  return ''
}

function movementId(row: LedgerMovementRow): string {
  return `movement:${movementDate(row)}:${String(row.montant_en_euros ?? '')}`
}

/** `YYYY-MM` period key for a ledger movement date, or null if unparseable. */
function movementPeriodKey(row: LedgerMovementRow): string | null {
  const date = parseLedgerDate(movementDate(row))
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Inclusive: movement month >= `firstUnpaidPeriod` (`YYYY-MM`). */
export function movementOnOrAfterPeriod(
  row: LedgerMovementRow,
  firstUnpaidPeriod: string
): boolean {
  const period = movementPeriodKey(row)
  if (!period) return false
  return period >= firstUnpaidPeriod
}

export function mapLedgerMovementToEntry(row: LedgerMovementRow): {
  source: 'movement'
  id: string
  date: string
  row: LedgerMovementRow
} {
  return {
    source: 'movement',
    id: movementId(row),
    date: movementDate(row),
    row
  }
}

export function mapNotificationToEntry(
  row: Activite
): Extract<RepaymentTimelineItem, { source: 'activity' }> {
  return {
    source: 'activity',
    id: `activity:${row.id}`,
    date: actionTimelineDate(row),
    row
  }
}

export function movementAmountLabel(row: LedgerMovementRow): string | null {
  const amount = movementMontant(row)
  if (amount == null) return null
  return formatSignedEuro(amount)
}

export type BuildRepaymentTimelineOptions = {
  /** Current tenant balance; defaults to final running balance of `movements`. */
  currentBalance?: number
  /** Precomputed debt episode; computed from `movements` when omitted. */
  episode?: TenantBalancePoint[] | null
}

/**
 * Builds the repayment drawer timeline.
 * Balances are computed on the full movement history; display starts at the
 * current debt episode's `firstUnpaidPeriod` (movements only). Activities are
 * always retained because they are the complete business history.
 */
export function buildRepaymentTimeline(
  movements: LedgerMovementRow[],
  notifications: Activite[],
  options?: BuildRepaymentTimelineOptions
): RepaymentTimelineItem[] {
  const records = movementRecords(movements)
  const { balances: balanceById, finalBalance } = computeMovementBalanceResult(records)
  const currentBalance = options?.currentBalance ?? finalBalance

  const episode =
    options?.episode !== undefined
      ? options.episode
      : resolveTenantDebtEpisode(movements, currentBalance)
  const metrics = computeDebtEpisodeMetrics(episode)
  const visibleMovements = metrics?.firstUnpaidPeriod
    ? records.filter((record) => movementOnOrAfterPeriod(record.row, metrics.firstUnpaidPeriod))
    : []

  const entries = [
    ...visibleMovements.map((record) => {
      const base = mapLedgerMovementToEntry(record.row)
      const balance = balanceById.get(record.id)
      return {
        entry: {
          ...base,
          id: record.id,
          soldeAfter: balance?.soldeAfter ?? 0,
          soldeDelta: balance?.soldeDelta ?? null
        } satisfies RepaymentTimelineItem,
        sortId: record.sortId,
        inputIndex: record.inputIndex
      }
    }),
    ...notifications
      .filter((row) => {
        return !is_boost_notification(row.type)
      })
      .map((row, inputIndex) => {
        const entry = mapNotificationToEntry(row)
        return {
          entry,
          sortId: entry.id,
          inputIndex: movements.length + inputIndex
        }
      })
  ]

  return entries
    .sort((a, b) => {
      const dateCmp = compareLedgerDatesDesc(a.entry.date, b.entry.date)
      if (dateCmp !== 0) return dateCmp
      const idCmp = b.sortId.localeCompare(a.sortId)
      return idCmp !== 0 ? idCmp : a.inputIndex - b.inputIndex
    })
    .map(({ entry }) => entry)
}
