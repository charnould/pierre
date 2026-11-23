import { Database } from 'bun:sqlite'

import { intakeKnowledgeOriginalName } from '../../../shared/intakes'
import { isKnowledgeSourceAssigned } from '../../../shared/knowledge'
import { requestKnowledgeBuild } from '../knowledge/build-coordinator'
import {
  assertKnowledgeCatalogValidInDb,
  deleteKnowledgeSourceInDb,
  findKnowledgeSourceByOriginalNameInDb,
  insertKnowledgeSourceInDb,
  updateKnowledgeSourceFileInDb
} from '../knowledge/knowledge-sources'
import { IntakesError } from './errors'
import { parseColumnTypesJson } from './schemas'
import { intakeKnowledgeRevisionHash } from './table'

const DEFAULT_DEBOUNCE_MS = 6_000

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let debounceDelayMs = DEFAULT_DEBOUNCE_MS

export type IntakeKnowledgeRebuildMode = 'none' | 'debounced' | 'immediate'

export type IntakeKnowledgeRow = {
  name: string
  table_name: string
  description: string
  publish_to_knowledge: number
  published_at: string | null
  column_types: string
}

/** Removes any Encyclopédie source row for an intake inside the active DB transaction. */
export function removeIntakeKnowledgeInDb(
  db: Database,
  tableName: string
): IntakeKnowledgeRebuildMode {
  const existing = findKnowledgeSourceByOriginalNameInDb(db, intakeKnowledgeOriginalName(tableName))
  if (!existing) return 'none'
  const deleted = deleteKnowledgeSourceInDb(db, existing.id)
  return deleted !== null && isKnowledgeSourceAssigned(deleted) ? 'immediate' : 'none'
}

/**
 * Synchronizes the `knowledge_records` source row for an intake inside the active DB transaction.
 * Returns the post-commit rebuild mode required for the Encyclopédie coordinator.
 */
export function syncIntakeKnowledgeRowInDb(
  db: Database,
  row: IntakeKnowledgeRow
): IntakeKnowledgeRebuildMode {
  if (row.published_at === null || row.publish_to_knowledge !== 1) {
    return removeIntakeKnowledgeInDb(db, row.table_name)
  }

  const existing = findKnowledgeSourceByOriginalNameInDb(
    db,
    intakeKnowledgeOriginalName(row.table_name)
  )
  const columns = Object.keys(parseColumnTypesJson(row.column_types))
  const contentHash = intakeKnowledgeRevisionHash(db, row.table_name, row.description, columns)
  const displayTitle = row.name.trim() || row.table_name
  const description = row.description.trim() || null

  if (!existing) {
    insertKnowledgeSourceInDb(
      db,
      {
        originalName: intakeKnowledgeOriginalName(row.table_name),
        fileType: 'intake',
        sizeBytes: 0,
        contentHash,
        origin: 'ui',
        title: displayTitle,
        description,
        sheetName: null,
        headerRow: null,
        headerHash: null,
        profileIds: [],
        moduleIds: []
      },
      null
    )
    try {
      assertKnowledgeCatalogValidInDb(db)
    } catch (error) {
      throw new IntakesError(
        error instanceof Error ? error.message : 'Conflit de catalogue Encyclopédie',
        'conflict'
      )
    }
    return 'none'
  }

  if (
    existing.contentHash === contentHash &&
    existing.title === displayTitle &&
    (existing.description ?? null) === description
  ) {
    return 'none'
  }

  const updated = updateKnowledgeSourceFileInDb(db, existing.id, {
    contentHash,
    title: displayTitle,
    description
  })
  return updated !== null && isKnowledgeSourceAssigned(updated) ? 'debounced' : 'none'
}

function scheduleIntakeKnowledgeRebuild(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    try {
      requestKnowledgeBuild('intake', null)
    } catch (error) {
      console.error('[intakes.knowledge.rebuild]', error)
    }
  }, debounceDelayMs)
}

function requestImmediateIntakeKnowledgeRebuild(requestedBy: string | null): void {
  cancelPendingIntakeKnowledgeRebuild()
  requestKnowledgeBuild('intake', requestedBy)
}

/** Applies the post-commit rebuild decision returned by `syncIntakeKnowledgeRowInDb`. */
export function triggerIntakeKnowledgeRebuild(
  mode: IntakeKnowledgeRebuildMode,
  requestedBy: string | null = null
): void {
  if (mode === 'debounced') scheduleIntakeKnowledgeRebuild()
  else if (mode === 'immediate') requestImmediateIntakeKnowledgeRebuild(requestedBy)
}

export function setIntakeKnowledgeDebounceForTests(ms: number): void {
  debounceDelayMs = ms
}

export function cancelPendingIntakeKnowledgeRebuild(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}
