import { normalize_knowledge_name } from '@pierre/shared/knowledge'

import {
  INTAKE_ALLOWED_MIMES,
  INTAKE_MAX_FIELDS,
  INTAKE_MAX_FILE_BYTES,
  type IntakeConfig,
  type IntakeField,
  intakeFieldColumnName,
  type IntakeFieldType,
  type IntakeRecord,
  type IntakeStatus,
  isIntakeInputField,
  isReservedIntakeColumn,
  validateIntakeTableName
} from '@/shared/types/intakes'

export type IntakeSortKey = 'recent' | 'name' | 'submissions' | 'status'

export const INTAKE_SORT_OPTIONS: ReadonlyArray<{ value: IntakeSortKey; label: string }> = [
  { value: 'recent', label: 'Dernière réponse' },
  { value: 'name', label: 'Nom (A–Z)' },
  { value: 'submissions', label: 'Nombre de réponses' },
  { value: 'status', label: 'Statut' }
]

const STATUS_ORDER: Record<IntakeStatus, number> = {
  published: 0,
  draft: 1,
  closed: 2
}

export function intakeStatusLabel(status: IntakeStatus): string {
  switch (status) {
    case 'published':
      return 'Publiée'
    case 'closed':
      return 'Clôturée'
    default:
      return 'Brouillon'
  }
}

export function intakeStatusVariant(status: IntakeStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'published':
      return 'default'
    case 'closed':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function intakePublicUrl(
  serverUrl: string | undefined,
  token: string | null
): string | null {
  if (!serverUrl || !token) return null
  return `${serverUrl.replace(/\/+$/, '')}/repondre/${token}`
}

export function formatIntakeTimestamp(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function filterAndSortIntakes(
  intakes: readonly IntakeRecord[],
  query: string,
  sortKey: IntakeSortKey
): IntakeRecord[] {
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? intakes.filter(
        (item) =>
          item.name.toLowerCase().includes(normalized) ||
          item.description.toLowerCase().includes(normalized) ||
          item.tableName.toLowerCase().includes(normalized)
      )
    : [...intakes]

  filtered.sort((a, b) => {
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    }
    if (sortKey === 'submissions') {
      if (b.submissionCount !== a.submissionCount) return b.submissionCount - a.submissionCount
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    }
    if (sortKey === 'status') {
      const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    }
    const aTime = new Date(a.lastSubmissionAt ?? a.publishedAt ?? a.createdAt).getTime()
    const bTime = new Date(b.lastSubmissionAt ?? b.publishedAt ?? b.createdAt).getTime()
    if (bTime !== aTime) return bTime - aTime
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  })

  return filtered
}

export function createDefaultField(type: IntakeFieldType): IntakeField {
  switch (type) {
    case 'section':
      return { type: 'section', label: 'Nouvelle section', description: '' }
    case 'single_choice':
      return {
        type: 'single_choice',
        label: '',
        description: '',
        required: false,
        display: 'select',
        options: ['Option 1', 'Option 2']
      }
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        label: '',
        description: '',
        required: false,
        options: ['Option 1', 'Option 2']
      }
    case 'file':
      return {
        type: 'file',
        label: '',
        description: '',
        required: false,
        accept: [...INTAKE_ALLOWED_MIMES],
        maxFiles: 3,
        maxFileBytes: INTAKE_MAX_FILE_BYTES
      }
    default:
      return {
        type,
        label: '',
        description: '',
        required: false
      }
  }
}

export type DraftIntakeField = {
  key: string
  locked: boolean
  field: IntakeField
}

let draftFieldCounter = 0

function nextDraftFieldKey(): string {
  draftFieldCounter += 1
  return `draft-field-${draftFieldCounter}`
}

export function toDraftIntakeFields(
  fields: readonly IntakeField[],
  isPublished: boolean
): DraftIntakeField[] {
  return fields.map((field) => ({
    key: nextDraftFieldKey(),
    locked: isPublished && isIntakeInputField(field),
    field: structuredClone(field)
  }))
}

export function createDraftIntakeField(type: IntakeFieldType): DraftIntakeField {
  return {
    key: nextDraftFieldKey(),
    locked: false,
    field: createDefaultField(type)
  }
}

