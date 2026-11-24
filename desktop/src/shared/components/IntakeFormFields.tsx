import {
  INTAKE_LONG_TEXT_MAX,
  INTAKE_MAX_FILE_BYTES,
  INTAKE_MIME_LABELS,
  INTAKE_SHORT_TEXT_MAX,
  type IntakeField,
  intakeFieldColumnName,
  type IntakeInputField
} from '@pierre/shared/intakes'
import { type ComponentProps, Fragment, type ReactNode } from 'react'

import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/shared/components/ui/combobox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Textarea } from '@/shared/components/ui/textarea'
import { formatAttachmentBytes } from '@/shared/lib/attachment-files'

export type IntakeFormLayout = 'rows' | 'stacked'

export type IntakeSectionGroup = {
  title?: string
  description?: string
  fields: Array<{ field: IntakeInputField; index: number }>
}

type SimpleInputType = 'short_text' | 'number' | 'date' | 'datetime' | 'email' | 'phone'

const SIMPLE_INPUT_PROPS: Record<SimpleInputType, Partial<ComponentProps<typeof Input>>> = {
  short_text: { type: 'text', maxLength: INTAKE_SHORT_TEXT_MAX },
  number: { type: 'number', step: 'any' },
  date: { type: 'date' },
  datetime: { type: 'datetime-local' },
  email: { type: 'email', autoComplete: 'email', placeholder: 'nom@exemple.fr' },
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '06 12 34 56 78' }
}

export function groupIntakeFieldsBySection(fields: readonly IntakeField[]): IntakeSectionGroup[] {
  const groups: IntakeSectionGroup[] = []
  let current: IntakeSectionGroup | null = null

  fields.forEach((field, index) => {
    if (field.type === 'section') {
      current = {
        title: field.label,
        description: field.description,
        fields: []
      }
      groups.push(current)
      return
    }
    if (!current) {
      current = { fields: [] }
      groups.push(current)
    }
    current.fields.push({ field, index })
  })

  return groups
}

function formatFileHint(field: Extract<IntakeInputField, { type: 'file' }>): string {
  const formats = field.accept.map((mime) => INTAKE_MIME_LABELS[mime]).join(', ')
  const maxFiles = field.maxFiles ?? 1
  const maxSize = formatAttachmentBytes(
    Math.min(field.maxFileBytes ?? INTAKE_MAX_FILE_BYTES, INTAKE_MAX_FILE_BYTES)
  )
  const countLabel = maxFiles > 1 ? `jusqu’à ${maxFiles} fichiers` : '1 fichier'
  return `${formats} · ${countLabel} · ${maxSize} max par fichier`
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  )
}

export function IntakeNoticeCard({ notice }: { notice: string }) {
  return (
    <FieldDescription className="[font-size:12px] leading-4 whitespace-pre-wrap">
      {notice}
    </FieldDescription>
  )
}

export function IntakePasswordCard({
  layout = 'rows',
  disabled = false,
  error,
  onClearError
}: {
  layout?: IntakeFormLayout
  disabled?: boolean
  error?: string
  onClearError?: () => void
}) {
  const stacked = layout === 'stacked'
  const fieldId = disabled ? 'intake-preview-password' : 'intake-password'
  const invalid = Boolean(error)

  return (
    <Field
      orientation={stacked ? 'vertical' : 'horizontal'}
      data-field-key="_password"
      data-invalid={invalid || undefined}
    >
      <FieldContent>
        <FieldLabel htmlFor={fieldId}>
          Mot de passe
          <RequiredMark />
        </FieldLabel>
      </FieldContent>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Input
          id={fieldId}
          name={disabled ? undefined : '_password'}
          type="password"
          autoComplete="off"
          disabled={disabled}
          required={!disabled}
          aria-invalid={invalid || undefined}
          onChange={disabled ? undefined : onClearError}
        />
        <FieldError>{error}</FieldError>
      </div>
    </Field>
  )
}

