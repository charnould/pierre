import { Building2, Handshake, Home, User } from 'lucide-react'
import type { ComponentType } from 'react'
import { useId } from 'react'

import { isValidAboutSubject } from '@/features/about/lib/about-form'
import { ABOUT_SUBJECTS, type AboutSubject } from '@/features/tickets/lib/knowledge-skills'
import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const SUBJECT_OPTIONS: {
  value: AboutSubject
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}[] = [
  { value: 'locataire', label: 'Locataire', icon: User },
  { value: 'client', label: 'Client', icon: Handshake },
  { value: 'lot', label: 'Lot', icon: Home },
  { value: 'batiment', label: 'Bâtiment', icon: Building2 }
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
      <FieldLabel id={labelId}>Objet de la synthèse</FieldLabel>
      <FieldDescription id={descriptionId}>
        De quoi souhaitez-vous une synthèse&nbsp;?
      </FieldDescription>
      <RadioGroup
        value={value}
        aria-label="Objet de la synthèse"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onValueChange={(v) => {
          if (v != null && isValidAboutSubject(v)) {
            onValueChange(v)
          }
        }}
        className="grid-cols-2"
      >
        {SUBJECT_OPTIONS.map((opt) => {
          const id = `${baseId}-${opt.value}`
          const Icon = opt.icon
          return (
            <ChoiceTile
              key={opt.value}
              as="label"
              htmlFor={id}
              interactive
              selected={value === opt.value}
              icon={<Icon className="size-4" strokeWidth={1.5} />}
              title={opt.label}
              signal={<RadioGroupItem value={opt.value} id={id} />}
            />
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
