import { useId, useState } from 'react'

import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  HOME_EXCERPT_RANGE,
  type HomeExcerptCounts,
  type HomeSettings
} from '@/shared/lib/ui-settings/schema'

const ROWS: { key: keyof HomeExcerptCounts; label: string }[] = [
  { key: 'notifications', label: 'Mes notifications' },
  { key: 'mine', label: 'Mes tâches' },
  { key: 'delegated', label: 'Tâches que j’ai assignées' },
  { key: 'activities', label: 'Activités' }
]

function parseExcerptDraft(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  if (parsed < HOME_EXCERPT_RANGE.min || parsed > HOME_EXCERPT_RANGE.max) return undefined
  return parsed
}

interface Props {
  value: HomeExcerptCounts
  disabled?: boolean
  onPersist: (home: HomeSettings) => Promise<void>
}

export function HomeExcerptField({ value, disabled = false, onPersist }: Props) {
  const headingId = useId()
  const [editing, setEditing] = useState<{ key: keyof HomeExcerptCounts; text: string } | null>(
    null
  )

  return (
    <Field variant="document-setting" aria-labelledby={headingId}>
      <div className="flex flex-col gap-0.5">
        <FieldLabel id={headingId}>Accueil</FieldLabel>
        <FieldDescription>
          Nombre d’éléments sur chaque colonne. Tout voir ouvre le tiroir paginé.
        </FieldDescription>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {ROWS.map((row) => {
          const id = `${headingId}-${row.key}`
          return (
            <Field key={row.key}>
              <FieldLabel htmlFor={id}>{row.label}</FieldLabel>
              <Input
                id={id}
                type="number"
                numeric
                min={HOME_EXCERPT_RANGE.min}
                max={HOME_EXCERPT_RANGE.max}
                step={1}
                value={editing?.key === row.key ? editing.text : String(value[row.key])}
                disabled={disabled}
                onFocus={() => {
                  setEditing({ key: row.key, text: String(value[row.key]) })
                }}
                onChange={(event) => {
                  const text = event.target.value
                  setEditing({ key: row.key, text })
                  const parsed = parseExcerptDraft(text)
                  if (parsed === undefined || parsed === value[row.key]) return
                  void onPersist({ ...value, [row.key]: parsed })
                }}
                onBlur={() => {
                  setEditing(null)
                }}
              />
            </Field>
          )
        })}
      </div>
    </Field>
  )
}
