import { Info, Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { computeInstallmentBudget } from '../../lib/apurement-plan/calculations'
import {
  buildInstallments,
  firstInstallmentDate,
  updateInstallmentAmount,
  updateInstallmentDate
} from '../../lib/apurement-plan/installments'
import {
  formatAmountSplit,
  formatEffortRate,
  formatMoneyDisplay,
  formatUnits
} from '../../lib/apurement-plan/money'
import type { RepaymentPlanForm } from '../../lib/apurement-plan/types'
import { repaymentCreatePlanConfig } from '../../lib/repayment-create-plan-config'
import { InstallmentDateInput } from './InstallmentDateInput'
import { MoneyInput } from './MoneyInput'

interface Props {
  form: RepaymentPlanForm
  onChange: (patch: Partial<RepaymentPlanForm>) => void
}

const HEAD =
  'text-muted-foreground pierre-type-table-header border-border border-b px-2 py-1 text-start font-medium align-bottom'
const CELL = 'px-2 py-1 align-top'

function ColumnHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger
          render={<Button type="button" variant="ghost" size="icon-xs" aria-label={hint} />}
        >
          <Info />
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </span>
  )
}

function Figure({ value, alert }: { value: string; alert: boolean }) {
  return <span className={alert ? 'bg-destructive/10 rounded-md px-1' : undefined}>{value}</span>
}

function AmountSplit({ recurring, punctual }: { recurring: number; punctual: number }) {
  const split = formatAmountSplit(recurring, punctual)
  return (
    <span className="whitespace-nowrap">
      <span className="text-sm font-medium">{split.total}</span>{' '}
      <span className="text-muted-foreground">{split.detail}</span>
    </span>
  )
}

export function InstallmentSchedule({ form, onChange }: Props) {
  const count = form.installments.length
  const canRemove = count > 1
  const { maxEffortRate, minDailyRemainder } = repaymentCreatePlanConfig().schedule
  const alert = (rate: number | null, daily: number) =>
    rate != null && rate * 100 > maxEffortRate && daily < minDailyRemainder
  const firstDate = form.installments[0]?.date ?? firstInstallmentDate(form)

  return (
    <div className="overflow-x-auto">
      <table className="pierre-type-data w-max min-w-full border-collapse font-sans tabular-nums">
        <thead>
          <tr>
            <th className={HEAD} rowSpan={2} scope="col">
              <ColumnHint
                label="Échéance"
                hint="Date à laquelle la mensualité de remboursement est exigée."
              />
            </th>
            <th className={HEAD} rowSpan={2} scope="col">
              <ColumnHint
                label="Mensualité"
                hint="Montant remboursé ce mois-ci, en complément du loyer."
              />
            </th>
            <th className={HEAD} rowSpan={2} scope="col">
              <ColumnHint
                label="Ressources"
                hint="Total du mois. Entre parenthèses : le mensuel, puis le ponctuel."
              />
            </th>
            <th className={HEAD} rowSpan={2} scope="col">
              <ColumnHint
                label="Charges"
                hint="Total du mois. Entre parenthèses : le mensuel, puis le ponctuel."
              />
            </th>
            <th className={HEAD} rowSpan={2} scope="col">
              <ColumnHint
                label="UC"
                hint="Unités de consommation INSEE à la date de l’échéance : 1 pour le premier adulte, 0,5 pour les autres personnes de 14 ans ou plus, 0,3 pour les enfants de moins de 14 ans. Un enfant pas encore né ne compte pas."
              />
            </th>
            <th className={HEAD} colSpan={2} scope="colgroup">
              <ColumnHint
                label="Complet"
                hint="Toutes les charges du mois plus la mensualité, rapportées à toutes les ressources."
              />
            </th>
            <th className={HEAD} colSpan={2} scope="colgroup">
              <ColumnHint
                label="Simplifié"
                hint="La ligne « Loyer + Charges - Aide au logement » plus la mensualité. L’aide au logement n’est pas retirée une seconde fois."
              />
            </th>
            <th className={HEAD} rowSpan={2} scope="col">
              <span className="sr-only">Retirer</span>
            </th>
          </tr>
          <tr>
            <th className={HEAD} scope="col">
              <ColumnHint
                label="Reste à vivre"
                hint="Journalier par UC : (ressources − toutes les charges − mensualité) / UC / 30."
              />
            </th>
            <th className={HEAD} scope="col">
              <ColumnHint
                label="Taux d’effort"
                hint="(Toutes les charges + mensualité) / toutes les ressources du mois."
              />
            </th>
            <th className={HEAD} scope="col">
              <ColumnHint
                label="Reste à vivre"
                hint="Journalier par UC : (ressources − loyer et charges nets d’aide − mensualité) / UC / 30."
              />
            </th>
            <th className={HEAD} scope="col">
              <ColumnHint
                label="Taux d’effort"
                hint="(Loyer et charges nets d’aide + mensualité) / toutes les ressources du mois."
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {form.installments.map((installment, index) => {
            const budget = computeInstallmentBudget(form, installment.date, installment.amount)
            const completAlert = alert(budget.effortRate, budget.dailyRemainder)
            const simplifieAlert = alert(
              budget.simplifiedEffortRate,
              budget.simplifiedDailyRemainder
            )
            return (
              <tr key={installment.id}>
                <td className={CELL}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-10 shrink-0 tabular-nums">
                      {index + 1}/{count}
                    </span>
                    <InstallmentDateInput
                      aria-label={`Échéance ${index + 1}`}
                      className="w-36"
                      value={installment.date}
                      onChange={(date) =>
                        onChange({
                          installments: updateInstallmentDate(form.installments, index, date)
                        })
                      }
                    />
                  </div>
                </td>
                <td className={CELL}>
                  <MoneyInput
                    aria-label={`Montant ${index + 1}`}
                    className="w-32"
                    value={installment.amount}
                    onChange={(amount) =>
                      onChange({
                        installments: updateInstallmentAmount(
                          form.installments,
                          index,
                          amount,
                          form.rentalDebt
                        )
                      })
                    }
                  />
                </td>
                <td className={CELL}>
                  <AmountSplit
                    recurring={budget.recurringIncome}
                    punctual={budget.punctualIncome}
                  />
                </td>
                <td className={CELL}>
                  <AmountSplit
                    recurring={budget.recurringExpenses}
                    punctual={budget.punctualExpenses}
                  />
                </td>
                <td className={CELL}>{formatUnits(budget.consumptionUnits)}</td>
                <td className={`${CELL} whitespace-nowrap`}>
                  <Figure value={formatMoneyDisplay(budget.dailyRemainder)} alert={completAlert} />
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  <Figure value={formatEffortRate(budget.effortRate)} alert={completAlert} />
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  <Figure
                    value={formatMoneyDisplay(budget.simplifiedDailyRemainder)}
                    alert={simplifieAlert}
                  />
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  <Figure
                    value={formatEffortRate(budget.simplifiedEffortRate)}
                    alert={simplifieAlert}
                  />
                </td>
                <td className={CELL}>
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer l’échéance ${index + 1}`}
                      onClick={() => {
                        const remaining = form.installments.filter((_, i) => i !== index)
                        onChange({
                          installments: buildInstallments({
                            debt: form.rentalDebt,
                            count: remaining.length,
                            firstDate: remaining[0]?.date ?? firstDate,
                            existing: remaining
                          })
                        })
                      }}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
