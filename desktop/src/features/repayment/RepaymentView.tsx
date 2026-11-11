import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { BoardSelectionProvider } from '@/shared/components/board/board-selection'
import {
  BoardCanvas,
  BoardRefreshButton,
  BoardSelectionToolbar,
  BoardStatusLine
} from '@/shared/components/board/board-surface'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { Button } from '@/shared/components/ui/button'
import { toast } from '@/shared/components/ui/toast'
import { useDatastoreTables } from '@/shared/hooks/useDatastoreTables'
import { moduleReady, useCustomizationStatus } from '@/shared/lib/instance-customization'
import { cn } from '@/shared/lib/utils'
import type { Activity } from '@/shared/types/activities'

import { type CaseFileSavedPayload, CaseFileScreen } from './case-file/case-file-screen'
import { RepaymentBucketTableBlock } from './components/RepaymentBucketTableBlock'
import { RepaymentBulkActionDialog } from './components/RepaymentBulkActionDialog'
import { RepaymentMissingTableEmpty } from './components/RepaymentMissingTableEmpty'
import { RepaymentTenantDrawer } from './components/RepaymentTenantDrawer'
import { useRepaymentBulkActions } from './hooks/use-repayment-bulk-actions'
import type { ChronologyEntry } from './lib/case-file-chronology'
import {
  blankCaseFileEditorRequest,
  type CaseFileEditorRequest,
  subscribeCaseFileEditor
} from './lib/case-file-editor-intent'
import type { TenantRepaymentRow } from './lib/classify-tenants'
import { isComptesLocatairesMissing } from './lib/comptes-locataires-table'
import { groupRepaymentRowsByBucket } from './lib/group-repayment-rows-by-bucket'
import { parseRepaymentCaseFile } from './lib/repayment-activity-text'
import type { RepaymentBulkAction } from './lib/repayment-bulk-action'
import { prefetchRepaymentTimeline } from './lib/repayment-timeline-cache'
import { useRepaymentColumnValues } from './lib/use-repayment-table-preferences'
import { type RepaymentViewDataDeps, useRepaymentViewData } from './lib/use-repayment-view-data'

interface Props {
  hidden: boolean
  url: string | undefined
  repaymentDeps: RepaymentViewDataDeps
}

function RepaymentBoardStatus({
  title,
  loading,
  onReload,
  alert = false
}: {
  title: string
  loading: boolean
  onReload: () => void
  alert?: boolean
}) {
  return (
    <BoardCanvas toolbar={<BoardRefreshButton loading={loading} onRefresh={onReload} />}>
      {() => <BoardStatusLine alert={alert}>{title}</BoardStatusLine>}
    </BoardCanvas>
  )
}

