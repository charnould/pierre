import { Minus, MoveDownRight, MoveUpRight } from 'lucide-react'
import { memo } from 'react'

import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'
import {
  InspectorSnapshotCard,
  InspectorSnapshotFact as SnapshotFact
} from '@/shared/components/inspector/inspector-snapshot-card'
import { Badge } from '@/shared/components/ui/badge'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

import { type DebtEpisodeTrend } from '../lib/build-tenant-balance-series'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import {
  formatContactValue,
  hasContactValue,
  resolveContactStatusBadge
} from '../lib/contact-status'
import { formatDebtRentRatioMonthsOneDecimal, formatEuro } from '../lib/format-repayment'
import { isRepaymentActionId, type RepaymentActionId } from '../lib/repayment-action'
import type { RepaymentGestionnaireAssignment } from '../lib/repayment-advancement'
import { resolveBucketForTenantRow, type RepaymentBucketId } from '../lib/repayment-bucket'
import { InspectorFactText } from './InspectorFactLine'
import { RepaymentActionBadge } from './RepaymentActionBadge'
import { RepaymentBucketBadge } from './RepaymentBucketBadge'
import { RepaymentTagBadge } from './RepaymentTagBadge'

const TREND_ARIA: Record<DebtEpisodeTrend, string> = {
  up: 'Dette en hausse',
  down: 'Dette en baisse',
  flat: 'Dette stable'
}

const CHIP = 'h-4 max-w-full px-1.5 py-0'

interface Props {
  tenant: TenantRepaymentRow
  debtTrend?: DebtEpisodeTrend
  bucket?: RepaymentBucketId | null
  lastAction?: RepaymentActionId | null
  tags?: readonly string[]
  gestionnaire: RepaymentGestionnaireAssignment
  columnValues?: ColumnValuesConfig
  className?: string
}

function debtLineParts(
  solde: number,
  ratio: number | null | undefined
): { amount: string; rentEquiv: string | null } {
  const amount = formatEuro(solde)
  if (ratio == null || ratio <= 0) return { amount, rentEquiv: null }
  return { amount, rentEquiv: formatDebtRentRatioMonthsOneDecimal(ratio) }
}

function GestionnaireFact({ assignment }: { assignment: RepaymentGestionnaireAssignment }) {
  const login = assignment.login?.trim() ?? ''
  const email = assignment.email?.trim() ?? ''
  const identity = login || email

  if (!identity) return <InspectorFactText>Non affecté</InspectorFactText>

  return <CollaboratorChip identity={identity} title={email || undefined} compact />
}

function ContactValue({
  kind,
  value,
  status
}: {
  kind: 'email' | 'telephone'
  value: unknown
  status: unknown
}) {
  const badge = resolveContactStatusBadge(value, status, kind)
  const display = formatContactValue(value)
  const present = hasContactValue(value)

  return (
    <>
      <InspectorFactText title={present ? display : undefined}>{display}</InspectorFactText>
      {badge ? (
        <Badge variant={badge.variant} className={cn('shrink-0', CHIP)}>
          {badge.label}
        </Badge>
      ) : null}
    </>
  )
}

function DebtTrendIcon({ trend }: { trend: DebtEpisodeTrend }) {
  const Icon = trend === 'up' ? MoveUpRight : trend === 'down' ? MoveDownRight : Minus
  return (
    <span
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-md',
        trend === 'up' && 'bg-pierre-debt-up/10 text-pierre-debt-up',
        trend === 'down' && 'bg-pierre-debt-down/10 text-pierre-debt-down',
        trend === 'flat' && 'bg-muted text-muted-foreground'
      )}
      aria-label={TREND_ARIA[trend]}
    >
      <Icon aria-hidden className="size-3.5" />
    </span>
  )
}

export const TenantSnapshotCard = memo(function TenantSnapshotCard({
  tenant,
  debtTrend = 'flat',
  bucket = null,
  lastAction = null,
  tags = [],
  gestionnaire,
  columnValues,
  className
}: Props) {
  const trend = debtTrend

  const debt = debtLineParts(tenant.solde_locataire, tenant.ratio_dette_loyer)
  const displayBucket =
    bucket ??
    resolveBucketForTenantRow(tenant, typeof tenant.bucket === 'string' ? tenant.bucket : undefined)
  const displayAction =
    lastAction ??
    (typeof tenant.derniere_action_realisee === 'string' &&
    isRepaymentActionId(tenant.derniere_action_realisee)
      ? tenant.derniere_action_realisee
      : null)

  const debtLabel = debt.rentEquiv ? `${debt.amount} · ${debt.rentEquiv} de loyer` : debt.amount

  return (
    <InspectorSnapshotCard className={className}>
      <SnapshotFact label="Dette">
        <InspectorFactText className="tabular-nums" title={debtLabel}>
          {debtLabel}
        </InspectorFactText>
        <DebtTrendIcon trend={trend} />
      </SnapshotFact>

      <SnapshotFact label="Courriel">
        <ContactValue kind="email" value={tenant.email_client} status={tenant.email_status} />
      </SnapshotFact>

      <SnapshotFact label="Téléphone">
        <ContactValue
          kind="telephone"
          value={tenant.telephone_client}
          status={tenant.telephone_status}
        />
      </SnapshotFact>

      <SnapshotFact label="Référent">
        <GestionnaireFact assignment={gestionnaire} />
      </SnapshotFact>

      <SnapshotFact label="Groupe">
        <RepaymentBucketBadge bucket={displayBucket} columnValues={columnValues} className={CHIP} />
      </SnapshotFact>

      {displayAction ? (
        <SnapshotFact label="Dernière tâche">
          <RepaymentActionBadge
            action={displayAction}
            columnValues={columnValues}
            className={CHIP}
          />
        </SnapshotFact>
      ) : null}

      {tags.length > 0 ? (
        <SnapshotFact label="Tags">
          {tags.map((tag) => (
            <RepaymentTagBadge key={tag} tag={tag} className={CHIP} />
          ))}
        </SnapshotFact>
      ) : null}
    </InspectorSnapshotCard>
  )
})
