import type {
  KnowledgeBuild,
  KnowledgeData,
  KnowledgeEntry,
  KnowledgeSource
} from '@/shared/types/knowledge'

import { isKnowledgeEntryAssigned } from '../../../../../shared/knowledge'
import { BUSINESS_MODULES } from '../../../../../shared/modules'

export { isKnowledgeEntryAssigned }

export type KnowledgeItem = {
  source: KnowledgeSource
  entry: KnowledgeEntry
  entryIndex: number
  itemKey: string
  coreDataTable: KnowledgeSource['coreDataEntries'][number]['table'] | null
}

export type KnowledgeBuckets = {
  coreData: Array<{
    contract: KnowledgeData['coreDataTables'][number]
    item: KnowledgeItem | null
  }>
  other: KnowledgeItem[]
}

export type KnowledgeItemState =
  | 'absent'
  | 'unassigned'
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'

export const buildKnowledgeBuckets = (
  sources: readonly KnowledgeSource[],
  coreDataTables: KnowledgeData['coreDataTables'],
  query = ''
): KnowledgeBuckets => {
  const items = sources.flatMap((source) =>
    source.entries.map((entry, entryIndex) => ({
      source,
      entry,
      entryIndex,
      itemKey: source.itemKeys[entryIndex]!,
      coreDataTable:
        source.coreDataEntries.find((candidate) => candidate.index === entryIndex)?.table ?? null
    }))
  )
  const coreItems = new Map(
    items.filter((item) => item.coreDataTable !== null).map((item) => [item.coreDataTable!, item])
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  const other = items
    .filter((item) => item.coreDataTable === null)
    .filter((item) => {
      if (!normalizedQuery) return true
      return [item.source.originalName, item.entry.sheetName ?? '', item.entry.title].some(
        (value) => value.toLocaleLowerCase('fr').includes(normalizedQuery)
      )
    })
    .sort(
      (a, b) =>
        a.source.originalName.localeCompare(b.source.originalName, 'fr') ||
        (a.entry.sheetName ?? a.entry.title).localeCompare(b.entry.sheetName ?? b.entry.title, 'fr')
    )
  return {
    coreData: coreDataTables.map((contract) => ({
      contract,
      item: coreItems.get(contract.table) ?? null
    })),
    other
  }
}

export const knowledgeAssignmentSummary = (
  entry: Pick<KnowledgeEntry, 'profileIds' | 'moduleIds'>,
  profiles: ReadonlyArray<{ id: string; label: string }>
): { profiles: string[]; modules: string[] } => ({
  profiles: entry.profileIds.map(
    (id) => profiles.find((profile) => profile.id === id)?.label ?? id
  ),
  modules: BUSINESS_MODULES.filter((module) => entry.moduleIds.includes(module.id)).map(
    (module) => module.label
  )
})

export const knowledgeItemState = (
  item: KnowledgeItem | null,
  build: KnowledgeBuild | null,
  needsRebuild: boolean
): KnowledgeItemState => {
  if (!item) return 'absent'
  if (!isKnowledgeEntryAssigned(item.entry)) return 'unassigned'
  if (build?.status === 'queued' || build?.status === 'running') return 'running'
  const itemStatus = build?.items.find(({ key }) => key === item.itemKey)?.status
  if (build?.status === 'failed' && itemStatus === 'failed') return 'failed'
  if (needsRebuild) return 'pending'
  return itemStatus ?? 'pending'
}

export const knowledgeFileKind = (
  fileType: KnowledgeSource['fileType'] | undefined
): 'table' | 'document' => (fileType === 'md' || fileType === 'docx' ? 'document' : 'table')

export const knowledgeDeleteKind = (item: KnowledgeItem): 'file' | 'sheet' =>
  item.source.fileType === 'xlsx' && item.source.entries.length > 1 ? 'sheet' : 'file'

export const knowledgeRowTitle = (
  item: KnowledgeItem | null,
  coreData?: { filename: string }
): string => (coreData ? coreData.filename : (item?.entry.title ?? ''))

export const knowledgeRowDescription = (
  item: KnowledgeItem | null,
  coreData?: { label: string }
): string => (coreData ? coreData.label : (item?.source.originalName ?? ''))
