import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { LedgerListResponse } from '@/shared/types/ledger'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'

import type { TenantRepaymentRow } from './classify-tenants'
import { mapLedgerRowToTenantRepaymentRow } from './map-ledger-row'
import { isRepaymentActionId } from './repayment-action'
import {
  buildRepaymentAdvancementOperations,
  buildRepaymentAssignmentActivity,
  buildRepaymentTagChangeOperations,
  executeRepaymentAdvancementOperations,
  executeRepaymentTagChangeOperations,
  resolveAdvancementTenant,
  type RepaymentAdvancementContext,
  type RepaymentMessageOptions
} from './repayment-activity-mutations'
import type { RepaymentBucketId } from './repayment-bucket'
import { isDepartedTenantRow, resolveBucketForTenantRow } from './repayment-bucket'
import type { TenantLastAction } from './repayment-last-action'
import { ledgerColumnIdsFromMeta } from './repayment-table-columns'
import { repaymentFallbackDestinataire, sendRepaymentMessage } from './send-repayment-message'
import { useRepaymentTenantBucket } from './use-repayment-tenant-bucket'

const LEDGER_FETCH_LIMIT = 10_000
const EMPTY_TENANT_ROWS: TenantRepaymentRow[] = []

type LedgerSnapshot = {
  key: string
  rows: TenantRepaymentRow[]
  ledgerColumnIds: string[]
  snapshotDate: string
  gestionnaireAssignable: boolean
  error: string | null
}

function emptyLedgerSnapshot(key: string, error: string | null = null): LedgerSnapshot {
  return {
    key,
    rows: [],
    ledgerColumnIds: ledgerColumnIdsFromMeta(undefined),
    snapshotDate: '',
    gestionnaireAssignable: false,
    error
  }
}

function snapshotFromLedgerResponse(key: string, res: LedgerListResponse): LedgerSnapshot {
  return {
    key,
    rows: res.data.map(mapLedgerRowToTenantRepaymentRow),
    ledgerColumnIds: ledgerColumnIdsFromMeta(res.meta.columns),
    snapshotDate: res.meta.snapshot_date ?? '',
    gestionnaireAssignable: res.meta.gestionnaire_assignable === true,
    error: null
  }
}

export type RepaymentViewDataDeps = {
  notifications: NotificationsApi
  userLogin: string
}

type RepaymentAdvancementChangeOptions = Partial<RepaymentAdvancementContext>

