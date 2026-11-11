import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNavigationHistory } from '@/contexts/NavigationHistoryContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { RepaymentTenantDrawer } from '@/features/repayment/components/RepaymentTenantDrawer'
import { requestCaseFileEditor } from '@/features/repayment/lib/case-file-editor-intent'
import type { TenantRepaymentRow } from '@/features/repayment/lib/classify-tenants'
import { mapLedgerRowToTenantRepaymentRow } from '@/features/repayment/lib/map-ledger-row'
import {
  buildRepaymentAdvancementOperations,
  buildRepaymentAssignmentActivity,
  buildRepaymentTagChangeOperations,
  executeRepaymentAdvancementOperations,
  executeRepaymentTagChangeOperations,
  type RepaymentAdvancementContext
} from '@/features/repayment/lib/repayment-activity-mutations'
import { parseRepaymentCaseFile } from '@/features/repayment/lib/repayment-activity-text'
import type { RepaymentBucketId } from '@/features/repayment/lib/repayment-bucket'
import {
  type RepaymentMessageResult,
  sendRepaymentNote
} from '@/features/repayment/lib/send-repayment-message'
import { useRepaymentColumnValues } from '@/features/repayment/lib/use-repayment-table-preferences'
import type { Activity } from '@/shared/types/activities'

import type { ChronologyEntry } from '../lib/case-file-chronology'

interface Props {
  url: string | undefined
  userLogin: string
  notifications: NotificationsApi
  tenantId: string
  idClient?: string | null
  notificationId?: number
  sheetOpenToken: number
  embedded?: boolean
  onClose: () => void
}

async function resolveIdClient(
  url: string | undefined,
  tenantId: string,
  idClient: string | null | undefined
): Promise<string> {
  if (idClient) return idClient
  if (!url || !window.api?.getActivities) return ''
  const res = await window.api.getActivities({ url, contexte: 'repayment', ref: tenantId })
  const fromRow = res?.data?.find((row) => row.id_client)?.id_client
  return fromRow ?? ''
}

/**
 * Contexte repayment depuis le rail notifications — même drawer que le clic ligne table.
 */
