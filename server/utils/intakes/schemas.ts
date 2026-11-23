import { z } from 'zod'

import {
  INTAKE_ALLOWED_MIMES,
  INTAKE_FIELD_TYPES,
  INTAKE_MAX_FIELDS,
  INTAKE_MAX_FILE_BYTES,
  INTAKE_MAX_FILES_PER_FIELD,
  type IntakeConfig,
  type IntakeField,
  intakeFieldColumnName,
  type IntakeInputField,
  isIntakeInputField,
  isReservedIntakeColumn
} from '../../../shared/intakes'
import { IntakeNotificationScheduleSchema } from '../schedule'

const NonEmptyTrimmed = z.string().trim().min(1)

const UniqueOptionsSchema = z
  .array(NonEmptyTrimmed)
  .min(1, 'Au moins une option est requise')
  .refine((options) => new Set(options).size === options.length, {
    message: 'Les options doivent être uniques'
  })

const SectionFieldSchema = z
  .object({
    type: z.literal('section'),
    label: NonEmptyTrimmed,
    description: z.string().trim().optional()
  })
  .strict()

const SimpleInputFieldSchema = z
  .object({
    type: z.enum([
      'short_text',
      'long_text',
      'number',
      'date',
      'datetime',
      'email',
      'phone',
      'checkbox'
    ]),
    label: NonEmptyTrimmed,
    description: z.string().trim().optional(),
    required: z.boolean().optional()
  })
  .strict()

const SingleChoiceFieldSchema = z
  .object({
    type: z.literal('single_choice'),
    label: NonEmptyTrimmed,
    description: z.string().trim().optional(),
    required: z.boolean().optional(),
    display: z.enum(['select', 'radio']).optional().default('select'),
    options: UniqueOptionsSchema
  })
  .strict()

const MultipleChoiceFieldSchema = z
  .object({
    type: z.literal('multiple_choice'),
    label: NonEmptyTrimmed,
    description: z.string().trim().optional(),
    required: z.boolean().optional(),
    options: UniqueOptionsSchema
  })
  .strict()

const FileFieldSchema = z
  .object({
    type: z.literal('file'),
    label: NonEmptyTrimmed,
    description: z.string().trim().optional(),
    required: z.boolean().optional(),
    accept: z
      .array(z.enum(INTAKE_ALLOWED_MIMES))
      .min(1, 'Au moins un type de fichier accepté est requis')
      .refine((mimes) => new Set(mimes).size === mimes.length, {
        message: 'Les types de fichiers acceptés doivent être uniques'
      }),
    maxFiles: z.number().int().min(1).max(INTAKE_MAX_FILES_PER_FIELD).optional().default(1),
    maxFileBytes: z
      .number()
      .int()
      .min(1)
      .max(INTAKE_MAX_FILE_BYTES)
      .optional()
      .default(INTAKE_MAX_FILE_BYTES)
  })
  .strict()

export const IntakeFieldSchema = z.discriminatedUnion('type', [
  SectionFieldSchema,
  SimpleInputFieldSchema,
  SingleChoiceFieldSchema,
  MultipleChoiceFieldSchema,
  FileFieldSchema
])

export const IntakeConfigSchema = z
  .object({
    form: z
      .object({
        title: NonEmptyTrimmed,
        description: z.string().trim().optional(),
        notice: z.string().trim().optional(),
        fields: z.array(IntakeFieldSchema).max(INTAKE_MAX_FIELDS)
      })
      .strict(),
    access: z
      .object({
        passwords: z.array(NonEmptyTrimmed).default([])
      })
      .strict()
      .default({ passwords: [] }),
    notifications: IntakeNotificationScheduleSchema.default({ frequency: 'immediate' })
  })
  .strict()
  .superRefine((config, ctx) => {
    const seenColumns = new Set<string>()
    for (const [index, field] of config.form.fields.entries()) {
      if (!isIntakeInputField(field)) continue
      const column = intakeFieldColumnName(field.label)
      if (!column) {
        ctx.addIssue({
          code: 'custom',
          path: ['form', 'fields', index, 'label'],
          message: `Le champ « ${field.label} » ne produit pas un nom de colonne valide`
        })
        continue
      }
      if (isReservedIntakeColumn(column)) {
        ctx.addIssue({
          code: 'custom',
          path: ['form', 'fields', index, 'label'],
          message: `Le nom de colonne « ${column} » est réservé`
        })
        continue
      }
      if (seenColumns.has(column)) {
        ctx.addIssue({
          code: 'custom',
          path: ['form', 'fields', index, 'label'],
          message: `Deux champs produisent la même colonne « ${column} »`
        })
        continue
      }
      seenColumns.add(column)
    }
  })