export function useRepaymentViewData(
  url: string | undefined,
  hidden: boolean,
  deps: RepaymentViewDataDeps
) {
  const [selection, setSelection] = useState<{ tenantId: string; url: string } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activityNoteId, setActivityNoteId] = useState<number | undefined>()
  const [sheetOpenToken, setSheetOpenToken] = useState(0)
  const [snapshot, setSnapshot] = useState<LedgerSnapshot>(() => emptyLedgerSnapshot(''))
  const [refreshing, setRefreshing] = useState(false)
  const ledgerRequestIdRef = useRef(0)
  const ledgerKey = url ?? ''

  const apiRows = snapshot.key === ledgerKey ? snapshot.rows : EMPTY_TENANT_ROWS
  const ledgerColumnIds =
    snapshot.key === ledgerKey ? snapshot.ledgerColumnIds : ledgerColumnIdsFromMeta(undefined)
  const snapshotDate = snapshot.key === ledgerKey ? snapshot.snapshotDate : ''
  const gestionnaireAssignable =
    snapshot.key === ledgerKey ? snapshot.gestionnaireAssignable : false
  const error = snapshot.key === ledgerKey ? snapshot.error : null
  const loading = Boolean(url) && !hidden && (snapshot.key !== ledgerKey || refreshing)

  const { clearBucket, getBucket, setBucket } = useRepaymentTenantBucket(apiRows)

  const loadLedger = useCallback(async (): Promise<boolean> => {
    const requestId = ++ledgerRequestIdRef.current
    if (!url || !window.api?.getLedger) return false

    setRefreshing(true)

    try {
      const res = await window.api.getLedger({ url, limit: LEDGER_FETCH_LIMIT })
      if (requestId !== ledgerRequestIdRef.current) return false
      if (!res || !Array.isArray(res.data)) {
        throw new Error('missing_ledger')
      }
      setSnapshot(snapshotFromLedgerResponse(url, res))
      return true
    } catch (err) {
      if (requestId !== ledgerRequestIdRef.current) return false
      warnRenderer('useRepaymentViewData.loadLedger', err)
      setSnapshot(emptyLedgerSnapshot(url, 'Impossible de charger les soldes locataires.'))
      return false
    } finally {
      if (requestId === ledgerRequestIdRef.current) setRefreshing(false)
    }
  }, [url])

  useEffect(() => {
    if (hidden || !url || !window.api?.getLedger) return
    const requestId = ++ledgerRequestIdRef.current
    const capturedUrl = url
    void window.api
      .getLedger({ url: capturedUrl, limit: LEDGER_FETCH_LIMIT })
      .then((res) => {
        if (requestId !== ledgerRequestIdRef.current) return
        if (!res || !Array.isArray(res.data)) {
          throw new Error('missing_ledger')
        }
        setSnapshot(snapshotFromLedgerResponse(capturedUrl, res))
      })
      .catch((err) => {
        if (requestId !== ledgerRequestIdRef.current) return
        warnRenderer('useRepaymentViewData.loadLedger', err)
        setSnapshot(
          emptyLedgerSnapshot(capturedUrl, 'Impossible de charger les soldes locataires.')
        )
      })
    return () => {
      ledgerRequestIdRef.current += 1
    }
  }, [hidden, url])

  const reload = useCallback(() => {
    void loadLedger()
  }, [loadLedger])

  const allRows = apiRows
  const selected = useMemo(() => {
    if (!selection || selection.url !== url) return null
    return allRows.find((row) => row.id_locataire === selection.tenantId) ?? null
  }, [allRows, selection, url])

  const getBucketForRow = useCallback(
    (row: TenantRepaymentRow) => resolveBucketForTenantRow(row, getBucket(row.id_locataire)),
    [getBucket]
  )

  const getLastAction = useCallback((row: TenantRepaymentRow): TenantLastAction | null => {
    const action = row['derniere_action_realisee']
    const date = row['date_derniere_action_realisee']
    if (
      typeof action !== 'string' ||
      !isRepaymentActionId(action) ||
      typeof date !== 'string' ||
      !date
    )
      return null
    return { action, date }
  }, [])

  const getRowSignal = useCallback(
    (row: TenantRepaymentRow) => ({
      hasUnread: deps.notifications.hasUnreadFor('repayment', row.id_locataire)
    }),
    [deps.notifications]
  )

  const openTenantSheet = useCallback(
    (tenantId: string, options?: { activityId?: number; markRead?: boolean }) => {
      const row = allRows.find((entry) => entry.id_locataire === tenantId)
      if (!row) return

      if (options?.markRead !== false) {
        void deps.notifications.markAllReadForRef('repayment', tenantId)
      }

      if (!url) return
      setSelection({ tenantId: row.id_locataire, url })
      setSheetOpen(true)
      setActivityNoteId(options?.activityId)
      setSheetOpenToken((token) => token + 1)
    },
    [allRows, deps.notifications, url]
  )

  const handleAddNote = useCallback(
    async (
      comment: string,
      channel: RepaymentNotificationChannel,
      options?: RepaymentMessageOptions
    ): Promise<boolean> => {
      if (!selected) return false
      return sendRepaymentMessage({
        url,
        tenantId: selected.id_locataire,
        comment,
        channel,
        destinataire:
          options?.destinataire?.trim() ?? repaymentFallbackDestinataire(selected, channel),
        options,
        createActivity: (activity) => deps.notifications.createActivity(activity)
      })
    },
    [selected, deps.notifications, url]
  )

  const handleAssignGestionnaire = useCallback(
    async (
      user: { login: string; email: string },
      previousEmail: string | null,
      comment?: string
    ): Promise<boolean> => {
      if (!selected) return false
      const activity = buildRepaymentAssignmentActivity(
        selected.id_locataire,
        user,
        previousEmail,
        'manual',
        comment
      )
      if (!activity) return false
      const res = await deps.notifications.createActivity(activity)
      if (res) void loadLedger()
      return res != null
    },
    [selected, deps.notifications, loadLedger]
  )

  const handleAdvancementChange = useCallback(
    async (
      bucket: RepaymentBucketId | null,
      comment: string,
      options?: RepaymentAdvancementChangeOptions
    ): Promise<boolean> => {
      const target = resolveAdvancementTenant(allRows, selected, options?.id_locataire)
      if (!target) return false

      const currentBucket =
        options?.previousBucket !== undefined
          ? options.previousBucket
          : target.row
            ? getBucketForRow(target.row)
            : null
      const nextBucket = target.row && isDepartedTenantRow(target.row) ? null : bucket
      const operations = buildRepaymentAdvancementOperations({
        ref: target.id_locataire,
        bucket: nextBucket,
        comment,
        previousBucket: currentBucket
      })
      if (operations.length === 0) return true

      const { allSucceeded, anySucceeded } = await executeRepaymentAdvancementOperations({
        operations,
        createActivity: (activity) => deps.notifications.createActivity(activity),
        onBucketStart:
          nextBucket != null ? () => setBucket(target.id_locataire, nextBucket) : undefined,
        onBucketFail:
          nextBucket != null ? () => clearBucket(target.id_locataire, nextBucket) : undefined,
        onError: (err) => warnRenderer('useRepaymentViewData.handleAdvancementChange', err)
      })

      if (anySucceeded) await loadLedger()
      return allSucceeded
    },
    [allRows, selected, getBucketForRow, setBucket, deps.notifications, loadLedger, clearBucket]
  )

  const handleTagsChange = useCallback(
    async (tags: string[], previousTags: string[], comment?: string): Promise<boolean> => {
      if (!selected) return false
      const operations = buildRepaymentTagChangeOperations({
        ref: selected.id_locataire,
        tags,
        previousTags,
        comment: comment ?? ''
      })
      if (operations.length === 0) return true
      return executeRepaymentTagChangeOperations({
        operations,
        createActivity: (activity) => deps.notifications.createActivity(activity)
      })
    },
    [selected, deps.notifications]
  )

  const handleRowClick = useCallback(
    (row: TenantRepaymentRow) => {
      openTenantSheet(row.id_locataire)
    },
    [openTenantSheet]
  )

  const activityTarget = useMemo(() => {
    if (!sheetOpen || !selected) return undefined
    return {
      view: 'repayment' as const,
      tenantId: selected.id_locataire,
      activityId: activityNoteId
    }
  }, [activityNoteId, selected, sheetOpen])

  if (selection !== null && selection.url !== url) {
    setSelection(null)
    setSheetOpen(false)
    setActivityNoteId(undefined)
  }

  return {
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
  }
}
