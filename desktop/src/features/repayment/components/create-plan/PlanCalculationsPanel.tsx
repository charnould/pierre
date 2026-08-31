import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { FieldGroup, FieldSeparator, FieldSet } from '@/shared/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { computeApurementPlanCalculations } from '../../lib/apurement-plan/calculations'
import { formatMoneyDisplay } from '../../lib/apurement-plan/money'
import type { ApurementPlanFormData } from '../../lib/apurement-plan/types'

interface Props {
  form: ApurementPlanFormData
}

function MetricRow({
  label,
  value,
  labelExtra
}: {
  label: ReactNode
  value: string
  labelExtra?: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground inline-flex items-center gap-1">
        {label}
        {labelExtra}
      </span>
      <span className="text-foreground text-[0.8125rem] leading-[1.125rem] font-medium tabular-nums">
        {value}
      </span>
    </div>
  )
}

const UC_INSEE_TOOLTIP =
  'Définition INSEE : 1 UC pour le premier adulte du ménage, 0,5 UC pour les autres personnes de 14 ans ou plus, 0,3 UC pour les enfants de moins de 14 ans.'

export function PlanCalculationsPanel({ form }: Props) {
  const calc = computeApurementPlanCalculations(form)

  return (
    <FieldSet>
      <FieldGroup>
        <div className="flex max-w-md flex-col gap-1.5">
          <MetricRow label="Dette totale" value={formatMoneyDisplay(calc.totalDebt)} />
          <MetricRow label="Total ressources" value={formatMoneyDisplay(calc.totalIncome)} />
          <MetricRow label="Total charges" value={formatMoneyDisplay(calc.totalExpenses)} />
          <MetricRow label="Reste à vivre" value={formatMoneyDisplay(calc.disposableIncome)} />
        </div>

        <FieldSeparator />

        <div className="flex max-w-md flex-col gap-1.5">
          <MetricRow
            label="Unité(s) de consommation (UC)"
            value={calc.consumptionUnits.toFixed(1)}
            labelExtra={
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground"
                      aria-label="Définition INSEE des unités de consommation"
                    />
                  }
                >
                  <CircleHelp className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-pretty">{UC_INSEE_TOOLTIP}</TooltipContent>
              </Tooltip>
            }
          />
          <MetricRow
            label="Reste à vivre par UC"
            value={formatMoneyDisplay(calc.disposableIncomePerCu)}
          />
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
