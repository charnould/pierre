import { useId, type ReactNode } from 'react'

import { AboutSubjectCards } from '@/features/about/components/AboutSubjectCards'
import {
  ABOUT_SUBJECT_ENTITY,
  ABOUT_YEAR_END,
  ABOUT_YEAR_START,
  aboutYearRangeFromSliderValues,
  aboutYearRangeToSliderValues
} from '@/features/about/lib/about-form'
import type { AboutSubject } from '@/features/tickets/lib/knowledge-skills'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Slider } from '@/shared/components/ui/slider'
import { Textarea } from '@/shared/components/ui/textarea'
import { formatNumericRangeLabel } from '@/shared/lib/range-slider'

interface Props {
  agentName: string
  aboutSubject: AboutSubject
  onAboutSubjectChange: (value: AboutSubject) => void
  entityId: string
  onEntityIdChange: (value: string) => void
  yearFrom: string
  onYearFromChange: (value: string) => void
  yearTo: string
  onYearToChange: (value: string) => void
  context: string
  onContextChange: (value: string) => void
  primaryAction: ReactNode
  errMsg: string | null
}

export function AboutContextColumn({
  agentName,
  aboutSubject,
  onAboutSubjectChange,
  entityId,
  onEntityIdChange,
  yearFrom,
  onYearFromChange,
  yearTo,
  onYearToChange,
  context,
  onContextChange,
  primaryAction,
  errMsg
}: Props) {
  const entityIdFieldId = useId()
  const contextFieldId = useId()
  const yearFieldId = useId()
  const { label: entityLabel, placeholder: entityPlaceholder } = ABOUT_SUBJECT_ENTITY[aboutSubject]
  const [rangeFrom, rangeTo] = aboutYearRangeToSliderValues(yearFrom, yearTo)

  return (
    <div className="bg-background flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <FieldGroup>
          <AboutSubjectCards value={aboutSubject} onValueChange={onAboutSubjectChange} />

          <Field>
            <FieldLabel htmlFor={entityIdFieldId}>{entityLabel}</FieldLabel>
            <FieldDescription>Identifiant interne</FieldDescription>
            <Input
              id={entityIdFieldId}
              aria-label={entityLabel}
              type="text"
              inputMode="numeric"
              value={entityId}
              onChange={(e) => onEntityIdChange(e.target.value)}
              placeholder={entityPlaceholder}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={yearFieldId}>Quelle période inclure&nbsp;?</FieldLabel>
            <FieldDescription>Bornes incluses</FieldDescription>
            <div className="flex flex-col gap-2">
              <Slider
                id={yearFieldId}
                min={ABOUT_YEAR_START}
                max={ABOUT_YEAR_END}
                step={1}
                value={[rangeFrom, rangeTo]}
                onValueChange={(values) => {
                  const sliderValues = Array.isArray(values) ? values : [values]
                  const next = aboutYearRangeFromSliderValues(sliderValues)
                  onYearFromChange(next.yearFrom)
                  onYearToChange(next.yearTo)
                }}
                aria-label="Période incluse dans la synthèse"
              />
              <div className="flex items-center justify-between">
                <span className="pierre-meta tabular-nums">{ABOUT_YEAR_START}</span>
                <span className="text-xs tabular-nums">
                  {formatNumericRangeLabel(rangeFrom, rangeTo)}
                </span>
                <span className="pierre-meta tabular-nums">{ABOUT_YEAR_END}</span>
              </div>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor={contextFieldId}>Contexte additionnel</FieldLabel>
            <FieldDescription>
              Optionnel · Précisions utiles pour permettre à {agentName} de générer une synthèse
              pertinente
            </FieldDescription>
            <Textarea
              id={contextFieldId}
              aria-label="Contexte additionnel"
              value={context}
              onChange={(e) => onContextChange(e.target.value)}
              className="resize-y"
            />
          </Field>

          {errMsg ? <FieldError className="shrink-0">{errMsg}</FieldError> : null}
        </FieldGroup>
      </div>

      <div className="shrink-0 border-t px-4 py-2">{primaryAction}</div>
    </div>
  )
}
