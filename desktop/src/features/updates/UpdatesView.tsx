import { CloudOff, Newspaper } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { UpdateReader } from '@/features/updates/components/UpdateReader'
import { UpdatesList } from '@/features/updates/components/UpdatesList'
import { useUpdates } from '@/features/updates/hooks/useUpdates'
import { resolveUpdatesReadSlugs } from '@/features/updates/lib/updates-notification'
import { Card } from '@/shared/components/ui/card'
import { DeskHandle, DeskPane, DeskShell, DeskSplit } from '@/shared/components/ui/desk-shell'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDebouncedUpdatesPatch } from '@/shared/hooks/useDebouncedUpdatesPatch'
import {
  UPDATES_SPLIT_DEFAULT_LIST,
  defaultUpdatesPanelLayout,
  splitFromUpdatesLayout
} from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'

interface Props {
  hidden: boolean
  readSlugs?: string[]
  legacyLastSeenSlug?: string
  onMarkEntryRead: (slug: string) => void
}

export function UpdatesView({ hidden, readSlugs, legacyLastSeenSlug, onMarkEntryRead }: Props) {
  const { settings, loading: settingsLoading } = useUiSettings()
  const { patch: patchUpdates, cancel: cancelUpdatesPatch } = useDebouncedUpdatesPatch({
    delayMs: 400
  })
  const {
    entries,
    selectedSlug,
    selectedEntry,
    markdown,
    indexState,
    markdownState,
    error,
    selectSlug,
    retry
  } = useUpdates(hidden)

  const savedSplitRef = useRef(settings.updates?.panelSplit)
  useEffect(() => {
    savedSplitRef.current = settings.updates?.panelSplit
  }, [settings.updates?.panelSplit])

  useEffect(() => {
    if (settingsLoading) cancelUpdatesPatch()
  }, [settingsLoading, cancelUpdatesPatch])

  const panelSplit = settings.updates?.panelSplit
  const panelGroupKey = `${panelSplit?.listPercent ?? UPDATES_SPLIT_DEFAULT_LIST}`
  const defaultLayout = defaultUpdatesPanelLayout(panelSplit)

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (settingsLoading) return
      const nextSplit = splitFromUpdatesLayout(layout)
      const prev = savedSplitRef.current
      if (prev?.listPercent === nextSplit.listPercent) return
      savedSplitRef.current = nextSplit
      patchUpdates({ panelSplit: nextSplit })
    },
    [settingsLoading, patchUpdates]
  )

  const indexLoading = indexState === 'loading' || indexState === 'idle'
  const indexError = indexState === 'error'

  const resolvedReadSlugs = useMemo(
    () => resolveUpdatesReadSlugs(entries, readSlugs, legacyLastSeenSlug),
    [entries, readSlugs, legacyLastSeenSlug]
  )

  const handleSelectSlug = useCallback(
    (slug: string) => {
      selectSlug(slug)
      if (resolvedReadSlugs.includes(slug)) return
      onMarkEntryRead(slug)
    },
    [onMarkEntryRead, resolvedReadSlugs, selectSlug]
  )

  return (
    <div
      className={cn(
        'tab-panel relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {indexLoading ? (
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center gap-2 pr-4 pb-3 text-sm">
          <Spinner className="size-4" />
          Chargement des mises à jour…
        </div>
      ) : indexError ? (
        <Empty className="min-h-0 flex-1 pr-4 pb-3">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-danger-soft text-danger-soft-foreground">
              <CloudOff />
            </EmptyMedia>
            <EmptyTitle>Mises à jour indisponibles</EmptyTitle>
            <EmptyDescription>
              {error ?? 'Impossible de charger les mises à jour.'}{' '}
              <button
                type="button"
                className="text-link hover:text-link-foreground focus-visible:outline-link underline underline-offset-[0.25em] focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={retry}
              >
                Réessayer
              </button>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !settingsLoading ? (
        <DeskShell className="min-h-0 flex-1">
          <DeskSplit
            key={panelGroupKey}
            id="updates-view"
            orientation="horizontal"
            defaultLayout={defaultLayout}
            onLayoutChanged={handleLayoutChanged}
          >
            <DeskPane id="list" minSize="24%" maxSize="45%">
              {entries.length === 0 ? (
                <div className="desk-list-panel">
                  <Card variant="chrome">
                    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                      <Empty className="border-0">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Newspaper />
                          </EmptyMedia>
                          <EmptyTitle>Aucune mise à jour</EmptyTitle>
                          <EmptyDescription>
                            Le fichier index.json ne contient pas encore d'article.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  </Card>
                </div>
              ) : (
                <UpdatesList
                  entries={entries}
                  readSlugs={resolvedReadSlugs}
                  selectedSlug={selectedSlug}
                  onSelect={handleSelectSlug}
                />
              )}
            </DeskPane>

            <DeskHandle />

            <DeskPane id="detail" minSize="40%">
              <UpdateReader
                entry={selectedEntry}
                markdown={markdown}
                loading={markdownState === 'loading'}
                error={markdownState === 'error' ? error : null}
              />
            </DeskPane>
          </DeskSplit>
        </DeskShell>
      ) : null}
    </div>
  )
}
