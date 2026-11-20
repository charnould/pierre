import { Plus } from 'lucide-react'
import { useState } from 'react'

import {
  IntakeFieldCard,
  IntakeFieldTypeSelect
} from '@/features/intakes/components/IntakeFieldCard'
import {
  createDefaultField,
  createDraftIntakeField,
  type DraftIntakeField,
  duplicateDraftIntakeField
} from '@/features/intakes/lib/intake-ui'
import { Button } from '@/shared/components/ui/button'
import { FieldDescription } from '@/shared/components/ui/field'
import {
  INTAKE_MAX_FIELDS,
  type IntakeField,
  type IntakeFieldType,
  isIntakeInputField
} from '@/shared/types/intakes'

interface Props {
  entries: DraftIntakeField[]
  onChange: (entries: DraftIntakeField[]) => void
  isPublished: boolean
  disabled?: boolean
}

export function IntakeFieldEditor({ entries, onChange, isPublished, disabled = false }: Props) {
  const [newFieldType, setNewFieldType] = useState<IntakeFieldType>('short_text')

  function updateField(index: number, next: IntakeField) {
    const current = entries[index]
    if (!current) return
    const copy = [...entries]
    copy[index] = { ...current, field: next }
    onChange(copy)
  }

  function changeFieldType(index: number, nextType: IntakeFieldType) {
    const entry = entries[index]
    if (!entry || entry.locked || entry.field.type === nextType) return
    const current = entry.field
    const fresh = createDefaultField(nextType)
    fresh.label = current.label
    fresh.description = current.description
    if (isIntakeInputField(fresh) && isIntakeInputField(current)) {
      fresh.required = current.required
    }
    if (
      (fresh.type === 'single_choice' || fresh.type === 'multiple_choice') &&
      (current.type === 'single_choice' || current.type === 'multiple_choice')
    ) {
      fresh.options = [...current.options]
    }
    updateField(index, fresh)
  }

  function moveField(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= entries.length) return
    const copy = [...entries]
    const [item] = copy.splice(index, 1)
    if (!item) return
    copy.splice(target, 0, item)
    onChange(copy)
  }

  function duplicateField(index: number) {
    if (entries.length >= INTAKE_MAX_FIELDS) return
    const current = entries[index]
    if (!current) return
    const copy = [...entries]
    copy.splice(index + 1, 0, duplicateDraftIntakeField(current))
    onChange(copy)
  }

  function removeField(index: number) {
    onChange(entries.filter((_, i) => i !== index))
  }

  function addField() {
    if (entries.length >= INTAKE_MAX_FIELDS) return
    onChange([...entries, createDraftIntakeField(newFieldType)])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            Champs du formulaire{' '}
            <span className="text-muted-foreground font-normal tabular-nums">
              ({entries.length}/{INTAKE_MAX_FIELDS})
            </span>
          </p>
          {isPublished ? (
            <FieldDescription>
              Sur une collecte publiée, le libellé et le type des champs existants sont figés. Vous
              pouvez réordonner, retirer un champ ou en ajouter de nouveaux.
            </FieldDescription>
          ) : null}
        </div>
      </div>

      {entries.length === 0 ? (
        <FieldDescription>Aucun champ. Ajoutez au moins un champ ci-dessous.</FieldDescription>
      ) : (
        <div className="divide-border/60 border-border/60 flex flex-col divide-y border-t border-b">
          {entries.map((entry, index) => (
            <IntakeFieldCard
              key={entry.key}
              entry={entry}
              index={index}
              total={entries.length}
              canDuplicate={entries.length < INTAKE_MAX_FIELDS}
              disabled={disabled}
              onUpdate={(next) => updateField(index, next)}
              onChangeType={(nextType) => changeFieldType(index, nextType)}
              onMove={(delta) => moveField(index, delta)}
              onDuplicate={() => duplicateField(index)}
              onRemove={() => removeField(index)}
            />
          ))}
        </div>
      )}

      {!disabled ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <IntakeFieldTypeSelect
            value={newFieldType}
            className="w-56"
            ariaLabel="Type du champ à ajouter"
            onValueChange={setNewFieldType}
          />
          <Button
            type="button"
            variant="outline"
            disabled={entries.length >= INTAKE_MAX_FIELDS}
            onClick={addField}
          >
            <Plus data-icon="inline-start" />
            Ajouter un champ
          </Button>
        </div>
      ) : null}
    </div>
  )
}
