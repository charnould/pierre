import { useCallback, useEffect, useRef, useState } from 'react'

import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import { toast } from '@/shared/components/ui/toast'
import type { Activite } from '@/shared/types/activites'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { parseEmlFile } from '../lib/parse-eml'
import {
  buildRepaymentActionActivity,
  type RepaymentActionDraft
} from '../lib/repayment-action-activity'
import { buildRepaymentEmailImportActivity } from '../lib/repayment-activity-mutations'
import type { TimelineRefreshResult } from './use-repayment-tenant-timeline'

export type RepaymentSubmissionKind =
  | 'note'
  | 'advancement'
  | 'action'
  | 'assignment'
  | 'email'
  | 'rcs'
  | 'eml'
  | 'tags'

export type RepaymentDeleteTarget = {
  tenantKey: string
  activityId: number
}

function tenantKeyOf(tenant: TenantRepaymentRow | null): string | null {
  if (!tenant) return null
  return `${tenant.id_client}\0${tenant.id_locataire}`
}

const STALE_HISTORY_TOAST = 'Enregistré, actualisation de l’historique en attente'

export function useRepaymentTenantActions(params: {
  url: string | undefined
  tenant: TenantRepaymentRow | null
  userLogin: string
  refreshTimeline: (options?: { force?: boolean }) => Promise<TimelineRefreshResult>
  applyActivityPatch: (activity: Activite) => void
}) {
  const { url, tenant, userLogin, refreshTimeline, applyActivityPatch } = params
  const tenantKey = tenantKeyOf(tenant)
  const [submitting, setSubmitting] = useState<RepaymentSubmissionKind | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RepaymentDeleteTarget | null>(null)
  const [deletingNote, setDeletingNote] = useState(false)
  const submissionRef = useRef<RepaymentSubmissionKind | null>(null)
  const tenantGenerationRef = useRef(0)
  const [seenTenantKey, setSeenTenantKey] = useState(tenantKey)
  if (tenantKey !== seenTenantKey) {
    setSeenTenantKey(tenantKey)
    setSubmitting(null)
    setDeleteTarget(null)
    setDeletingNote(false)
  }
  useEffect(() => {
    tenantGenerationRef.current += 1
    submissionRef.current = null
  }, [tenantKey])

  const revalidateTimeline = useCallback(async (): Promise<TimelineRefreshResult> => {
    return refreshTimeline({ force: true })
  }, [refreshTimeline])

  const afterSuccessfulWrite = useCallback(
    async (isCurrent: () => boolean): Promise<boolean> => {
      const result = await revalidateTimeline()
      if (!isCurrent()) return true
      if (result.ok) return true
      toast.add({ title: STALE_HISTORY_TOAST, type: 'info' })
      void revalidateTimeline()
      return true
    },
    [revalidateTimeline]
  )

  const runSubmission = useCallback(
    async (
      kind: RepaymentSubmissionKind,
      task: (isCurrent: () => boolean) => Promise<boolean>
    ): Promise<boolean | null> => {
      if (submissionRef.current) return null
      const generation = tenantGenerationRef.current
      const isCurrent = () => generation === tenantGenerationRef.current
      submissionRef.current = kind
      setSubmitting(kind)
      try {
        const ok = await task(isCurrent)
        return isCurrent() ? ok : null
      } catch {
        if (isCurrent()) {
          toast.add({ title: 'Impossible d’enregistrer la modification', type: 'error' })
        }
        return isCurrent() ? false : null
      } finally {
        if (isCurrent()) {
          submissionRef.current = null
          setSubmitting(null)
        }
      }
    },
    []
  )

  const handleEditNote = useCallback(
    async (id: number, contenu: string): Promise<boolean> => {
      if (!url || !window.api?.patchActivity) {
        toast.add({ title: "La note n'a pas pu être modifiée", type: 'error' })
        return false
      }
      const response = await window.api.patchActivity({
        url,
        id,
        patch: {
          operation: 'edit_content',
          contenu: JSON.stringify({ version: 1, note: contenu })
        }
      })
      if (!response?.data?.id) {
        toast.add({ title: "La note n'a pas pu être modifiée", type: 'error' })
        return false
      }
      applyActivityPatch(response.data)
      toast.add({ title: 'Note modifiée', type: 'success' })
      return true
    },
    [applyActivityPatch, url]
  )

  const handleRequestDeleteNote = useCallback(
    (id: number) => {
      if (!tenantKey) return
      setDeleteTarget({ tenantKey, activityId: id })
    },
    [tenantKey]
  )

  const handleConfirmDeleteNote = useCallback(async () => {
    if (!url || !deleteTarget || !window.api?.deleteActivity) {
      toast.add({ title: "L'activité n'a pas pu être supprimée", type: 'error' })
      return
    }
    if (deleteTarget.tenantKey !== tenantKey) return
    const target = deleteTarget
    setDeletingNote(true)
    try {
      const response = await window.api.deleteActivity({ url, id: target.activityId })
      if (!response) {
        toast.add({ title: "L'activité n'a pas pu être supprimée", type: 'error' })
        return
      }
      if (tenantKeyOf(tenant) !== target.tenantKey) return
      await afterSuccessfulWrite(() => tenantKeyOf(tenant) === target.tenantKey)
      toast.add({ title: 'Activité supprimée', type: 'success' })
      setDeleteTarget(null)
    } finally {
      if (tenantKeyOf(tenant) === target.tenantKey) setDeletingNote(false)
    }
  }, [afterSuccessfulWrite, deleteTarget, tenant, tenantKey, url])

  const handleBoost = useCallback(
    async (id: number, emoji: ActivityBoostEmoji | null) => {
      if (!url || !window.api?.patchActivity) {
        toast.add({ title: 'Impossible d’enregistrer le boost', type: 'error' })
        return
      }
      const response = await window.api.patchActivity({
        url,
        id,
        patch: { operation: 'set_boost', emoji }
      })
      if (!response?.data?.id) {
        toast.add({ title: 'Impossible d’enregistrer le boost', type: 'error' })
        return
      }
      applyActivityPatch(response.data)
    },
    [applyActivityPatch, url]
  )

  const handleSubmitAction = useCallback(
    async (draft: RepaymentActionDraft): Promise<boolean> => {
      if (!url || !tenant || !window.api?.createActivity) return false
      const result = await runSubmission('action', async (isCurrent) => {
        const activity = buildRepaymentActionActivity(
          tenant.id_locataire,
          draft,
          `user:${userLogin}`
        )
        const response = await window.api.createActivity({ url, ...activity })
        if (!response?.data?.id) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({
          title: draft.mode === 'planifier' ? 'Action planifiée' : 'Action enregistrée',
          type: 'success'
        })
        return true
      })
      return result === true
    },
    [afterSuccessfulWrite, runSubmission, tenant, url, userLogin]
  )

  const patchAction = useCallback(
    (id: number, operation: 'complete_action' | 'ignore_action', detail: string) => {
      if (!url || !tenant || !window.api?.patchActivity) return
      void runSubmission('action', async (isCurrent) => {
        const response = await window.api.patchActivity({
          url,
          id,
          patch:
            operation === 'complete_action'
              ? {
                  operation,
                  ...(detail.trim() ? { resultat: detail.trim() } : {})
                }
              : {
                  operation,
                  ...(detail.trim() ? { motif: detail.trim() } : {})
                }
        })
        if (!response?.data?.id) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({
          title: operation === 'complete_action' ? 'Action réalisée' : 'Action ignorée',
          type: 'success'
        })
        return true
      })
    },
    [afterSuccessfulWrite, runSubmission, tenant, url]
  )

  const handleReopenAction = useCallback(
    (id: number, assigneA: string, dateEcheance: string) => {
      if (!url || !tenant || !window.api?.patchActivity) return
      void runSubmission('action', async (isCurrent) => {
        const response = await window.api.patchActivity({
          url,
          id,
          patch: {
            operation: 'reopen_action',
            assigne_a: assigneA,
            date_echeance: dateEcheance
          }
        })
        if (!response?.data?.id) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({ title: 'Tâche rouverte', type: 'success' })
        return true
      })
    },
    [afterSuccessfulWrite, runSubmission, tenant, url]
  )

  const handleImportEml = useCallback(
    (file: File) => {
      if (!url || !tenant || !window.api?.createActivity) return
      void runSubmission('eml', async (isCurrent) => {
        const parsed = await parseEmlFile(file)
        const activity = parsed
          ? buildRepaymentEmailImportActivity(tenant.id_locataire, parsed)
          : null
        if (!activity) {
          if (isCurrent()) toast.add({ title: 'Fichier .eml illisible', type: 'error' })
          return false
        }
        const response = await window.api.createActivity({ url, ...activity })
        if (!response?.data?.id) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({ title: 'Courriel importé', type: 'success' })
        return true
      })
    },
    [afterSuccessfulWrite, runSubmission, tenant, url]
  )

  const handleEditAction = useCallback(
    (
      id: number,
      values: { action: string; assigneA: string; dateEcheance: string; note: string }
    ) => {
      if (!url || !tenant || !window.api?.patchActivity) return
      void runSubmission('action', async (isCurrent) => {
        const response = await window.api.patchActivity({
          url,
          id,
          patch: {
            operation: 'update_action',
            action: values.action,
            assigne_a: values.assigneA,
            date_echeance: values.dateEcheance,
            ...(values.note.trim() ? { note: values.note.trim() } : {})
          }
        })
        if (!response?.data?.id) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({ title: 'Action modifiée', type: 'success' })
        return true
      })
    },
    [afterSuccessfulWrite, runSubmission, tenant, url]
  )

  return {
    submitting,
    deleteTarget,
    deletingNote,
    runSubmission,
    revalidateTimeline,
    afterSuccessfulWrite,
    handleEditNote,
    handleRequestDeleteNote,
    handleConfirmDeleteNote,
    handleBoost,
    handleSubmitAction,
    patchAction,
    handleReopenAction,
    handleEditAction,
    handleImportEml,
    cancelDelete: () => {
      if (!deletingNote) setDeleteTarget(null)
    }
  }
}
