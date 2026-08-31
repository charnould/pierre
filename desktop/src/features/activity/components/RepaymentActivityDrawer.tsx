import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNavigationHistory } from '@/contexts/NavigationHistoryContext'
import { useNotifications } from '@/features/activity/hooks/use-notifications'
import { RepaymentTenantDrawer } from '@/features/repayment/components/RepaymentTenantDrawer'
import type { TenantRepaymentRow } from '@/features/repayment/lib/classify-tenants'
import { mapLedgerRowToTenantRepaymentRow } from '@/features/repayment/lib/map-ledger-row'
import {
  buildRepaymentAdvancementOperations,
  buildRepaymentAssignmentActivity,
  buildRepaymentTagChangeOperations,
  executeRepaymentAdvancementOperations,
  executeRepaymentTagChangeOperations,
  type RepaymentAdvancementContext,
  type RepaymentMessageOptions
} from '@/features/repayment/lib/repayment-activity-mutations'
import {
  parseRepaymentPlanForm,
  parseRepaymentPlanProposal
} from '@/features/repayment/lib/repayment-activity-text'
import type { RepaymentBucketId } from '@/features/repayment/lib/repayment-bucket'
import { requestRepaymentPlanEditor } from '@/features/repayment/lib/repayment-plan-editor-intent'
import {
  repaymentFallbackDestinataire,
  sendRepaymentMessage
} from '@/features/repayment/lib/send-repayment-message'
import { useRepaymentColumnValues } from '@/features/repayment/lib/use-repayment-table-preferences'
import type { Activite } from '@/shared/types/activites'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'

interface Props {
  url: string | undefined
  userLogin: string
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
export function RepaymentActivityDrawer({
  url,
  userLogin,
  tenantId,
  idClient,
  notificationId,
  sheetOpenToken,
  embedded = true,
  onClose
}: Props) {
  const notifications = useNotifications(url, userLogin, Boolean(url))
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
    async (
      comment: string,
      channel: RepaymentNotificationChannel,
      options?: RepaymentMessageOptions
    ): Promise<boolean> => {
      return sendRepaymentMessage({
        url,
        tenantId,
        comment,
        channel,
        destinataire:
          options?.destinataire?.trim() ?? repaymentFallbackDestinataire(tenant, channel),
        options,
        createActivity: (activity) => notifications.createActivity(activity)
      })
    },
    [notifications, tenant, tenantId, url]
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

  const onCreatePlan = useCallback(
    (row: TenantRepaymentRow) => {
      onClose()
      requestRepaymentPlanEditor({ tenant: row })
      navigate({ tab: 'repayment' })
    },
    [navigate, onClose]
  )

  const onEditPlan = useCallback(
    (row: TenantRepaymentRow, activity: Activite) => {
      const form = parseRepaymentPlanForm(activity)
      if (!form) return
      const display = parseRepaymentPlanProposal(activity)
      onClose()
      requestRepaymentPlanEditor({
        tenant: row,
        activityId: activity.id,
        form,
        comment: display?.note ?? ''
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
      onCreatePlan={onCreatePlan}
      onEditPlan={onEditPlan}
    />
  )
}
