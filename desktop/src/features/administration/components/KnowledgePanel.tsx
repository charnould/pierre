import { BookOpen, CircleAlert, ClipboardPen } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { DirectoryList } from '@/shared/components/DirectoryList'
import { Button } from '@/shared/components/ui/button'
import { CardTitle } from '@/shared/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { toast } from '@/shared/components/ui/toast'
import type { KnowledgeSource } from '@/shared/types/knowledge'

import { buildKnowledgeBuckets } from './knowledge-model'
import { KnowledgeRow } from './KnowledgeRow'
import { KnowledgeSourceDialog } from './KnowledgeSourceDialog'
import { KnowledgeToolbar } from './KnowledgeToolbar'
import {
  KnowledgeWorkbookImportDialog,
  type PendingWorkbookSheetImport
} from './KnowledgeWorkbookImportDialog'
import { useKnowledgeCatalog } from './useKnowledgeCatalog'

interface Props {
  url: string
  onBack: () => void
}

function KnowledgeBucketSection({
  title,
  count,
  children
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section>
      <header className="border-border bg-background flex items-baseline gap-2 border-b px-4 py-2">
        <CardTitle className="m-0">{title}</CardTitle>
        <span className="text-muted-foreground text-sm leading-5">·</span>
        <span className="text-muted-foreground text-sm leading-5 tabular-nums">{count}</span>
      </header>
      {children}
    </section>
  )
}

export function KnowledgePanel({ url, onBack }: Props) {
  const catalog = useKnowledgeCatalog(url)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<KnowledgeSource | null>(null)
  const [deleting, setDeleting] = useState<KnowledgeSource | null>(null)
  const [sheetQueue, setSheetQueue] = useState<{
    items: PendingWorkbookSheetImport[]
    index: number
  } | null>(null)

  const buckets = useMemo(
    () =>
      buildKnowledgeBuckets(catalog.data?.sources ?? [], catalog.data?.coreDataTables ?? [], query),
    [catalog.data?.coreDataTables, catalog.data?.sources, query]
  )
  const itemCount =
    buckets.coreData.filter(({ source }) => source !== null).length +
    buckets.intakes.length +
    buckets.other.length
  const buildActive =
    catalog.data?.lastBuild?.status === 'queued' || catalog.data?.lastBuild?.status === 'running'

  async function confirmDelete() {
    if (!deleting) return
    const removed = await catalog.removeSource(deleting)
    if (removed) setDeleting(null)
  }

  async function upload() {
    const outcome = await catalog.upload()
    if (!outcome) return
    if (outcome.pendingSheets.length > 0) {
      setSheetQueue({ items: outcome.pendingSheets, index: 0 })
      return
    }
    if (outcome.immediateChangedSource) {
      setEditing(outcome.immediateChangedSource)
    }
  }

  function advanceSheetQueue() {
    setSheetQueue((current) => {
      if (!current || current.index + 1 >= current.items.length) return null
      return { ...current, index: current.index + 1 }
    })
  }

  async function handleSheetImported(result: { changed: boolean }) {
    await catalog.load()
    toast.add({
      title: result.changed ? 'Onglet importé' : 'Onglet inchangé',
      type: 'success'
    })
    advanceSheetQueue()
  }

  const activeSheet = sheetQueue ? (sheetQueue.items[sheetQueue.index] ?? null) : null
  const rowSharedProps = {
    lastBuild: catalog.data?.lastBuild ?? null,
    needsRebuild: catalog.data?.needsRebuild ?? false,
    profiles: catalog.data?.profiles ?? [],
    onOpen: setEditing,
    onUnassign: (row: KnowledgeSource) => void catalog.unassign(row),
    onDelete: setDeleting
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <KnowledgeToolbar
        query={query}
        lastBuild={catalog.data?.lastBuild ?? null}
        needsRebuild={catalog.data?.needsRebuild ?? false}
        buildActive={buildActive}
        uploading={catalog.uploading}
        onBack={onBack}
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
                <CircleAlert />
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
            <KnowledgeBucketSection title="Core Data HLM" count={buckets.coreData.length}>
              <DirectoryList>
                {buckets.coreData.map(({ contract, source }) => (
                  <KnowledgeRow
                    key={contract.table}
                    source={source}
                    coreData={contract}
                    {...rowSharedProps}
                  />
                ))}
              </DirectoryList>
            </KnowledgeBucketSection>

            <KnowledgeBucketSection title="Collectes" count={buckets.intakes.length}>
              {buckets.intakes.length > 0 ? (
                <DirectoryList>
                  {buckets.intakes.map((source) => (
                    <KnowledgeRow key={source.id} source={source} {...rowSharedProps} />
                  ))}
                </DirectoryList>
              ) : !query.trim() ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardPen />
                    </EmptyMedia>
                    <EmptyTitle>Aucune collecte publiée</EmptyTitle>
                    <EmptyDescription>
                      Activez « Rejoindre l’encyclopédie » sur une collecte publiée pour la voir
                      apparaître ici.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </KnowledgeBucketSection>

            <KnowledgeBucketSection title="Autres sources" count={buckets.other.length}>
              {buckets.other.length > 0 ? (
                <DirectoryList>
                  {buckets.other.map((source) => (
                    <KnowledgeRow key={source.id} source={source} {...rowSharedProps} />
                  ))}
                </DirectoryList>
              ) : itemCount === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpen />
                    </EmptyMedia>
                    <EmptyTitle>Aucune autre source</EmptyTitle>
                    <EmptyDescription>
                      Ajoutez les premiers documents de cette organisation.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </KnowledgeBucketSection>
          </div>
        )}
      </div>

      {editing && catalog.data ? (
        <KnowledgeSourceDialog
          key={editing.id}
          url={url}
          source={editing}
          profiles={catalog.data.profiles}
          onClose={() => setEditing(null)}
          onSaved={catalog.replaceSource}
        />
      ) : null}

      {activeSheet && sheetQueue ? (
        <KnowledgeWorkbookImportDialog
          key={`${activeSheet.filePath}:${activeSheet.sheet.name}:${sheetQueue.index}`}
          url={url}
          pending={activeSheet}
          position={sheetQueue.index + 1}
          total={sheetQueue.items.length}
          onSkip={advanceSheetQueue}
          onCancel={() => setSheetQueue(null)}
          onImported={(result) => void handleSheetImported(result)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={deleting?.fileType === 'xlsx' ? 'Retirer l’onglet' : 'Supprimer le fichier'}
        description={
          deleting?.fileType === 'xlsx'
            ? `L’onglet ${deleting.sheetName ?? deleting.title} de ${deleting.originalName} sera retiré de l’encyclopédie.`
            : deleting
              ? `${deleting.originalName} sera supprimé définitivement.`
              : 'Ce fichier sera supprimé définitivement.'
        }
        confirmLabel={deleting?.fileType === 'xlsx' ? 'Retirer' : 'Supprimer'}
        confirmVariant="destructive"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
