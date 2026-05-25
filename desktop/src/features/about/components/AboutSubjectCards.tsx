import { Building2, Home, User } from 'lucide-react'
import type { ComponentType } from 'react'
import { useId } from 'react'

import { isValidAboutSubject } from '@/features/about/lib/about-form'
import { ABOUT_SUBJECTS, type AboutSubject } from '@/features/tickets/lib/knowledge-skills'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
import { cn } from '@/shared/lib/utils'

const SUBJECT_OPTIONS: {
  value: AboutSubject
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}[] = [
  { value: 'locataire', label: 'Locataire', icon: User },
  { value: 'lot', label: 'Lot', icon: Home },
  { value: 'programme', label: 'Programme', icon: Building2 }
]

interface Props {
  value: AboutSubject
  onValueChange: (value: AboutSubject) => void
}

export function AboutSubjectCards({ value, onValueChange }: Props) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`

  return (
    <Field>
      <div className={FIELD_HEADING_GROUP}>
        <FieldLabel id={labelId} className={FIELD_HEADING}>
          Objet de la synthèse
        </FieldLabel>
        <FieldDescription id={descriptionId} className={FIELD_CAPTION}>
          De quoi souhaitez-vous une synthèse&nbsp;?
        </FieldDescription>
      </div>
      <RadioGroup
        value={value}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onValueChange={(v) => {
          if (v != null && isValidAboutSubject(v)) {
            onValueChange(v)
          }
        }}
        className="workflow-choice-radio-group"
      >
        {SUBJECT_OPTIONS.map((opt) => {
          const id = `${baseId}-${opt.value}`
          const isSelected = value === opt.value
          const Icon = opt.icon
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                'workflow-choice-row workflow-choice-row--label-only',
                isSelected && 'workflow-choice-row--selected'
              )}
            >
              <RadioGroupItem value={opt.value} id={id} className="workflow-choice-radio-sr" />
              <span className="workflow-choice-row__icon">
                <Icon strokeWidth={1.75} />
              </span>
              <span className="workflow-choice-row__label">{opt.label}</span>
            </label>
          )
        })}
      </RadioGroup>
    </Field>
  )
}

export const ABOUT_SUBJECT_CARD_OPTIONS = SUBJECT_OPTIONS

export function isAboutSubjectOption(value: string): value is AboutSubject {
  return ABOUT_SUBJECTS.includes(value as AboutSubject)
}
