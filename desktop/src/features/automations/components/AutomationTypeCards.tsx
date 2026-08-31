import { FileText, MessageSquareReply } from 'lucide-react'
import { useId } from 'react'

import type { AutomationType } from '@/features/automations/lib/automation-types'
import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const TYPE_OPTIONS: {
  value: AutomationType
  title: string
  description: string
  icon: typeof FileText
}[] = [
  {
    value: 'report',
    title: "Rapport d'analyse",
    description:
      'Un rapport est un contenu généré par Pierre pour vous informer sur une problématique précise. Exemple : les points d’attention au moment de la prise d’astreinte.',
    icon: FileText
  },
  {
    value: 'ticket_reply',
    title: 'Pré-génération de réponses',
    description:
      'Pierre prépare des brouillons de réponse aux locataires selon vos critères. Les brouillons déjà présents ne sont pas régénérés.',
    icon: MessageSquareReply
  }
]

interface Props {
  value: AutomationType
  onValueChange: (value: AutomationType) => void
}

export function AutomationTypeCards({ value, onValueChange }: Props) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`

  return (
    <Field>
      <FieldLabel id={labelId}>Type d'automatisation</FieldLabel>
      <FieldDescription id={descriptionId}>
        Le type ne peut pas être modifié après création.
      </FieldDescription>
      <RadioGroup
        value={value}
        aria-label="Type d'automatisation"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onValueChange={(next) => {
          if (next === 'report' || next === 'ticket_reply') onValueChange(next)
        }}
      >
        {TYPE_OPTIONS.map((opt) => {
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
              title={opt.title}
              caption={opt.description}
              signal={<RadioGroupItem value={opt.value} id={id} />}
            />
          )
        })}
      </RadioGroup>
    </Field>
  )
}
