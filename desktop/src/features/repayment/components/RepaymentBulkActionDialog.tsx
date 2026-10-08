import { CaseBulkActionDialog } from '@/shared/components/board/case-bulk-action-dialog'

import type { RepaymentBulkProgress } from '../hooks/use-repayment-bulk-actions'
import { repaymentBucketOptions } from '../lib/repayment-bucket'
import type { RepaymentBulkAction } from '../lib/repayment-bulk-action'
import { repaymentTagOptions } from '../lib/repayment-tags'

export function RepaymentBulkActionDialog({
  open,
  count,
  progress,
  onClose,
  onStop,
  onSubmit
}: {
  open: boolean
  count: number
  progress: RepaymentBulkProgress | null
  onClose: () => void
  onStop: () => void
  onSubmit: (action: RepaymentBulkAction) => Promise<void>
}) {
  const countLabel = `${count} dossier${count > 1 ? 's' : ''}`
  return (
    <CaseBulkActionDialog
      open={open}
      countLabel={countLabel}
      description="L’action s’applique à chaque dossier sélectionné. Pierre n’envoie rien."
      phaseChoiceLabel="Changer la phase"
      phaseFieldLabel="Phase"
      phasePlaceholder="Choisir une phase"
      phases={repaymentBucketOptions()}
      tags={repaymentTagOptions()}
      progress={progress}
      progressLabel={(current) => `Dossier ${current.index} sur ${current.total}`}
      pierreHint="Un résultat distinct est enregistré dans chaque dossier."
      onClose={onClose}
      onStop={onStop}
      onSubmit={onSubmit}
    />
  )
}
