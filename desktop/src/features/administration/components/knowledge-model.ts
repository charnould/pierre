import { intakeTableNameFromOriginalName } from '@pierre/shared/intakes'
import { isKnowledgeSourceAssigned } from '@pierre/shared/knowledge'
import { BUSINESS_MODULES } from '@pierre/shared/modules'

import type { KnowledgeBuild, KnowledgeData, KnowledgeSource } from '@/shared/types/knowledge'

export { isKnowledgeSourceAssigned }

export type KnowledgeBuckets = {
  coreData: Array<{
    contract: KnowledgeData['coreDataTables'][number]
    source: KnowledgeSource | null
  }>
  intakes: KnowledgeSource[]
  other: KnowledgeSource[]
}

export type KnowledgeItemState =
  'absent' | 'unassigned' | 'pending' | 'running' | 'succeeded' | 'failed'

export const buildKnowledgeBuckets = (
  sources: readonly KnowledgeSource[],
  coreDataTables: KnowledgeData['coreDataTables'],
  query = ''
): KnowledgeBuckets => {
  const coreSources = new Map(
    sources
      .filter((source) => source.coreDataTable !== null)
      .map((source) => [source.coreDataTable!, source])
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  const matchesQuery = (source: KnowledgeSource): boolean => {
    if (!normalizedQuery) return true
    return [source.originalName, source.sheetName ?? '', source.title].some((value) =>
      value.toLocaleLowerCase('fr').includes(normalizedQuery)
    )
  }
  const intakes = sources
    .filter((source) => source.coreDataTable === null && source.fileType === 'intake')
    .filter(matchesQuery)
    .sort(
      (a, b) =>
        a.title.localeCompare(b.title, 'fr') || a.originalName.localeCompare(b.originalName, 'fr')
    )
  const other = sources
    .filter((source) => source.coreDataTable === null && source.fileType !== 'intake')
    .filter(matchesQuery)
    .sort(
      (a, b) =>
        a.originalName.localeCompare(b.originalName, 'fr') ||
        (a.sheetName ?? a.title).localeCompare(b.sheetName ?? b.title, 'fr')
    )
  return {
    coreData: coreDataTables.map((contract) => ({
      contract,
      source: coreSources.get(contract.table) ?? null
    })),
    intakes,
    other
  }
}

export const knowledgeAssignmentSummary = (
  source: Pick<KnowledgeSource, 'profileIds' | 'moduleIds'>,
  profiles: ReadonlyArray<{ id: string; label: string }>
): { profiles: string[]; modules: string[] } => ({
  profiles: source.profileIds.map(
    (id) => profiles.find((profile) => profile.id === id)?.label ?? id
  ),
  modules: BUSINESS_MODULES.filter((module) => source.moduleIds.includes(module.id)).map(
    (module) => module.label
  )
})

export const knowledgeItemState = (
  source: KnowledgeSource | null,
  build: KnowledgeBuild | null,
  needsRebuild: boolean
): KnowledgeItemState => {
  if (!source) return 'absent'
  if (!isKnowledgeSourceAssigned(source)) return 'unassigned'
  if (build?.status === 'queued' || build?.status === 'running') return 'running'
  const itemStatus = build?.items.find(({ key }) => key === source.id)?.status
  if (build?.status === 'failed' && itemStatus === 'failed') return 'failed'
  if (needsRebuild) return 'pending'
  return itemStatus ?? 'pending'
}

export const knowledgeFileKind = (
  fileType: KnowledgeSource['fileType'] | undefined
): 'table' | 'document' => (fileType === 'md' || fileType === 'docx' ? 'document' : 'table')

export const knowledgeRowTitle = (
  source: KnowledgeSource | null,
  coreData?: { filename: string }
): string => (coreData ? coreData.filename : (source?.title ?? ''))

export const knowledgeRowDescription = (
  source: KnowledgeSource | null,
  coreData?: { label: string }
): string => {
  if (coreData) return coreData.label
  if (!source) return ''
  if (source.fileType === 'intake') {
    return intakeTableNameFromOriginalName(source.originalName) ?? source.originalName
  }
  return source.originalName
}
