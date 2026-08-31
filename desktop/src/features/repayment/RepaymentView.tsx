import { LoaderCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { CartoonErrorObject } from '@/shared/components/icons/koboyo-empty'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/components/ui/empty'
import { useDatastoreTables } from '@/shared/hooks/useDatastoreTables'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'

import {
  RepaymentPlanWorkspace,
  type PlanClosedPayload,
  type PlanDeletedPayload,
  type PlanSavedPayload
} from './components/create-plan/RepaymentPlanWorkspace'
import { RepaymentBucketTableBlock } from './components/RepaymentBucketTableBlock'
import { RepaymentMissingTableEmpty } from './components/RepaymentMissingTableEmpty'
import { RepaymentTenantDrawer } from './components/RepaymentTenantDrawer'
import type { TenantRepaymentRow } from './lib/classify-tenants'
import { isComptesLocatairesMissing } from './lib/comptes-locataires-table'
import { groupRepaymentRowsByBucket } from './lib/group-repayment-rows-by-bucket'
import { parseRepaymentPlanForm, parseRepaymentPlanProposal } from './lib/repayment-activity-text'
import { REPAYMENT_CREATE_PLAN_CONFIG } from './lib/repayment-create-plan-config'
import {
  subscribeRepaymentPlanEditor,
  type RepaymentPlanEditorRequest
} from './lib/repayment-plan-editor-intent'
import { createExportOnlyPlanEditorRequest } from './lib/repayment-plan-export-only'
import { prefetchRepaymentTimeline } from './lib/repayment-timeline-cache'
import { useRepaymentColumnValues } from './lib/use-repayment-table-preferences'
import { type RepaymentViewDataDeps, useRepaymentViewData } from './lib/use-repayment-view-data'

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
        <EmptyTitle className="text-sm leading-5 font-medium">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

export function RepaymentView({ hidden, url, repaymentDeps }: Props) {
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
  const { tables: datastoreTables, loading: datastoreTablesLoading } = useDatastoreTables(url)
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

  const handleCreatePlan = useCallback(
    (tenant: TenantRepaymentRow) => {
      setSheetOpen(false)
      setPlanEditor({ tenant })
    },
    [setSheetOpen]
  )

  const handleCreateExportOnlyPlan = useCallback(() => {
    setPlanEditor(createExportOnlyPlanEditorRequest())
  }, [])

  const handleEditPlan = useCallback(
    (tenant: TenantRepaymentRow, row: Activite) => {
      const form = parseRepaymentPlanForm(row)
      if (!form) return
      const display = parseRepaymentPlanProposal(row)
      setSheetOpen(false)
      setPlanEditor({
        tenant,
        activityId: row.id,
        form: {
          ...form,
          idLocataire: form.idLocataire.trim() || tenant.id_locataire,
          idClient: form.idClient.trim() || tenant.id_client
        },
        comment: display?.note ?? ''
      })
    },
    [setSheetOpen]
  )

  const handleClosePlan = useCallback(() => {
    setPlanEditor(null)
  }, [])

  const handlePlanSaved = useCallback(
    ({ id_locataire, activityId, signed, applyAdvancement }: PlanSavedPayload) => {
      void (async () => {
        if (applyAdvancement) {
          if (signed) {
            await handleAdvancementChange(REPAYMENT_CREATE_PLAN_CONFIG.signedBucketId, '', {
              id_locataire
            })
          }
        }
        setPlanEditor(null)
        openTenantSheet(id_locataire, { activityId })
      })()
    },
    [handleAdvancementChange, openTenantSheet]
  )

  const handlePlanClosed = useCallback(
    ({ id_locataire, activityId, motif }: PlanClosedPayload) => {
      void (async () => {
        const entry = REPAYMENT_CREATE_PLAN_CONFIG.close[motif]
        await handleAdvancementChange(entry.bucketId, '', { id_locataire })
        setPlanEditor(null)
        openTenantSheet(id_locataire, { activityId })
      })()
    },
    [handleAdvancementChange, openTenantSheet]
  )

  const handlePlanDeleted = useCallback(
    ({ id_locataire }: PlanDeletedPayload) => {
      setPlanEditor(null)
      openTenantSheet(id_locataire)
    },
    [openTenantSheet]
  )

  const bucketSections = useMemo(
    () => groupRepaymentRowsByBucket(allRows, getBucketForRow),
    [allRows, getBucketForRow]
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

  if (planEditor) {
    return (
      <div
        data-tab-panel
        className={cn(
          'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
          hidden ? 'hidden' : 'flex'
        )}
      >
        <RepaymentPlanWorkspace
          key={
            planEditor.exportOnly
              ? `export:${planEditor.tenant.id_client}:${planEditor.tenant.id_locataire}`
              : `${planEditor.activityId ?? 'new'}:${planEditor.tenant.id_locataire}`
          }
          url={url}
          tenant={planEditor.tenant}
          initialForm={planEditor.form}
          existingActivityId={planEditor.activityId}
          initialComment={planEditor.comment}
          exportOnly={planEditor.exportOnly}
          onClose={handleClosePlan}
          onSaved={handlePlanSaved}
          onPlanClosed={handlePlanClosed}
          onPlanDeleted={handlePlanDeleted}
        />
      </div>
    )
  }

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        {datastoreTablesLoading && datastoreTables === null ? (
          <RepaymentBoardStatus icon={LoaderCircle} title="Chargement des soldes…" />
        ) : comptesLocatairesMissing ? (
          <RepaymentMissingTableEmpty onCreatePlan={handleCreateExportOnlyPlan} />
        ) : loading && allRows.length === 0 ? (
          <RepaymentBoardStatus icon={LoaderCircle} title="Chargement des soldes…" />
        ) : error && allRows.length === 0 ? (
          <RepaymentBoardStatus icon={CartoonErrorObject} title={error} />
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