function renderControl({
  field,
  fieldId,
  col,
  disabled,
  invalid,
  onClear
}: {
  field: Exclude<IntakeInputField, { type: 'checkbox' }>
  fieldId: string
  col: string
  disabled: boolean
  invalid: boolean
  onClear?: () => void
}): ReactNode {
  const name = disabled ? undefined : col
  const required = !disabled && Boolean(field.required)
  const ariaInvalid = invalid || undefined
  const baseControlProps = {
    id: fieldId,
    name,
    disabled,
    required,
    'aria-invalid': ariaInvalid
  }

  if (field.type === 'long_text') {
    return (
      <Textarea
        {...baseControlProps}
        rows={4}
        maxLength={INTAKE_LONG_TEXT_MAX}
        onChange={onClear}
      />
    )
  }

  if (field.type === 'file') {
    return (
      <div className="flex flex-col gap-1.5">
        <Input
          {...baseControlProps}
          type="file"
          accept={field.accept.join(',')}
          multiple={(field.maxFiles ?? 1) > 1}
          onChange={onClear}
        />
        <FieldDescription>{formatFileHint(field)}</FieldDescription>
      </div>
    )
  }

  if (field.type === 'single_choice') {
    const cleanOptions = [...new Set(field.options.map((option) => option.trim()).filter(Boolean))]
    if (field.display === 'radio') {
      return (
        <RadioGroup name={name} disabled={disabled} required={required} onValueChange={onClear}>
          {cleanOptions.map((option, optIdx) => (
            <div key={`${option}-${optIdx}`} className="flex items-center gap-2">
              <RadioGroupItem
                id={`${fieldId}-${optIdx}`}
                value={option}
                disabled={disabled}
                aria-invalid={ariaInvalid}
              />
              <FieldLabel htmlFor={`${fieldId}-${optIdx}`}>{option}</FieldLabel>
            </div>
          ))}
        </RadioGroup>
      )
    }
    return (
      <Combobox
        items={cleanOptions}
        autoHighlight
        name={name}
        disabled={disabled}
        required={required}
        onValueChange={onClear}
      >
        <ComboboxInput
          id={fieldId}
          className="w-full"
          placeholder="Rechercher ou sélectionner…"
          showClear
          disabled={disabled}
          aria-invalid={ariaInvalid}
        />
        <ComboboxContent>
          <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option} value={option}>
                {option}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  }

  if (field.type === 'multiple_choice') {
    const cleanOptions = field.options.map((option) => option.trim()).filter(Boolean)
    return (
      <div className="flex flex-col gap-2">
        {cleanOptions.map((option, optIdx) => (
          <div key={`${option}-${optIdx}`} className="flex items-center gap-2">
            <Checkbox
              id={`${fieldId}-${optIdx}`}
              name={name}
              value={option}
              disabled={disabled}
              aria-invalid={ariaInvalid}
              onCheckedChange={onClear}
            />
            <FieldLabel htmlFor={`${fieldId}-${optIdx}`}>{option}</FieldLabel>
          </div>
        ))}
      </div>
    )
  }

  return <Input {...baseControlProps} {...SIMPLE_INPUT_PROPS[field.type]} onChange={onClear} />
}

function IntakeFieldRow({
  field,
  index,
  layout,
  disabled,
  error,
  onClearError
}: {
  field: IntakeInputField
  index: number
  layout: IntakeFormLayout
  disabled: boolean
  error?: string
  onClearError?: (key: string) => void
}) {
  const col = intakeFieldColumnName(field.label)
  const fieldId = `${disabled ? 'intake-preview' : 'field'}-${index}-${col || index}`
  const invalid = Boolean(error)
  const stacked = layout === 'stacked'
  const labelText =
    field.label || (field.type === 'checkbox' ? 'Case à cocher' : 'Champ sans libellé')
  const onClear = disabled ? undefined : () => onClearError?.(col)

  if (field.type === 'checkbox') {
    return (
      <Field orientation="horizontal" data-field-key={col} data-invalid={invalid || undefined}>
        <Checkbox
          id={fieldId}
          name={disabled ? undefined : col}
          value="1"
          disabled={disabled}
          required={!disabled && Boolean(field.required)}
          aria-invalid={invalid || undefined}
          onCheckedChange={onClear}
        />
        <FieldContent>
          <FieldLabel htmlFor={fieldId}>
            {labelText}
            {field.required ? <RequiredMark /> : null}
          </FieldLabel>
          {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
          <FieldError>{error}</FieldError>
        </FieldContent>
      </Field>
    )
  }

  const multiline =
    field.type === 'long_text' ||
    field.type === 'multiple_choice' ||
    field.type === 'file' ||
    (field.type === 'single_choice' && field.display === 'radio')

  const singleControl =
    field.type !== 'multiple_choice' &&
    !(field.type === 'single_choice' && field.display === 'radio')

  return (
    <Field
      orientation={stacked ? 'vertical' : 'horizontal'}
      data-field-key={col}
      data-invalid={invalid || undefined}
      className={!stacked && multiline ? 'md:items-start' : undefined}
    >
      <FieldContent>
        <FieldLabel htmlFor={singleControl ? fieldId : undefined}>
          {labelText}
          {field.required ? <RequiredMark /> : null}
        </FieldLabel>
        {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
      </FieldContent>
      <div className="flex min-w-0 flex-col gap-1.5">
        {renderControl({ field, fieldId, col, disabled, invalid, onClear })}
        <FieldError>{error}</FieldError>
      </div>
    </Field>
  )
}

export function IntakeSectionCards({
  sections,
  layout = 'rows',
  disabled = false,
  fieldErrors,
  onClearError
}: {
  sections: readonly IntakeSectionGroup[]
  layout?: IntakeFormLayout
  disabled?: boolean
  fieldErrors?: Readonly<Record<string, string>>
  onClearError?: (key: string) => void
}) {
  const stacked = layout === 'stacked'

  return (
    <>
      {sections.map((section, sectionIdx) => {
        const fields =
          section.fields.length > 0 ? (
            <FieldGroup variant={stacked ? undefined : 'rows'}>
              {section.fields.map(({ field, index }) => {
                const col = intakeFieldColumnName(field.label)
                return (
                  <IntakeFieldRow
                    key={`${index}-${col}`}
                    field={field}
                    index={index}
                    layout={layout}
                    disabled={disabled}
                    error={fieldErrors?.[col]}
                    onClearError={onClearError}
                  />
                )
              })}
            </FieldGroup>
          ) : null

        if (!section.title && !section.description) {
          return <Fragment key={sectionIdx}>{fields}</Fragment>
        }

        return (
          <FieldSet key={sectionIdx}>
            {section.title ? <FieldLegend>{section.title}</FieldLegend> : null}
            {section.description ? (
              <FieldDescription>{section.description}</FieldDescription>
            ) : null}
            {fields}
          </FieldSet>
        )
      })}
    </>
  )
}
