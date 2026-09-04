import { FileText, PenLine, PiggyBank } from 'lucide-react'

import { MentionText } from '@/shared/components/inspector/mention-text'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'

import { parseRepaymentPlanForm, parseRepaymentPlanProposal } from '../lib/repayment-activity-text'
import { InspectorFactLine, InspectorFactText } from './InspectorFactLine'

interface Props {
  row: Activite
  className?: string
  onEditPlan?: (row: Activite) => void
}

export function isRepaymentPlanProposalActivity(row: Activite): boolean {
  return row.type === 'repayment_plan'
}

export function RepaymentPlanProposalBody({ row, className, onEditPlan }: Props) {
  const plan = parseRepaymentPlanProposal(row)
  if (!plan) return null

  const canOpen = onEditPlan != null && parseRepaymentPlanForm(row) != null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="border-border bg-card flex flex-col gap-2 rounded-md border px-3 py-2">
        <InspectorFactLine icon={FileText} label="Statut">
          {plan.planValide ? (
            <Badge variant="default">Validé</Badge>
          ) : (
            <Badge variant="secondary">Brouillon</Badge>
          )}
        </InspectorFactLine>
        {plan.signed != null ? (
          <InspectorFactLine icon={PenLine} label="Signature">
            <Badge variant={plan.signed ? 'default' : 'secondary'}>
              {plan.signed ? 'Signé' : 'Non signé'}
            </Badge>
          </InspectorFactLine>
        ) : null}
        {plan.resume ? (
          <InspectorFactLine icon={PiggyBank} label="Mensualité">
            <InspectorFactText title={plan.resume}>{plan.resume}</InspectorFactText>
          </InspectorFactLine>
        ) : null}
        {canOpen ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="w-fit"
            onClick={() => onEditPlan?.(row)}
          >
            {plan.signed ? 'Voir' : 'Modifier'}
          </Button>
        ) : null}
      </div>
      {plan.note ? (
        <MentionText
          text={plan.note}
          mentionVariant="activity"
          className="text-foreground m-0 text-xs leading-4 break-words whitespace-pre-wrap"
        />
      ) : null}
    </div>
  )
}
