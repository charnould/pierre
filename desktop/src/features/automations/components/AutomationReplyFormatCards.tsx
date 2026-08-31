import { Mail, ScrollText } from 'lucide-react'
import { useId } from 'react'

import type { TicketReplyChannel } from '@/features/automations/lib/automation-types'
import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const FORMAT_OPTIONS: {
  value: TicketReplyChannel
  title: string
  description: string
  icon: typeof Mail
}[] = [
  {
    value: 'email',
    title: 'Réponse numérique (email)',
    description: 'Brouillon d’email à relire puis envoyer.',
    icon: Mail
  },
  {
    value: 'letter',
    title: 'Réponse postale (courrier)',
    description: 'Brouillon de courrier à relire puis imprimer.',
    icon: ScrollText
  }
]

interface Props {
  value: TicketReplyChannel
  onValueChange: (value: TicketReplyChannel) => void
}

export function AutomationReplyFormatCards({ value, onValueChange }: Props) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`

  return (
    <Field>
      <FieldLabel id={labelId}>Format de réponse</FieldLabel>
      <FieldDescription id={descriptionId}>
        Type de brouillon créé pour chaque réclamation éligible qui n’en a pas encore.
      </FieldDescription>
      <RadioGroup
        value={value}
        aria-label="Format de réponse"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onValueChange={(next) => {
          if (next === 'email' || next === 'letter') onValueChange(next)
        }}
      >
        {FORMAT_OPTIONS.map((opt) => {
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