export function duplicateDraftIntakeField(entry: DraftIntakeField): DraftIntakeField {
  const clone: IntakeField = structuredClone(entry.field)
  clone.label = entry.field.label ? `${entry.field.label} (copie)` : ''
  return {
    key: nextDraftFieldKey(),
    locked: false,
    field: clone
  }
}

export function createEmptyIntakeConfig(): IntakeConfig {
  return {
    form: {
      title: '',
      description: '',
      notice: '',
      fields: [
        {
          type: 'short_text',
          label: 'Nom',
          description: '',
          required: true
        }
      ]
    },
    access: {
      passwords: []
    },
    notifications: {
      frequency: 'immediate'
    }
  }
}

export function validateIntakeDraft(params: {
  name: string
  tableName: string
  entries: readonly DraftIntakeField[]
  isPublished: boolean
  lockedColumns: readonly string[]
}): string | null {
  if (!params.name.trim()) return 'Le nom de la collecte est obligatoire.'
  const normalizedTable = normalize_knowledge_name(params.tableName)
  if (!normalizedTable) return 'Le nom de table est obligatoire.'
  if (!params.isPublished && !validateIntakeTableName(params.tableName)) {
    return `Le nom de table « ${normalizedTable} » est réservé.`
  }

  if (params.entries.length === 0) {
    return 'Ajoutez au moins un champ au formulaire.'
  }
  if (params.entries.length > INTAKE_MAX_FIELDS) {
    return `Une collecte ne peut pas dépasser ${INTAKE_MAX_FIELDS} champs.`
  }

  const hasInputField = params.entries.some((entry) => isIntakeInputField(entry.field))
  if (!hasInputField) {
    return 'Ajoutez au moins un champ de saisie.'
  }

  const seenColumns = new Set<string>()
  const lockedColumnSet = new Set(params.lockedColumns)

  for (const [index, entry] of params.entries.entries()) {
    const { field, locked } = entry
    const label = field.label.trim()
    if (!label) return `Le libellé du champ #${index + 1} est obligatoire.`

    if (!isIntakeInputField(field)) continue

    const column = intakeFieldColumnName(label)
    if (!column) {
      return `Le libellé « ${label} » ne produit pas de nom de colonne valide.`
    }
    if (isReservedIntakeColumn(column)) {
      return `Le nom de colonne « ${column} » est réservé.`
    }
    if (seenColumns.has(column)) {
      return `Deux champs produisent la même colonne « ${column} ».`
    }
    if (params.isPublished && !locked && lockedColumnSet.has(column)) {
      return `La colonne « ${column} » a déjà été utilisée sur cette collecte et ne peut pas être réutilisée.`
    }
    seenColumns.add(column)

    if (field.type === 'single_choice' || field.type === 'multiple_choice') {
      const validOptions = field.options.map((opt) => opt.trim()).filter(Boolean)
      if (validOptions.length === 0) {
        return `Le champ « ${label} » doit contenir au moins une option.`
      }
      const unique = new Set(validOptions)
      if (unique.size !== validOptions.length) {
        return `Le champ « ${label} » contient des options en doublon.`
      }
    }

    if (field.type === 'file' && field.accept.length === 0) {
      return `Le champ « ${label} » doit accepter au moins un format de fichier.`
    }
  }

  return null
}

export function cleanIntakeFields(fields: readonly IntakeField[]): IntakeField[] {
  return fields.map((field) => {
    const label = field.label.trim()
    const description = field.description?.trim() || undefined
    if (field.type === 'section') {
      return { type: 'section', label, description }
    }
    if (field.type === 'single_choice') {
      return {
        type: 'single_choice',
        label,
        description,
        required: Boolean(field.required),
        display: field.display === 'radio' ? 'radio' : 'select',
        options: field.options.map((opt) => opt.trim()).filter(Boolean)
      }
    }
    if (field.type === 'multiple_choice') {
      return {
        type: 'multiple_choice',
        label,
        description,
        required: Boolean(field.required),
        options: field.options.map((opt) => opt.trim()).filter(Boolean)
      }
    }
    if (field.type === 'file') {
      return {
        type: 'file',
        label,
        description,
        required: Boolean(field.required),
        accept: field.accept,
        maxFiles: field.maxFiles,
        maxFileBytes: field.maxFileBytes
      }
    }
    return {
      type: field.type,
      label,
      description,
      required: Boolean(field.required)
    }
  })
}