export const CreateIntakeBodySchema = z
  .object({
    name: NonEmptyTrimmed,
    description: z.string().trim().optional().default(''),
    tableName: NonEmptyTrimmed,
    publishToKnowledge: z.boolean().optional().default(false),
    mentions: z.array(NonEmptyTrimmed).optional().default([]),
    config: IntakeConfigSchema
  })
  .strict()

export const PatchIntakeBodySchema = z
  .object({
    name: NonEmptyTrimmed.optional(),
    description: z.string().trim().optional(),
    tableName: NonEmptyTrimmed.optional(),
    publishToKnowledge: z.boolean().optional(),
    mentions: z.array(NonEmptyTrimmed).optional(),
    config: IntakeConfigSchema.optional()
  })
  .strict()

export type IntakeColumnTypes = Record<string, IntakeInputField['type']>

const INPUT_FIELD_TYPE_SET = new Set<string>(
  INTAKE_FIELD_TYPES.filter((type) => type !== 'section')
)

export function parseStoredIntakeConfig(raw: string): IntakeConfig {
  return IntakeConfigSchema.parse(JSON.parse(raw))
}

export function fieldsToColumnTypes(fields: readonly IntakeField[]): IntakeColumnTypes {
  const columnTypes: IntakeColumnTypes = {}
  for (const field of fields) {
    if (!isIntakeInputField(field)) continue
    columnTypes[intakeFieldColumnName(field.label)] = field.type
  }
  return columnTypes
}

export function parseColumnTypesJson(raw: string): IntakeColumnTypes {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Stored intake column_types must be an object')
  }
  const result: IntakeColumnTypes = {}
  for (const [column, type] of Object.entries(parsed)) {
    if (typeof type !== 'string' || !INPUT_FIELD_TYPE_SET.has(type)) {
      throw new Error(`Invalid stored intake column type for ${column}`)
    }
    result[column] = type as IntakeInputField['type']
  }
  return result
}

/**
 * Validates that an update to a published intake obeys immutability rules:
 * - `tableName` cannot change
 * - Existing fields cannot change `label` or `type`
 * - Removed column names (still present in SQLite table) cannot be reused by a new field
 * Returns the list of truly new fields requiring `ALTER TABLE ADD COLUMN`.
 */
export function diffPublishedIntakeFields(
  previousConfig: IntakeConfig,
  nextConfig: IntakeConfig,
  existingTableColumns: ReadonlySet<string>
): { addedFields: IntakeInputField[] } | { error: string } {
  const previousByColumn = new Map<string, IntakeInputField>()
  for (const field of previousConfig.form.fields) {
    if (!isIntakeInputField(field)) continue
    previousByColumn.set(intakeFieldColumnName(field.label), field)
  }

  const addedFields: IntakeInputField[] = []
  for (const field of nextConfig.form.fields) {
    if (!isIntakeInputField(field)) continue
    const col = intakeFieldColumnName(field.label)
    const previous = previousByColumn.get(col)
    if (previous) {
      if (previous.label !== field.label) {
        return {
          error: `Le libellé du champ « ${previous.label} » ne peut plus être modifié après publication`
        }
      }
      if (previous.type !== field.type) {
        return {
          error: `Le type du champ « ${previous.label} » ne peut plus être modifié après publication`
        }
      }
      continue
    }
    if (existingTableColumns.has(col)) {
      return {
        error: `La colonne « ${col} » a déjà été utilisée sur cette collecte et ne peut pas être réutilisée`
      }
    }
    addedFields.push(field)
  }

  return { addedFields }
}