export function RepaymentInspector({
  url,
  userLogin,
  notifications,
  tenantId,
  idClient,
  notificationId,
  sheetOpenToken,
  embedded = true,
  onClose
}: Props) {
  const { columnValues } = useRepaymentColumnValues()
  const { navigate } = useNavigationHistory()
  const targetKey = `${url ?? ''}\u0000${tenantId}\u0000${idClient ?? ''}`
  const [resolvedClientState, setResolvedClientState] = useState({
    key: targetKey,
    value: idClient ?? ''
  })
  const resolvedClient =
    resolvedClientState.key === targetKey ? resolvedClientState.value : (idClient ?? '')
  const ledgerKey = `${url ?? ''}\u0000${tenantId}`
  const [ledgerState, setLedgerState] = useState<{
    key: string
    tenant: TenantRepaymentRow | null
    gestionnaireAssignable: boolean
  }>({
    key: ledgerKey,
    tenant: null,
    gestionnaireAssignable: false
  })
  const ledgerTenant = ledgerState.key === ledgerKey ? ledgerState.tenant : null
  const gestionnaireAssignable =
    ledgerState.key === ledgerKey ? ledgerState.gestionnaireAssignable : false

  useEffect(() => {
    let cancelled = false
    void resolveIdClient(url, tenantId, idClient)
      .then((client) => {
        if (!cancelled) setResolvedClientState({ key: targetKey, value: client })
      })
      .catch(() => {
        if (!cancelled) setResolvedClientState({ key: targetKey, value: '' })
      })
    return () => {
      cancelled = true
    }
  }, [url, tenantId, idClient, targetKey])

  useEffect(() => {
    if (!url || !window.api?.getLedger || !tenantId.trim()) return

    let cancelled = false
    void window.api
      .getLedger({ url, limit: 1, filters: { id_locataire: [tenantId.trim()] } })
      .then((res) => {
        if (cancelled) return
        const row = res?.data?.[0]
        setLedgerState({
          key: ledgerKey,
          tenant: row ? mapLedgerRowToTenantRepaymentRow(row) : null,
          gestionnaireAssignable: res?.meta?.gestionnaire_assignable === true
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLedgerState({ key: ledgerKey, tenant: null, gestionnaireAssignable: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, [ledgerKey, tenantId, url])

  const tenant = useMemo((): TenantRepaymentRow => {
    if (ledgerTenant) {
      return {
        ...ledgerTenant,
        id_locataire: tenantId,
        id_client: ledgerTenant.id_client || resolvedClient
      }
    }
    return {
      id_locataire: tenantId,
      id_client: resolvedClient,
      solde_locataire: 0
    }
  }, [ledgerTenant, resolvedClient, tenantId])

  const onAddNote = useCallback(
    async (comment: string): Promise<RepaymentMessageResult> => {
      return sendRepaymentNote({
        tenantId,
        comment,
        createActivity: (activity) => notifications.createActivity(activity)
      })
    },
    [notifications, tenantId]
  )

  const onAdvancementChange = useCallback(
    async (
      bucket: RepaymentBucketId | null,
      comment: string,
      context: RepaymentAdvancementContext
    ): Promise<boolean> => {
      const operations = buildRepaymentAdvancementOperations({
        ref: tenantId,
        bucket,
        comment,
        previousBucket: context.previousBucket
      })
      const { allSucceeded } = await executeRepaymentAdvancementOperations({
        operations,
        createActivity: (activity) => notifications.createActivity(activity)
      })
      return allSucceeded
    },
    [notifications, tenantId]
  )

  const onTagsChange = useCallback(
    async (tags: string[], previousTags: string[], comment?: string): Promise<boolean> => {
      const operations = buildRepaymentTagChangeOperations({
        ref: tenantId,
        tags,
        previousTags,
        comment: comment ?? ''
      })
      if (operations.length === 0) return true
      return executeRepaymentTagChangeOperations({
        operations,
        createActivity: (activity) => notifications.createActivity(activity)
      })
    },
    [notifications, tenantId]
  )

  const onAssignGestionnaire = useCallback(
    async (
      user: { login: string; email: string },
      previousEmail: string | null,
      comment?: string
    ): Promise<boolean> => {
      const activity = buildRepaymentAssignmentActivity(
        tenantId,
        user,
        previousEmail,
        undefined,
        comment
      )
      if (!activity) return false
      const res = await notifications.createActivity(activity)
      return res != null
    },
    [notifications, tenantId]
  )

  const onCreateCaseFile = useCallback(
    (row: TenantRepaymentRow, chronology: ChronologyEntry[]) => {
      onClose()
      requestCaseFileEditor({ tenant: row, chronology })
      navigate({ tab: 'repayment' })
    },
    [navigate, onClose]
  )

  const onEditCaseFile = useCallback(
    (row: TenantRepaymentRow, activity: Activity, chronology: ChronologyEntry[]) => {
      const caseFile = parseRepaymentCaseFile(activity)
      if (!caseFile) return
      onClose()
      requestCaseFileEditor({
        tenant: row,
        activityId: activity.id,
        caseFile,
        chronology
      })
      navigate({ tab: 'repayment' })
    },
    [navigate, onClose]
  )

  return (
    <RepaymentTenantDrawer
      url={url}
      userLogin={userLogin}
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      sheetOpenToken={sheetOpenToken}
      embedded={embedded}
      tenant={tenant}
      columnValues={columnValues}
      highlightActivityId={notificationId}
      onAddNote={onAddNote}
      onAdvancementChange={onAdvancementChange}
      onTagsChange={onTagsChange}
      onAssignGestionnaire={onAssignGestionnaire}
      gestionnaireAssignable={gestionnaireAssignable}
      onCreateCaseFile={onCreateCaseFile}
      onEditCaseFile={onEditCaseFile}
    />
  )
}
