import { CircleAlert } from 'lucide-react'
import type { ComponentType } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { useDatastoreTables } from '@/shared/hooks/useDatastoreTables'
import { moduleReady, useCustomizationStatus } from '@/shared/lib/instance-customization'
import { cn } from '@/shared/lib/utils'
import type { Activity } from '@/shared/types/activites'

import { RepaymentBucketTableBlock } from './components/RepaymentBucketTableBlock'
import { RepaymentMissingTableEmpty } from './components/RepaymentMissingTableEmpty'
import { RepaymentTenantDrawer } from './components/RepaymentTenantDrawer'
import type { TenantRepaymentRow } from './lib/classify-tenants'
import { isComptesLocatairesMissing } from './lib/comptes-locataires-table'
import { groupRepaymentRowsByBucket } from './lib/group-repayment-rows-by-bucket'
import { parseRepaymentPlanForm } from './lib/repayment-activity-text'
import {
  blankPlanEditorRequest,
  type RepaymentPlanEditorRequest,
  subscribeRepaymentPlanEditor
} from './lib/repayment-plan-editor-intent'
import { prefetchRepaymentTimeline } from './lib/repayment-timeline-cache'
import { useRepaymentColumnValues } from './lib/use-repayment-table-preferences'
import { type RepaymentViewDataDeps, useRepaymentViewData } from './lib/use-repayment-view-data'
import { type PlanSavedPayload, PlanScreen } from './plan/PlanScreen'

interface Props {
  hidden: boolean
  url: string | undefined
  repaymentDeps: RepaymentViewDataDeps
}

function RepaymentBoardStatus({
  icon: Icon,
  title
}: {
  icon: ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <Empty className="min-h-40 flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle size="sm">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

export function RepaymentView({ hidden, url, repaymentDeps }: Props) {
  const customizationStatus = useCustomizationStatus()
  const scrollRef = useRef<HTMLDivElement>(null)
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
    reload
  } = useRepaymentViewData(url, hidden, repaymentDeps)
  const { columnValues, setColumnValues } = useRepaymentColumnValues()
  const { tables: datastoreTables, loading: datastoreTablesLoading } = useDatastoreTables(
    url,
    !hidden
  )
  const comptesLocatairesMissing = isComptesLocatairesMissing(datastoreTables)
  const [planEditor, setPlanEditor] = useState<RepaymentPlanEditorRequest | null>(null)
  const { contextTarget } = useActivityRail()

  const handleRowHover = useCallback(
    (row: TenantRepaymentRow) => {
      if (!url) return
      void prefetchRepaymentTimeline({
        url,
        id_client: row.id_client,
        id_locataire: row.id_locataire
      })
    },
    [url]
  )

  const handleCreateBlankPlan = useCallback(() => {
    setPlanEditor(blankPlanEditorRequest())
  }, [])

  const handleCreatePlan = useCallback(
    (tenant: TenantRepaymentRow) => {
      setSheetOpen(false)
      setPlanEditor({ tenant })
    },
    [setSheetOpen]
  )

  const handleEditPlan = useCallback(
    (tenant: TenantRepaymentRow, row: Activity) => {
      const dossier = parseRepaymentPlanForm(row)
      if (!dossier) return
      setSheetOpen(false)
      setPlanEditor({ tenant, activityId: row.id, dossier })
    },
    [setSheetOpen]
  )

  const handleClosePlan = useCallback(() => {
    setPlanEditor(null)
  }, [])

  const handlePlanSaved = useCallback(
    ({ id_locataire, activityId }: PlanSavedPayload) => {
      setPlanEditor(null)
      openTenantSheet(id_locataire, { activityId })
    },
    [openTenantSheet]
  )

  const bucketSections = useMemo(
    () =>
      customizationStatus === 'ready' && moduleReady('repayment')
        ? groupRepaymentRowsByBucket(allRows, getBucketForRow)
        : [],
    [allRows, getBucketForRow, customizationStatus]
  )

  useEffect(() => {
    if (contextTarget != null) setSheetOpen(false)
  }, [contextTarget, setSheetOpen])

  useEffect(
    () =>
      subscribeRepaymentPlanEditor((request) => {
        setPlanEditor(request)
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

  if (planEditor) {
    return (
      <div
        data-tab-panel
        className={cn(
          'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          hidden ? 'hidden' : 'flex'
        )}
      >
        <PlanScreen
          key={`${planEditor.activityId ?? 'new'}:${planEditor.tenant.id_locataire}`}
          url={url}
          tenant={planEditor.tenant}
          initialDossier={planEditor.dossier}
          existingActivityId={planEditor.activityId}
          onClose={handleClosePlan}
          onSaved={handlePlanSaved}
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
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        {datastoreTablesLoading && datastoreTables === null ? (
          <RepaymentBoardStatus icon={Spinner} title="Chargement des soldes…" />
        ) : comptesLocatairesMissing ? (
          <RepaymentMissingTableEmpty onCreatePlan={handleCreateBlankPlan} />
        ) : loading && allRows.length === 0 ? (
          <RepaymentBoardStatus icon={Spinner} title="Chargement des soldes…" />
        ) : error && allRows.length === 0 ? (
          <RepaymentBoardStatus icon={CircleAlert} title={error} />
        ) : (
          <div
            ref={scrollRef}
            className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6"
          >
            {bucketSections.map((section) => (
              <RepaymentBucketTableBlock
                key={section.bucket}
                bucket={section.bucket}
                bucketRows={section.rows}
                ledgerColumnIds={ledgerColumnIds}
                selectedId={selected?.id_locataire ?? null}
                loading={loading}
                snapshotDate={snapshotDate}
                columnValues={columnValues}
                onColumnValuesChange={setColumnValues}
                onRowClick={handleRowClick}
                onRowHover={handleRowHover}
                getBucket={getBucketForRow}
                getLastAction={getLastAction}
                getRowSignal={getRowSignal}
                onReload={reload}
                scrollRef={scrollRef}
              />
            ))}
          </div>
        )}
      </div>

      <RepaymentTenantDrawer
        url={url}
        userLogin={repaymentDeps.userLogin}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sheetOpenToken={sheetOpenToken}
        tenant={selected}
        columnValues={columnValues}
        highlightActivityId={activityNoteId}
        onAddNote={handleAddNote}
        onAdvancementChange={handleAdvancementChange}
        onTagsChange={handleTagsChange}
        onAssignGestionnaire={handleAssignGestionnaire}
        gestionnaireAssignable={gestionnaireAssignable}
        onCreatePlan={handleCreatePlan}
        onEditPlan={handleEditPlan}
      />
    </div>
  )
}
