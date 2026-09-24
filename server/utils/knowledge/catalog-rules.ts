import { join } from 'node:path'

import { coreDataContractForFilename } from '../../../shared/core-data'
import { isKnowledgeEntryAssigned, normalize_knowledge_name } from '../../../shared/knowledge'
import { publishModuleForPrompt } from '../../../shared/modules'
import { datastorePaths } from '../paths'
import {
  isReservedCoreDataTitle,
  type KnowledgeCatalogSnapshot,
  type KnowledgeEntry,
  type KnowledgeIngestionEntry,
  type KnowledgeSource
} from './catalog-schema'

export { isKnowledgeEntryAssigned }

export const knowledgePublishTargets = (
  entry: Pick<KnowledgeEntry, 'profileIds' | 'moduleIds'>,
  knownIds: Iterable<string>
): string[] => {
  const known = new Set(knownIds)
  const targets = new Set([...entry.profileIds].filter((id) => known.has(id)))
  if (entry.moduleIds.length === 0) return [...targets].sort()
  const modules = new Set(entry.moduleIds)
  for (const id of known) {
    const moduleId = publishModuleForPrompt(id)
    if (moduleId && modules.has(moduleId)) targets.add(id)
  }
  return [...targets].sort()
}

export const assertNoOutputCollisions = (
  sources: readonly KnowledgeSource[],
  validProfileIds?: ReadonlySet<string>
): void => {
  const outputs = new Map<string, string>()
  for (const source of sources) {
    const coreContract = coreDataContractForFilename(source.originalName)
    if (
      coreContract &&
      (source.fileType !== 'csv' ||
        source.entries.length !== 1 ||
        normalize_knowledge_name(source.entries[0]!.title) !== coreContract.table)
    ) {
      throw new Error(`Invalid Core Data source: ${source.originalName}`)
    }
    for (const entry of source.entries) {
      const key = normalize_knowledge_name(entry.title)
      if (!key) throw new Error(`Invalid knowledge title: ${entry.title}`)
      if (!coreContract && isReservedCoreDataTitle(key)) {
        throw new Error(`Reserved Core Data title ${entry.title}; upload core.${key}.csv instead`)
      }
      for (const profileId of entry.profileIds) {
        if (validProfileIds && !validProfileIds.has(profileId)) {
          throw new Error(`Unknown knowledge profile: ${profileId}`)
        }
      }
      for (const access of knowledgePublishTargets(entry, validProfileIds ?? [])) {
        const output = `${access}:${key}`
        if (outputs.has(output)) {
          throw new Error(`Knowledge title already used for profile ${access}: ${entry.title}`)
        }
        outputs.set(output, source.id)
      }
    }
  }
}

const isCoreDataSource = (source: Pick<KnowledgeSource, 'originalName'>): boolean =>
  coreDataContractForFilename(source.originalName) !== null

const isFingerprintEntry = (source: KnowledgeSource, entry: KnowledgeEntry): boolean =>
  isKnowledgeEntryAssigned(entry) || isCoreDataSource(source)

export const catalogFingerprint = (sources: readonly KnowledgeSource[]): string => {
  const inputs = sources
    .flatMap((source) =>
      source.entries
        .filter((entry) => isFingerprintEntry(source, entry))
        .map((entry) => ({
          contentHash: source.contentHash,
          fileType: source.fileType,
          originalName: source.originalName,
          title: entry.title,
          sheet: entry.sheet,
          headerRow: entry.headerRow,
          profileIds: [...entry.profileIds].sort(),
          moduleIds: [...entry.moduleIds].sort()
        }))
    )
    .sort((left, right) => {
      const leftValue = JSON.stringify(left)
      const rightValue = JSON.stringify(right)
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    })
  return String(Bun.hash(JSON.stringify(inputs)))
}

export const knowledgeItemKey = (sourceId: string, entry: KnowledgeEntry): string =>
  `${sourceId}:${entry.sheetName ?? 'document'}`

export const assignedKnowledgeItemKeys = (snapshot: KnowledgeCatalogSnapshot): string[] => [
  ...new Set(
    snapshot.sources.flatMap((source) =>
      source.entries
        .filter((entry) => isKnowledgeEntryAssigned(entry))
        .map((entry) => knowledgeItemKey(source.id, entry))
    )
  )
]

export const flattenKnowledgeEntries = (
  snapshot: KnowledgeCatalogSnapshot,
  knownIds: Iterable<string> = []
): KnowledgeIngestionEntry[] => {
  const root = datastorePaths().files
  return snapshot.sources.flatMap((source) =>
    source.entries.flatMap((entry) => {
      const coreDataTable = coreDataContractForFilename(source.originalName)?.table ?? null
      return knowledgePublishTargets(entry, knownIds).map((access) => ({
        filepath: join(root, source.storageName),
        access,
        sheet: entry.sheet ?? 0,
        headers: entry.headerRow ?? 0,
        filename: source.originalName,
        agent_filename: entry.title,
        type: source.fileType,
        coreDataTable
      }))
    })
  )
}
