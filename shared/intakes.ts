import { DATASTORE_TABLES } from './core-data'
import { normalize_knowledge_name } from './knowledge'

export const INTAKE_MAX_FIELDS = 50
export const INTAKE_SHORT_TEXT_MAX = 500
export const INTAKE_LONG_TEXT_MAX = 10_000
export const INTAKE_MAX_FILES_PER_FIELD = 10
export const INTAKE_MAX_FILE_BYTES = 10 * 1024 * 1024
export const INTAKE_MAX_TOTAL_BYTES = 25 * 1024 * 1024

export const INTAKE_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
] as const

export type IntakeAllowedMime = (typeof INTAKE_ALLOWED_MIMES)[number]

export const INTAKE_MIME_LABELS: Record<IntakeAllowedMime, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP'
}

export const INTAKE_RESERVED_COLUMNS = [
  'id',
  'date_creation',
  'rattachement',
  'id_client',
  'id_locataire',
  'id_lot',
  '_files'
] as const

export const INTAKE_FIELD_TYPES = [
  'section',
  'short_text',
  'long_text',
  'number',
  'date',
  'datetime',
  'email',
  'phone',
  'single_choice',
  'multiple_choice',
  'checkbox',
  'file'
] as const

export type IntakeFieldType = (typeof INTAKE_FIELD_TYPES)[number]

export const INTAKE_FIELD_TYPE_LABELS: Record<IntakeFieldType, string> = {
  section: 'Section (séparateur)',
  short_text: 'Texte court',
  long_text: 'Texte long',
  number: 'Nombre',
  date: 'Date',
  datetime: 'Date et heure',
  email: 'Courriel',
  phone: 'Téléphone',
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiple',
  checkbox: 'Case à cocher',
  file: 'Fichier'
}

export type IntakeSectionField = {
  type: 'section'
  label: string
  description?: string
}

export type IntakeTextField = {
  type: 'short_text' | 'long_text' | 'number' | 'date' | 'datetime' | 'email' | 'phone'
  label: string
  description?: string
  required?: boolean
}

export type IntakeCheckboxField = {
  type: 'checkbox'
  label: string
  description?: string
  required?: boolean
}

export type IntakeSingleChoiceField = {
  type: 'single_choice'
  label: string
  description?: string
  required?: boolean
  display?: 'select' | 'radio'
  options: string[]
}

export type IntakeMultipleChoiceField = {
  type: 'multiple_choice'
  label: string
  description?: string
  required?: boolean
  options: string[]
}

export type IntakeFileField = {
  type: 'file'
  label: string
  description?: string
  required?: boolean
  accept: IntakeAllowedMime[]
  maxFiles?: number
  maxFileBytes?: number
}

export type IntakeField =
  | IntakeSectionField
  | IntakeTextField
  | IntakeCheckboxField
  | IntakeSingleChoiceField
  | IntakeMultipleChoiceField
  | IntakeFileField

export type IntakeInputField = Exclude<IntakeField, IntakeSectionField>

export type IntakeNotificationsConfig =
  { mode: 'none' } | { mode: 'immediate' } | { mode: 'hourly' } | { mode: 'daily'; hour: number }

export type IntakeConfig = {
  form: {
    title: string
    description?: string
    notice?: string
    fields: IntakeField[]
  }
  access: {
    passwords: string[]
  }
  notifications: IntakeNotificationsConfig
}

export type IntakeStatus = 'draft' | 'published' | 'closed'

export type IntakeRecord = {
  id: string
  name: string
  description: string
  tableName: string
  publishToKnowledge: boolean
  owner: string
  mentions: string[]
  token: string | null
  config: IntakeConfig
  status: IntakeStatus
  createdAt: string
  publishedAt: string | null
  closedAt: string | null
  lastNotifiedAt: string | null
  submissionCount: number
  lastSubmissionAt: string | null
  /** Column names locked in `intake_{table_name}` after publication (including removed fields). */
  lockedColumns: string[]
}

export type CreateIntakeBody = {
  name: string
  description?: string
  tableName: string
  publishToKnowledge?: boolean
  mentions?: string[]
  config: IntakeConfig
}

export type PatchIntakeBody = {
  name?: string
  description?: string
  tableName?: string
  publishToKnowledge?: boolean
  mentions?: string[]
  config?: IntakeConfig
}

export type IntakeApiError = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export type IntakeListResponse = { data: IntakeRecord[] } | IntakeApiError
export type IntakeResponse = { data: IntakeRecord } | IntakeApiError
export type IntakeDeleteResponse = { data: { deleted: true } } | IntakeApiError

export type IntakePublicBoot = {
  organizationName: string
  form: IntakeConfig['form']
  hasPasswords: boolean
  actionUrl: string
  speechUrl: string | null
  initialSubmissionId: string
}

export const INTAKE_KNOWLEDGE_PREFIX = 'intake:'

export function intakeTableName(tableName: string): string {
  return `intake_${tableName}`
}

export function intakeKnowledgeOriginalName(tableName: string): string {
  return `${INTAKE_KNOWLEDGE_PREFIX}${tableName}`
}

export function intakeTableNameFromOriginalName(originalName: string): string | null {
  return originalName.startsWith(INTAKE_KNOWLEDGE_PREFIX)
    ? originalName.slice(INTAKE_KNOWLEDGE_PREFIX.length) || null
    : null
}

export function isIntakeInputField(field: IntakeField): field is IntakeInputField {
  return field.type !== 'section'
}

export function intakeFieldColumnName(label: string): string {
  return normalize_knowledge_name(label)
}

export const RESERVED_INTAKE_TABLE_NAMES = new Set<string>([
  'documents',
  'communes_par_code_postal',
  ...DATASTORE_TABLES
])

export function validateIntakeTableName(raw: string): string | null {
  const normalized = normalize_knowledge_name(raw)
  if (
    !normalized ||
    normalized.startsWith('sqlite_') ||
    RESERVED_INTAKE_TABLE_NAMES.has(normalized)
  ) {
    return null
  }
  return normalized
}

export function isReservedIntakeColumn(name: string): boolean {
  return (INTAKE_RESERVED_COLUMNS as readonly string[]).includes(name)
}

export function intakeStatusFromDates(
  publishedAt: string | null,
  closedAt: string | null
): IntakeStatus {
  if (!publishedAt) return 'draft'
  if (closedAt) return 'closed'
  return 'published'
}
