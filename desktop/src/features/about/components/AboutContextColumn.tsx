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
import { Card, CardBody, CardFooter } from '@/shared/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Slider } from '@/shared/components/ui/slider'
import { Textarea } from '@/shared/components/ui/textarea'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
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

function AboutField({
  id,
  label,
  description,
  className,
  children
}: {
  id?: string
  label: string
  description: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Field className={className}>
      <div className={FIELD_HEADING_GROUP}>
        <FieldLabel htmlFor={id} className={FIELD_HEADING}>
          {label}
        </FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>{description}</FieldDescription>
      </div>
      {children}
    </Field>
  )
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
    <div className="desk-form-panel">
      <Card variant="chrome">
        <CardBody inset="chrome" className="workflow-context-form desk-pane-scroll">
          <FieldGroup className="shrink-0">
            <AboutSubjectCards value={aboutSubject} onValueChange={onAboutSubjectChange} />

            <AboutField id={entityIdFieldId} label={entityLabel} description="Identifiant interne">
              <Input
                id={entityIdFieldId}
                type="text"
                inputMode="numeric"
                variant="desk"
                value={entityId}
                onChange={(e) => onEntityIdChange(e.target.value)}
                placeholder={entityPlaceholder}
              />
            </AboutField>

            <AboutField
              id={yearFieldId}
              label="Quelle période inclure&nbsp;?"
              description="Bornes incluses dans la synthèse."
            >
              <div className="desk-year-range">
                <div className="desk-year-range__value">
                  <span aria-live="polite" className={FIELD_HEADING}>
                    {formatNumericRangeLabel(rangeFrom, rangeTo)}
                  </span>
                </div>
                <Slider
                  id={yearFieldId}
                  min={ABOUT_YEAR_START}
                  max={ABOUT_YEAR_END}
                  step={1}
                  value={[rangeFrom, rangeTo]}
                  onValueChange={(values) => {
                    const next = aboutYearRangeFromSliderValues(values)
                    onYearFromChange(next.yearFrom)
                    onYearToChange(next.yearTo)
                  }}
                  aria-label="Période incluse dans la synthèse"
                />
                <div className="desk-year-range__bounds">
                  <span>{ABOUT_YEAR_START}</span>
                  <span>{ABOUT_YEAR_END}</span>
                </div>
              </div>
            </AboutField>
          </FieldGroup>

          <div className="workflow-context-fields">
            <AboutField
              id={contextFieldId}
              label="Contexte additionnel"
              description={`Optionnel · Précisions utiles pour permettre à ${agentName} de générer une synthèse pertinente`}
              className="workflow-context-field-grow"
            >
              <Textarea
                id={contextFieldId}
                variant="desk"
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                className="workflow-context-textarea-grow"
              />
            </AboutField>
          </div>

          {errMsg ? <p className="workflow-context-error">{errMsg}</p> : null}
        </CardBody>

        <CardFooter inset="chrome">{primaryAction}</CardFooter>
      </Card>
    </div>
  )
}
