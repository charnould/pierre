import { ArrowDown, ArrowUp, Copy, Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { DraftIntakeField } from '@/features/intakes/lib/intake-ui'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  INTAKE_ALLOWED_MIMES,
  INTAKE_FIELD_TYPE_LABELS,
  INTAKE_FIELD_TYPES,
  INTAKE_MAX_FILE_BYTES,
  INTAKE_MAX_FILES_PER_FIELD,
  INTAKE_MIME_LABELS,
  type IntakeAllowedMime,
  type IntakeField,
  intakeFieldColumnName,
  type IntakeFieldType,
  isIntakeInputField
} from '@/shared/types/intakes'

const ONE_MIB = 1024 * 1024
const MAX_FILE_MB = Math.floor(INTAKE_MAX_FILE_BYTES / ONE_MIB)

export function IntakeFieldTypeSelect({
  id,
  value,
  disabled,
  className = 'w-full',
  ariaLabel,
  onValueChange
}: {
  id?: string
  value: IntakeFieldType
  disabled?: boolean
  className?: string
  ariaLabel?: string
  onValueChange: (next: IntakeFieldType) => void
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onValueChange(next as IntakeFieldType)
      }}
    >
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue>{INTAKE_FIELD_TYPE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {INTAKE_FIELD_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {INTAKE_FIELD_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ClampedNumberInput({
  id,
  value,
  min,
  max,
  disabled,
  onCommit
}: {
  id: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10)
    const clamped = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value
    setDraft(null)
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      disabled={disabled}
      value={draft ?? String(value)}
      onChange={(event) => {
        const raw = event.target.value
        setDraft(raw)
        const parsed = Number.parseInt(raw, 10)
        if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
          onCommit(parsed)
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        commit(event.currentTarget.value)
      }}
      onBlur={(event) => commit(event.target.value)}
    />
  )
}

export function IntakeFieldCard({
  entry,
  index,
  total,
  canDuplicate,
  disabled,
  onUpdate,
  onChangeType,
  onMove,
  onDuplicate,
  onRemove
}: {
  entry: DraftIntakeField
  index: number
  total: number
  canDuplicate: boolean
  disabled: boolean
  onUpdate: (next: IntakeField) => void
  onChangeType: (nextType: IntakeFieldType) => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const { field, key, locked: isLocked } = entry
  const colName = isIntakeInputField(field) ? intakeFieldColumnName(field.label) : ''

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            #{index + 1}
          </span>
          {isLocked ? (
            <Badge variant="outline">
              <Lock data-icon="inline-start" aria-hidden />
              Publié
            </Badge>
          ) : null}
          {colName ? (
            <code className="text-muted-foreground truncate text-xs">{colName}</code>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Monter le champ"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Descendre le champ"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dupliquer le champ"
            disabled={disabled || !canDuplicate}
            onClick={onDuplicate}
          >
            <Copy />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Retirer le champ"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`field-type-${key}`}>Type</FieldLabel>
          <IntakeFieldTypeSelect
            id={`field-type-${key}`}
            value={field.type}
            disabled={disabled || isLocked}
            onValueChange={onChangeType}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`field-label-${key}`}>Libellé</FieldLabel>
          <Input
            id={`field-label-${key}`}
            value={field.label}
            disabled={disabled || isLocked}
            placeholder={field.type === 'section' ? 'Titre de section' : 'Ex. Numéro de contrat'}
            onChange={(event) => onUpdate({ ...field, label: event.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field>
            <FieldLabel htmlFor={`field-desc-${key}`}>Texte d’aide (optionnel)</FieldLabel>
            <Input
              id={`field-desc-${key}`}
              value={field.description ?? ''}
              disabled={disabled}
              placeholder="Indication affichée sous le libellé"
              onChange={(event) => onUpdate({ ...field, description: event.target.value })}
            />
          </Field>
        </div>

        {isIntakeInputField(field) ? (
          <div className="pb-1.5">
            <Field orientation="horizontal">
              <Checkbox
                id={`field-req-${key}`}
                checked={Boolean(field.required)}
                disabled={disabled}
                onCheckedChange={(checked) => onUpdate({ ...field, required: checked === true })}
              />
              <FieldLabel htmlFor={`field-req-${key}`}>Obligatoire</FieldLabel>
            </Field>
          </div>
        ) : null}
      </div>

      {field.type === 'single_choice' ? (
        <Field>
          <FieldLabel htmlFor={`field-display-${key}`}>Affichage</FieldLabel>
          <Select
            value={field.display ?? 'select'}
            disabled={disabled}
            onValueChange={(value) => {
              if (value === 'select' || value === 'radio') {
                onUpdate({ ...field, display: value })
              }
            }}
          >
            <SelectTrigger id={`field-display-${key}`} className="w-56">
              <SelectValue>
                {field.display === 'radio' ? 'Boutons radio' : 'Liste déroulante'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select">Liste déroulante</SelectItem>
              <SelectItem value="radio">Boutons radio</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {field.type === 'single_choice' || field.type === 'multiple_choice' ? (
        <Field>
          <FieldLabel htmlFor={`field-options-${key}`}>
            Options{' '}
            <span className="text-muted-foreground font-normal tabular-nums">
              ({field.options.filter((option) => option.trim().length > 0).length})
            </span>
          </FieldLabel>
          <Textarea
            id={`field-options-${key}`}
            dictation={false}
            rows={4}
            disabled={disabled}
            placeholder={'Option 1\nOption 2'}
            className="max-h-60 overflow-y-auto"
            value={field.options.join('\n')}
            onChange={(event) =>
              onUpdate({
                ...field,
                options: event.target.value.split(/\r?\n/)
              })
            }
          />
          <FieldDescription>Une option par ligne. Les lignes vides sont ignorées.</FieldDescription>
        </Field>
      ) : null}

      {field.type === 'file' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Formats acceptés</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {INTAKE_ALLOWED_MIMES.map((mime) => {
                const checked = field.accept.includes(mime)
                return (
                  <Field key={mime} orientation="horizontal" className="w-fit">
                    <Checkbox
                      id={`field-mime-${key}-${mime}`}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(next) => {
                        const nextAccept: IntakeAllowedMime[] =
                          next === true
                            ? [...new Set([...field.accept, mime])]
                            : field.accept.filter((item) => item !== mime)
                        onUpdate({ ...field, accept: nextAccept })
                      }}
                    />
                    <FieldLabel htmlFor={`field-mime-${key}-${mime}`}>
                      {INTAKE_MIME_LABELS[mime]}
                    </FieldLabel>
                  </Field>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`field-maxfiles-${key}`}>Nombre max de fichiers</FieldLabel>
              <ClampedNumberInput
                id={`field-maxfiles-${key}`}
                min={1}
                max={INTAKE_MAX_FILES_PER_FIELD}
                disabled={disabled}
                value={field.maxFiles ?? 1}
                onCommit={(clamped) => onUpdate({ ...field, maxFiles: clamped })}
              />
              <FieldDescription>1 à {INTAKE_MAX_FILES_PER_FIELD}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`field-maxsize-${key}`}>Taille max par fichier (Mo)</FieldLabel>
              <ClampedNumberInput
                id={`field-maxsize-${key}`}
                min={1}
                max={MAX_FILE_MB}
                disabled={disabled}
                value={Math.round((field.maxFileBytes ?? INTAKE_MAX_FILE_BYTES) / ONE_MIB)}
                onCommit={(clamped) => onUpdate({ ...field, maxFileBytes: clamped * ONE_MIB })}
              />
              <FieldDescription>1 à {MAX_FILE_MB} Mo</FieldDescription>
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  )
}
