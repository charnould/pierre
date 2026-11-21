import { coreDataContractForFilename } from '../../../shared/core-data'
import { isKnowledgeSourceAssigned, normalize_knowledge_name } from '../../../shared/knowledge'
import { publishModuleForPrompt } from '../../../shared/modules'
import { version } from '../../package.json' with { type: 'json' }
import {
  isReservedCoreDataTitle,
  type KnowledgeCatalogSnapshot,
  type KnowledgeProjection,
  type KnowledgeSource
} from './catalog-schema'

export const PROFILE_BUILD_EPOCH = `${version}:direct-import-2`

export { isKnowledgeSourceAssigned }

export const knowledgePublishTargets = (
  source: Pick<KnowledgeSource, 'profileIds' | 'moduleIds'>,
  knownIds: Iterable<string>
): string[] => {
  const known = new Set(knownIds)
  const targets = new Set([...source.profileIds].filter((id) => known.has(id)))
  if (source.moduleIds.length === 0) return [...targets].sort()
  const modules = new Set(source.moduleIds)
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
  const sourceKeys = new Set<string>()
  for (const source of sources) {
    const sourceKey = `${source.originalName.toLocaleLowerCase('fr')}:${(source.sheetName ?? '').toLocaleLowerCase('fr')}`
    if (sourceKeys.has(sourceKey)) {
      throw new Error(`Knowledge source already exists: ${source.originalName}`)
    }
    sourceKeys.add(sourceKey)

    const coreContract = coreDataContractForFilename(source.originalName)
    if (
      coreContract &&
      (source.fileType !== 'csv' || normalize_knowledge_name(source.title) !== coreContract.table)
    ) {
      throw new Error(`Invalid Core Data source: ${source.originalName}`)
    }
    const key = normalize_knowledge_name(source.title)
    if (!key) throw new Error(`Invalid knowledge title: ${source.title}`)
    if (!coreContract && isReservedCoreDataTitle(key)) {
      throw new Error(`Reserved Core Data title ${source.title}; upload core.${key}.csv instead`)
    }
    for (const profileId of source.profileIds) {
      if (validProfileIds && !validProfileIds.has(profileId)) {
        throw new Error(`Unknown knowledge profile: ${profileId}`)
      }
    }
    for (const access of knowledgePublishTargets(source, validProfileIds ?? [])) {
      const output = `${access}:${key}`
      if (outputs.has(output)) {
        throw new Error(`Knowledge title already used for profile ${access}: ${source.title}`)
      }
      outputs.set(output, source.id)
    }
  }
}

const isCoreDataSource = (source: Pick<KnowledgeSource, 'originalName'>): boolean =>
  coreDataContractForFilename(source.originalName) !== null

const isFingerprintSource = (source: KnowledgeSource): boolean =>
  isKnowledgeSourceAssigned(source) || isCoreDataSource(source)

export const catalogFingerprint = (sources: readonly KnowledgeSource[]): string => {
  const inputs = sources
    .filter(isFingerprintSource)
    .map((source) => ({
      contentHash: source.contentHash,
      fileType: source.fileType,
      originalName: source.originalName,
      title: source.title,
      sheetName: source.sheetName,
      headerRow: source.headerRow,
      headerHash: source.headerHash,
      profileIds: [...source.profileIds].sort(),
      moduleIds: [...source.moduleIds].sort()
    }))
    .sort((left, right) => {
      const leftValue = JSON.stringify(left)
      const rightValue = JSON.stringify(right)
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    })
  return String(Bun.hash(JSON.stringify(inputs)))
}

export const assignedKnowledgeItemKeys = (snapshot: KnowledgeCatalogSnapshot): string[] =>
  snapshot.sources.filter(isKnowledgeSourceAssigned).map((source) => source.id)

export const coreDataFingerprint = (sources: readonly KnowledgeSource[]): string => {
  const inputs = sources
    .flatMap((source) => {
      const contract = coreDataContractForFilename(source.originalName)
      if (!contract || source.fileType !== 'csv') return []
      return [
        {
          table: contract.table,
          originalName: source.originalName,
          contentHash: source.contentHash
        }
      ]
    })
    .sort((left, right) => left.table.localeCompare(right.table, 'fr'))
  return String(Bun.hash(JSON.stringify(inputs)))
}

export const knowledgeProjections = (
  snapshot: KnowledgeCatalogSnapshot,
  knownIds: Iterable<string> = []
): KnowledgeProjection[] =>
  snapshot.sources.flatMap((source) => {
    const coreDataTable = coreDataContractForFilename(source.originalName)?.table ?? null
    return knowledgePublishTargets(source, knownIds).map((access) => ({
      sourceId: source.id,
      access,
      title: source.title,
      fileType: source.fileType,
      contentHash: source.contentHash,
      headerRow: source.headerRow,
      headerHash: source.headerHash,
      coreDataTable
    }))
  })

export const profileBuildFingerprint = (
  profile: { id: string; communityKnowledge: boolean },
  projections: readonly KnowledgeProjection[]
): string => {
  const sources = projections
    .map((projection) => ({
      sourceId: projection.sourceId,
      contentHash: projection.contentHash,
      fileType: projection.fileType,
      title: projection.title,
      headerRow: projection.headerRow,
      headerHash: projection.headerHash
    }))
    .sort((left, right) => {
      const leftValue = JSON.stringify(left)
      const rightValue = JSON.stringify(right)
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    })
  return String(
    Bun.hash(
      JSON.stringify({
        epoch: PROFILE_BUILD_EPOCH,
        profileId: profile.id,
        communityKnowledge: profile.communityKnowledge,
        sources
      })
    )
  )
}
