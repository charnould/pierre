import { cn } from '@/shared/lib/utils'
import type { LedgerMovementRow } from '@/shared/types/ledger'

import { movementCategoryLabel } from '../lib/build-repayment-timeline'
import { formatEuro, formatPeriodeLabel, formatSignedEuro } from '../lib/format-repayment'

interface Props {
  row: LedgerMovementRow
  soldeAfter: number
  soldeDelta: number | null
  className?: string
}

/** Running balance + category/period — date lives in the timeline header. */
export function RepaymentTimelineMovementRow({ row, soldeAfter, soldeDelta, className }: Props) {
  const rawMontant = row.montant_en_euros
  const montant =
    typeof rawMontant === 'number' ? rawMontant : rawMontant != null ? Number(rawMontant) : null
  const delta =
    soldeDelta != null
      ? soldeDelta
      : typeof montant === 'number' && Number.isFinite(montant)
        ? montant
        : null

  const category = movementCategoryLabel(typeof row.categorie === 'string' ? row.categorie : null)
  const moisConcerne =
    typeof row.mois_concerne === 'string' && row.mois_concerne.trim()
      ? row.mois_concerne.trim()
      : null
  const label = [category, moisConcerne ? formatPeriodeLabel(moisConcerne) : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs leading-4">
        <span className="text-muted-foreground">Solde locataire : </span>
        <span className="text-foreground font-medium tabular-nums">{formatEuro(soldeAfter)}</span>
        {delta != null ? (
          <span
            className={cn(
              'ms-1 font-medium tabular-nums',
              delta > 0 ? 'text-destructive' : 'text-secondary-foreground'
            )}
          >
            ({formatSignedEuro(delta)})
          </span>
        ) : null}
      </p>
      {label ? (
        <p className="text-muted-foreground mt-0.5 text-[0.6875rem] leading-4">{label}</p>
      ) : null}
    </div>
  )
}
