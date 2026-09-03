import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { DirectoryList } from '@/shared/components/DirectoryList'
import { Docket } from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import type { KnowledgeSource } from '@/shared/types/knowledge'

import { buildKnowledgeBuckets, knowledgeDeleteKind, type KnowledgeItem } from './knowledge-model'
import { KnowledgeRow } from './KnowledgeRow'
import { KnowledgeSourceDialog } from './KnowledgeSourceDialog'
import { KnowledgeToolbar } from './KnowledgeToolbar'
import { useKnowledgeCatalog } from './useKnowledgeCatalog'

interface Props {
  url: string
}

type PendingDelete =
  | { kind: 'file'; source: KnowledgeSource }
  | { kind: 'sheet'; item: KnowledgeItem }

export function KnowledgePanel({ url }: Props) {
  const catalog = useKnowledgeCatalog(url)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{
    source: KnowledgeSource
    entryIndex: number
    coreDataTable: string | null
  } | null>(null)
  const [deleting, setDeleting] = useState<PendingDelete | null>(null)

  const buckets = useMemo(
    () =>
      buildKnowledgeBuckets(catalog.data?.sources ?? [], catalog.data?.coreDataTables ?? [], query),
    [catalog.data?.coreDataTables, catalog.data?.sources, query]
  )
  const itemCount =
    buckets.coreData.filter(({ item }) => item !== null).length + buckets.other.length
  const buildActive =
    catalog.data?.lastBuild?.status === 'queued' || catalog.data?.lastBuild?.status === 'running'

  const openEntry = (item: KnowledgeItem) =>
    setEditing({
      source: item.source,
      entryIndex: item.entryIndex,
      coreDataTable: item.coreDataTable
    })

  const requestDelete = (item: KnowledgeItem) =>
    setDeleting(
      knowledgeDeleteKind(item) === 'sheet'
        ? { kind: 'sheet', item }
        : { kind: 'file', source: item.source }
    )

  async function confirmDelete() {
    if (!deleting) return
    const removed =
      deleting.kind === 'sheet'
        ? await catalog.removeSheet(deleting.item)
        : await catalog.removeFile(deleting.source)
    if (removed) setDeleting(null)
  }

  async function upload() {
    const source = await catalog.upload()
    if (source?.entries[0]) {
      setEditing({
        source,
        entryIndex: 0,
        coreDataTable: source.coreDataEntries[0]?.table ?? null
      })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <KnowledgeToolbar
        query={query}
        lastBuild={catalog.data?.lastBuild ?? null}
        needsRebuild={catalog.data?.needsRebuild ?? false}
        buildActive={buildActive}
        uploading={catalog.uploading}
        onQueryChange={setQuery}
        onRebuild={() => void catalog.rebuild()}
        onUpload={() => void upload()}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {!catalog.data && !catalog.loadError ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : catalog.loadError ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Docket />
              </EmptyMedia>
              <EmptyTitle>Encyclopédie indisponible</EmptyTitle>
              <EmptyDescription>{catalog.loadError}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={() => void catalog.load()}>
                Réessayer
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex min-w-0 flex-col">
            <section>
              <header className="border-border bg-background flex items-baseline gap-2 border-b px-4 py-2">
                <h2 className="m-0 font-sans text-xl leading-6 font-semibold tracking-tight text-balance">
                  Core Data HLM
                </h2>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium">
                  ·
                </span>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tabular-nums">
                  {buckets.coreData.length}
                </span>
              </header>
              <DirectoryList>
                {buckets.coreData.map(({ contract, item }) => (
                  <KnowledgeRow
                    key={contract.table}
                    item={item}
                    coreData={contract}
                    lastBuild={catalog.data?.lastBuild ?? null}
                    needsRebuild={catalog.data?.needsRebuild ?? false}
                    profiles={catalog.data?.profiles ?? []}
                    url={url}
                    onOpen={openEntry}
                    onUnassign={(row) => void catalog.unassign(row)}
                    onDelete={requestDelete}
                  />
                ))}
              </DirectoryList>
            </section>

            <section>
              <header className="border-border bg-background flex items-baseline gap-2 border-b px-4 py-2">
                <h2 className="m-0 font-sans text-xl leading-6 font-semibold tracking-tight text-balance">
                  Autres sources
                </h2>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium">
                  ·
                </span>
                <span className="text-muted-foreground font-sans text-xl leading-6 font-medium tabular-nums">
                  {buckets.other.length}
                </span>
              </header>
              {buckets.other.length > 0 ? (
                <DirectoryList>
                  {buckets.other.map((item) => (
                    <KnowledgeRow
                      key={item.itemKey}
                      item={item}
                      lastBuild={catalog.data?.lastBuild ?? null}
                      needsRebuild={catalog.data?.needsRebuild ?? false}
                      profiles={catalog.data?.profiles ?? []}
                      url={url}
                      onOpen={openEntry}
                      onUnassign={(row) => void catalog.unassign(row)}
                      onDelete={requestDelete}
                    />
                  ))}
                </DirectoryList>
              ) : itemCount === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Docket />
                    </EmptyMedia>
                    <EmptyTitle>Aucune autre source</EmptyTitle>
                    <EmptyDescription>
                      Ajoutez les premiers documents de cette organisation.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </section>
          </div>
        )}
      </div>

      {editing && catalog.data ? (
        <KnowledgeSourceDialog
          key={`${editing.source.id}:${editing.entryIndex}`}
          url={url}
          source={editing.source}
          entryIndex={editing.entryIndex}
          coreDataTable={editing.coreDataTable}
          profiles={catalog.data.profiles}
          onClose={() => setEditing(null)}
          onSaved={catalog.replaceSource}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={deleting?.kind === 'sheet' ? 'Retirer l’onglet' : 'Supprimer le fichier'}
        description={
          deleting?.kind === 'sheet'
            ? `L’onglet ${deleting.item.entry.sheetName ?? deleting.item.entry.title} de ${deleting.item.source.originalName} sera retiré de l’encyclopédie.`
            : deleting
              ? deleting.source.entries.length > 1
                ? `${deleting.source.originalName} et ses ${deleting.source.entries.length} lignes seront supprimés définitivement.`
                : `${deleting.source.originalName} sera supprimé définitivement.`
              : 'Ce fichier sera supprimé définitivement.'
        }
        confirmLabel={deleting?.kind === 'sheet' ? 'Retirer' : 'Supprimer'}
        confirmVariant="destructive"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
