import { BellOff, Layers, Sparkles } from 'lucide-react'
import { useId } from 'react'

import {
  SETTINGS_CAPTION,
  SETTINGS_FIELD_LABEL,
  SETTINGS_FIELD_STACK
} from '@/features/settings/settings-chrome'
import { SettingsFieldOptionTile } from '@/features/settings/SettingsFieldOptionTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { FIELD_OPTION_GRID_CLASS } from '@/shared/lib/field-option-classes'
import type { UpdatesNotifyScope } from '@/shared/types/settings'

const OPTIONS: {
  value: UpdatesNotifyScope
  label: string
  description: string
  icon: typeof BellOff
}[] = [
  {
    value: 'off',
    label: 'Aucune',
    description: 'Laissez-moi tranquille. Aucune notification.',
    icon: BellOff
  },
  {
    value: 'product',
    label: 'Nouveautés',
    description: 'Uniquement les mises à jour et évolutions applicatives.',
    icon: Sparkles
  },
  {
    value: 'all',
    label: 'Tout',
    description: 'Tous, y compris les articles techniques et informatiques.',
    icon: Layers
  }
]

interface Props {
  value: UpdatesNotifyScope
  onValueChange: (value: UpdatesNotifyScope) => void
  disabled?: boolean
}

export function UpdatesNotifyField({ value, onValueChange, disabled = false }: Props) {
  const baseId = useId()

  return (
    <Field className={SETTINGS_FIELD_STACK}>
      <FieldLabel className={SETTINGS_FIELD_LABEL}>Notifications de mises à jour</FieldLabel>
      <FieldDescription className={SETTINGS_CAPTION}>
        L'onglet « Mises à jour » vous signale les articles que vous n'avez pas encore lus.
        Choisissez quels types de contenu doivent déclencher ce rappel.
      </FieldDescription>

      <RadioGroup
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next === 'off' || next === 'product' || next === 'all') {
            onValueChange(next)
          }
        }}
        className={FIELD_OPTION_GRID_CLASS}
      >
        {OPTIONS.map((option) => {
          const id = `${baseId}-${option.value}`
          const isSelected = value === option.value
          const Icon = option.icon

          return (
            <SettingsFieldOptionTile
              key={option.value}
              as="label"
              htmlFor={id}
              interactive
              selected={isSelected}
              disabled={disabled}
              icon={<Icon strokeWidth={1.75} aria-hidden />}
              label={option.label}
              caption={option.description}
              signal={<RadioGroupItem id={id} value={option.value} />}
            />
          )
        })}
      </RadioGroup>
    </Field>
  )
}
