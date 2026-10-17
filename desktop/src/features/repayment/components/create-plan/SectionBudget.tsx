import { Plus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { FieldDescription, FieldLegend, FieldSet } from '@/shared/components/ui/field'

import { createAmountLine } from '../../lib/apurement-plan/defaults'
import { listHouseholdPeople } from '../../lib/apurement-plan/household'
import { firstInstallmentDate } from '../../lib/apurement-plan/installments'
import {
  EXPENSE_PRESETS,
  PUNCTUAL_INCOME_PRESETS,
  RECURRING_INCOME_GROUPS,
  TOTAL_RENT_PRESET,
  type AmountLine,
  type RepaymentPlanForm
} from '../../lib/apurement-plan/types'
import { AmountLineList } from './AmountLineList'
import { PlanSection } from './PlanSection'

function punctualMonth(form: RepaymentPlanForm): string {
  return (form.installments[0]?.date ?? firstInstallmentDate(form)).slice(0, 7)
}

function replaceRecurring(lines: AmountLine[], next: AmountLine[]): AmountLine[] {
  return [...next, ...lines.filter((line) => line.month)]
}

function replacePunctual(lines: AmountLine[], next: AmountLine[]): AmountLine[] {
  return [...lines.filter((line) => !line.month), ...next]
}

export function SectionBudget({
  form,
  onIncomeChange,
  onExpensesChange
}: {
  form: RepaymentPlanForm
  onIncomeChange: (income: AmountLine[]) => void
  onExpensesChange: (expenses: AmountLine[]) => void
}) {
  const people = listHouseholdPeople(form.household)
  const recurringIncome = form.income.filter((line) => !line.month)
  const punctualIncome = form.income.filter((line) => line.month)
  const recurringExpenses = form.expenses.filter((line) => !line.month)
  const punctualExpenses = form.expenses.filter((line) => line.month)

  return (
    <PlanSection
      title="Budget du foyer"
      description="Ressources et charges, mensuelles ou rattachées à un mois."
    >
      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Ressources mensuelles</FieldLegend>
            <FieldDescription>
              Revenus déclarés, assignables à chaque personne du foyer.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onIncomeChange([...form.income, createAmountLine()])}
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        {people.length === 0 ? (
          <FieldDescription>
            Renseignez d’abord le foyer pour assigner les ressources.
          </FieldDescription>
        ) : null}
        <AmountLineList
          items={recurringIncome}
          presets={RECURRING_INCOME_GROUPS}
          placeholderLabel="Type de ressource"
          customPlaceholder="Libellé de la ressource"
          people={people}
          onChange={(income) => onIncomeChange(replaceRecurring(form.income, income))}
        />
      </FieldSet>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Ressources ponctuelles</FieldLegend>
            <FieldDescription>Une somme qui s’applique à un seul mois.</FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onIncomeChange([...form.income, createAmountLine({ month: punctualMonth(form) })])
            }
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        {punctualIncome.length > 0 ? (
          <AmountLineList
            items={punctualIncome}
            presets={[{ label: 'Ressources ponctuelles', presets: PUNCTUAL_INCOME_PRESETS }]}
            placeholderLabel="Type de ressource"
            customPlaceholder="Libellé de la ressource"
            people={people}
            showMonth
            onChange={(income) => onIncomeChange(replacePunctual(form.income, income))}
          />
        ) : null}
      </FieldSet>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Charges mensuelles</FieldLegend>
            <FieldDescription>Dépenses qui reviennent chaque mois.</FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExpensesChange([...form.expenses, createAmountLine()])}
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        <AmountLineList
          items={recurringExpenses}
          presets={EXPENSE_PRESETS}
          lockedLabel={TOTAL_RENT_PRESET}
          placeholderLabel="Type de charge"
          customPlaceholder="Libellé de la charge"
          onChange={(expenses) => onExpensesChange(replaceRecurring(form.expenses, expenses))}
        />
      </FieldSet>

      <FieldSet>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <FieldLegend variant="label">Charges ponctuelles</FieldLegend>
            <FieldDescription>Une dépense qui s’applique à un seul mois.</FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onExpensesChange([...form.expenses, createAmountLine({ month: punctualMonth(form) })])
            }
          >
            <Plus data-icon="inline-start" />
            Ajouter
          </Button>
        </div>
        {punctualExpenses.length > 0 ? (
          <AmountLineList
            items={punctualExpenses}
            presets={EXPENSE_PRESETS}
            placeholderLabel="Type de charge"
            customPlaceholder="Libellé de la charge"
            showMonth
            onChange={(expenses) => onExpensesChange(replacePunctual(form.expenses, expenses))}
          />
        ) : null}
      </FieldSet>
    </PlanSection>
  )
}
