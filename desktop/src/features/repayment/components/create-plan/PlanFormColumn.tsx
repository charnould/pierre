import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { FieldSeparator } from '@/shared/components/ui/field'

import type { ApurementPlanFormData } from '../../lib/apurement-plan/types'
import {
  SectionAides,
  SectionBudget,
  SectionDispositif,
  SectionEcheancier,
  SectionFamille,
  SectionLogement,
  SectionSituationLocative
} from './PlanFormSections'

interface Props {
  form: ApurementPlanFormData
  onPatch: (patch: Partial<ApurementPlanFormData>) => void
  onClose: () => void
  footerAction: ReactNode
  readOnly?: boolean
}

export function PlanFormColumn({ form, onPatch, onClose, footerAction, readOnly = false }: Props) {
  return (
    <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center px-4 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft data-icon="inline-start" />
          Retour
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="sr-only">Formulaire du plan d’apurement</legend>
            <SectionDispositif form={form} onChange={onPatch} />
            <FieldSeparator />
            <SectionLogement form={form} onChange={onPatch} />
            <FieldSeparator />
            <SectionSituationLocative form={form} onChange={onPatch} />
            <FieldSeparator />
            <SectionFamille
              form={form}
              onHouseholdChange={(patch) => onPatch({ household: { ...form.household, ...patch } })}
              onIdsChange={(patch) => onPatch(patch)}
            />
            <FieldSeparator />
            <SectionBudget
              form={form}
              onIncomeChange={(income) => onPatch({ income })}
              onExpensesChange={(expenses) => onPatch({ expenses })}
            />
            <FieldSeparator />
            <SectionAides
              items={form.requestedAids}
              onChange={(requestedAids) => onPatch({ requestedAids })}
            />
            <FieldSeparator />
            <SectionEcheancier form={form} onChange={onPatch} />
          </fieldset>
          <FieldSeparator />
          {footerAction}
        </div>
      </div>
    </div>
  )
}
