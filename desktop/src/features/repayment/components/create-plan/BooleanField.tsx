import { useId } from 'react'

import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { Switch } from '@/shared/components/ui/switch'

interface Props {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}

export function BooleanField({ label, description, value, onChange }: Props) {
  const id = useId()

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </Field>
  )
}