export function RepaymentView({ hidden, url, repaymentDeps }: Props) {
  const customizationStatus = useCustomizationStatus()
  const {
    snapshotDate,
    gestionnaireAssignable,
    ledgerColumnIds,
    allRows,
    loading,
    error,
    selected,
    sheetOpen,
    setSheetOpen,
    sheetOpenToken,
    getBucketForRow,
    setBucket,
    clearBucket,
    getLastAction,
    getRowSignal,
    handleAddNote,
    handleAssignGestionnaire,
    handleAdvancementChange,
    handleTagsChange,
    handleRowClick,
    openTenantSheet,
    activityTarget,
    activityNoteId,
    composeMode,
    reload
  } = useRepaymentViewData(url, hidden, repaymentDeps)
  const { columnValues, setColumnValues } = useRepaymentColumnValues()
  const { tables: datastoreTables, loading: datastoreTablesLoading } = useDatastoreTables(
    url,
    !hidden
  )
  const comptesLocatairesMissing = isComptesLocatairesMissing(datastoreTables)
  const [caseFileEditor, setCaseFileEditor] = useState<CaseFileEditorRequest | null>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const { contextTarget } = useActivityRail()

  useEffect(
    () => () => {
      if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current)
    },
    []
  )

  const handleRowHover = useCallback(
    (row: TenantRepaymentRow) => {
      if (!url) return
      if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = window.setTimeout(() => {
        hoverTimerRef.current = null
        void prefetchRepaymentTimeline({
          url,
          id_client: row.id_client,
          id_locataire: row.id_locataire
        })
      }, 120)
    },
    [url]
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [seenUrl, setSeenUrl] = useState(url)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [timelineRefreshToken, setTimelineRefreshToken] = useState(0)
  if (url !== seenUrl) {
    setSeenUrl(url)
    setSelectedIds(new Set())
    setBulkOpen(false)
  }
  const checkedIds = useMemo(() => {
    if (selectedIds.size === 0) return selectedIds
    const live = new Set(allRows.map((row) => row.id_locataire))
    let changed = false
    const next = new Set<string>()
    for (const id of selectedIds) {
      if (live.has(id)) next.add(id)
      else changed = true
    }
    return changed ? next : selectedIds
  }, [allRows, selectedIds])
  const bulk = useRepaymentBulkActions({
    url,
    userLogin: repaymentDeps.userLogin,
    rows: allRows,
    getBucket: getBucketForRow,
    setBucket,
    clearBucket,
    refreshNotifications: () => repaymentDeps.notifications.refresh(),
    reloadLedger: reload,
    onInspectorRefresh: () => setTimelineRefreshToken((token) => token + 1)
  })

  const toggleChecked = useCallback((id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const submitBulk = useCallback(
    async (action: RepaymentBulkAction) => {
      const result = await bulk.run([...checkedIds], action)
      setSelectedIds(new Set(result.failed))
      setBulkOpen(false)
      const done = result.succeeded.length
      const missed = result.failed.length
      if (result.stopped) {
        toast.add({
          title:
            done === 0
              ? 'Action interrompue'
              : `Interrompu après ${done} dossier${done > 1 ? 's' : ''}`,
          type: 'error'
        })
        return
      }
      if (missed === 0) {
        toast.add({
          title: `${done} dossier${done > 1 ? 's' : ''} traité${done > 1 ? 's' : ''}`,
          type: 'success'
        })
        return
      }
      toast.add({
        title:
          done === 0
            ? `${missed} dossier${missed > 1 ? 's' : ''} en échec`
            : `${done} traité${done > 1 ? 's' : ''}, ${missed} en échec`,
        type: 'error'
      })
    },
    [bulk, checkedIds]
  )

  const handleCreateBlankCaseFile = useCallback(() => {
    setCaseFileEditor(blankCaseFileEditorRequest())
  }, [])

  const handleCreateCaseFile = useCallback(
    (tenant: TenantRepaymentRow, chronology: ChronologyEntry[]) => {
      setSheetOpen(false)
      setCaseFileEditor({ tenant, chronology })
    },
    [setSheetOpen]
  )

  const handleEditCaseFile = useCallback(
    (tenant: TenantRepaymentRow, row: Activity, chronology: ChronologyEntry[]) => {
      const caseFile = parseRepaymentCaseFile(row)
      if (!caseFile) return
      setSheetOpen(false)
      setCaseFileEditor({ tenant, activityId: row.id, caseFile, chronology })
    },
    [setSheetOpen]
  )

  const handleCloseCaseFile = useCallback(() => {
    setCaseFileEditor(null)
  }, [])

  const handleCaseFileSaved = useCallback(
    ({ tenant, activityId, composeMode: nextComposeMode }: CaseFileSavedPayload) => {
      setCaseFileEditor(null)
      openTenantSheet(tenant.id_locataire, {
        activityId,
        fallbackTenant: tenant,
        composeMode: nextComposeMode
      })
      void reload()
    },
    [openTenantSheet, reload]
  )

  const bucketSections = useMemo(
    () =>
      customizationStatus === 'ready' && moduleReady('repayment')
        ? groupRepaymentRowsByBucket(allRows, getBucketForRow)
        : [],
    [allRows, getBucketForRow, customizationStatus]
  )
  const selection = useMemo(
    () => ({
      checkedIds,
      disabled: bulk.running,
      onCheckedChange: toggleChecked
    }),
    [bulk.running, checkedIds, toggleChecked]
  )

  useEffect(() => {
    if (contextTarget != null) setSheetOpen(false)
  }, [contextTarget, setSheetOpen])

  useEffect(
    () =>
      subscribeCaseFileEditor((request) => {
        setCaseFileEditor(request)
      }),
    []
  )

  useRegisterNavigationHandlers('repayment', {
    getSnapshot: () => ({ activityTarget }),
    applySnapshot: (snapshot) => {
      const target = snapshot.activityTarget
      if (target?.view !== 'repayment') return
      openTenantSheet(target.tenantId, {
        activityId: target.activityId
      })
    }
  })

  if (customizationStatus !== 'ready' || !moduleReady('repayment')) {
    return (
      <div
        data-tab-panel
        className={cn(
          'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          hidden ? 'hidden' : 'flex'
        )}
      >
        <ModuleGate entry="repayment">{null}</ModuleGate>
      </div>
    )
  }

  if (caseFileEditor) {
    return (
      <div
        data-tab-panel
        className={cn(
          'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          hidden ? 'hidden' : 'flex'
        )}
      >
        <CaseFileScreen
          key={`${caseFileEditor.activityId ?? 'new'}:${caseFileEditor.tenant.id_locataire}`}
          url={url}
          tenant={caseFileEditor.tenant}
          initialCaseFile={caseFileEditor.caseFile}
          initialChronology={caseFileEditor.chronology}
          columnValues={columnValues}
          existingActivityId={caseFileEditor.activityId}
          onClose={handleCloseCaseFile}
          onSaved={handleCaseFileSaved}
        />
      </div>
    )
  }

  return (
    <div
      data-tab-panel
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {datastoreTablesLoading && datastoreTables === null ? (
        <RepaymentBoardStatus title="Chargement des soldes…" loading onReload={reload} />
      ) : comptesLocatairesMissing && !loading && allRows.length === 0 ? (
        <RepaymentMissingTableEmpty onCreateCaseFile={handleCreateBlankCaseFile} />
      ) : loading && allRows.length === 0 ? (
        <RepaymentBoardStatus title="Chargement des soldes…" loading onReload={reload} />
      ) : error && allRows.length === 0 ? (
        <RepaymentBoardStatus title={error} loading={false} onReload={reload} alert />
      ) : (
        <BoardSelectionProvider value={selection}>
          <BoardCanvas
            toolbar={
              checkedIds.size > 0 ? (
                <BoardSelectionToolbar
                  count={checkedIds.size}
                  noun="dossier"
                  disabled={bulk.running}
                  onClear={() => setSelectedIds(new Set())}
                  onAct={() => setBulkOpen(true)}
                />
              ) : (
                <BoardRefreshButton loading={loading} onRefresh={reload}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateBlankCaseFile}
                  >
                    <Plus data-icon="inline-start" />
                    Créer un dossier
                  </Button>
                </BoardRefreshButton>
              )
            }
          >
            {(scrollRef) =>
              hidden
                ? null
                : bucketSections.map((section) => (
                    <RepaymentBucketTableBlock
                      key={section.bucket}
                      bucket={section.bucket}
                      bucketRows={section.rows}
                      ledgerColumnIds={ledgerColumnIds}
                      selectedId={selected?.id_locataire ?? null}
                      snapshotDate={snapshotDate}
                      columnValues={columnValues}
                      onColumnValuesChange={setColumnValues}
                      onRowClick={handleRowClick}
                      onRowHover={handleRowHover}
                      getBucket={getBucketForRow}
                      getLastAction={getLastAction}
                      getRowSignal={getRowSignal}
                      scrollRef={scrollRef}
                    />
                  ))
            }
          </BoardCanvas>
        </BoardSelectionProvider>
      )}

      <RepaymentTenantDrawer
        url={url}
        userLogin={repaymentDeps.userLogin}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sheetOpenToken={sheetOpenToken}
        timelineRefreshToken={timelineRefreshToken}
        tenant={selected}
        columnValues={columnValues}
        highlightActivityId={activityNoteId}
        initialComposeMode={composeMode}
        onAddNote={handleAddNote}
        onAdvancementChange={handleAdvancementChange}
        onTagsChange={handleTagsChange}
        onAssignGestionnaire={handleAssignGestionnaire}
        gestionnaireAssignable={gestionnaireAssignable}
        onCreateCaseFile={handleCreateCaseFile}
        onEditCaseFile={handleEditCaseFile}
      />
      <RepaymentBulkActionDialog
        open={bulkOpen}
        count={checkedIds.size}
        progress={bulk.progress}
        onClose={() => setBulkOpen(false)}
        onStop={bulk.stop}
        onSubmit={submitBulk}
      />
    </div>
  )
}
