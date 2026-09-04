import { useCallback, useRef, useState } from 'react'

import { toast } from '@/shared/components/ui/toast'
import { buildActionActivity, type ActionDraft } from '@/shared/lib/activities/action-activity'
import {
  buildCaseAssignmentActivity,
  buildCaseBucketChangeActivity,
  buildCaseTagChangeActivity,
  buildEmailImportActivity
} from '@/shared/lib/activities/case-activities'
import { parseEmlFile } from '@/shared/lib/activities/parse-eml'
import { ACTIVITY_CONTENT_VERSION, type ActivityContext } from '@/shared/types/activites'
import type { OrgUser } from '@/shared/types/users'

export type CaseSubmissionKind = 'note' | 'action' | 'assignment' | 'bucket' | 'eml' | 'tags'

export function useCaseActivityActions(params: {
  url: string | undefined
  contexte: ActivityContext
  ref: string
  userLogin: string
  refresh: () => Promise<void>
}) {
  const { url, contexte, ref, userLogin, refresh } = params
  const [submitting, setSubmitting] = useState<CaseSubmissionKind | null>(null)
  const submissionRef = useRef<CaseSubmissionKind | null>(null)

  const run = useCallback(
    async (kind: CaseSubmissionKind, task: () => Promise<boolean>): Promise<boolean> => {
      if (submissionRef.current) return false
      submissionRef.current = kind
      setSubmitting(kind)
      try {
        const ok = await task()
        if (ok) await refresh()
        return ok
      } catch {
        toast.add({ title: 'Impossible d’enregistrer la modification', type: 'error' })
        return false
      } finally {
        submissionRef.current = null
        setSubmitting(null)
      }
    },
    [refresh]
  )

  const createAction = useCallback(
    (draft: ActionDraft) =>
      run('action', async () => {
        if (!url || !window.api?.createActivity) return false
        const response = await window.api.createActivity({
          url,
          ...buildActionActivity(contexte, ref, draft)
        })
        if (!response?.data?.id) return false
        toast.add({
          title: draft.mode === 'planifier' ? 'Action planifiée' : 'Action enregistrée',
          type: 'success'
        })
        return true
      }),
    [contexte, ref, run, url]
  )

  const patchAction = useCallback(
    async (
      id: number,
      patch:
        | { operation: 'complete_action'; resultat?: string }
        | { operation: 'ignore_action'; motif?: string }
        | {
            operation: 'update_action'
            action: string
            assigne_a: string
            date_echeance: string
            note?: string
          }
        | {
            operation: 'reopen_action'
            assigne_a: string
            date_echeance: string
            note?: string
          }
    ) =>
      run('action', async () => {
        if (!url || !window.api?.patchActivity) return false
        const response = await window.api.patchActivity({ url, id, patch })
        return Boolean(response?.data?.id)
      }),
    [run, url]
  )

  const saveTags = useCallback(
    (tags: string[], previousTags: string[], comment: string, tagOptions?: readonly string[]) =>
      run('tags', async () => {
        if (!url || !window.api?.createActivity) return false
        const activity = buildCaseTagChangeActivity({
          contexte,
          ref,
          tags,
          previousTags,
          tagOptions,
          comment
        })
        const note = comment.trim()
        if (!activity && !note) return false
        const response = await window.api.createActivity({
          url,
          ...(activity ?? {
            contexte,
            ref,
            type: 'note',
            statut: 'logged',
            contenu: JSON.stringify({ version: ACTIVITY_CONTENT_VERSION, note })
          })
        })
        if (!response?.data?.id) return false
        toast.add({ title: activity ? 'Tags enregistrés' : 'Note enregistrée', type: 'success' })
        return true
      }),
    [contexte, ref, run, url]
  )

  const saveBucket = useCallback(
    (bucket: string, previousBucket: string | null, comment: string) =>
      run('bucket', async () => {
        if (!url || !window.api?.createActivity) return false
        const activity = buildCaseBucketChangeActivity({
          contexte,
          ref,
          bucket,
          previousBucket,
          comment
        })
        const note = comment.trim()
        const response = await window.api.createActivity({
          url,
          ...(activity ?? {
            contexte,
            ref,
            type: 'note',
            statut: 'logged',
            contenu: JSON.stringify({ version: ACTIVITY_CONTENT_VERSION, note })
          })
        })
        if (!response?.data?.id) return false
        toast.add({ title: activity ? 'Panier enregistré' : 'Note enregistrée', type: 'success' })
        return true
      }),
    [contexte, ref, run, url]
  )

  const assignReferent = useCallback(
    (user: OrgUser, previousEmail: string | null, comment: string) =>
      run('assignment', async () => {
        if (!url || !window.api?.createActivity) return false
        const activity = buildCaseAssignmentActivity({
          contexte,
          ref,
          user,
          previousEmail,
          comment
        })
        if (!activity) return false
        const response = await window.api.createActivity({ url, ...activity })
        if (!response?.data?.id) return false
        toast.add({ title: 'Référent affecté', type: 'success' })
        return true
      }),
    [contexte, ref, run, url]
  )

  const importEml = useCallback(
    (file: File) =>
      run('eml', async () => {
        if (!url || !window.api?.createActivity) return false
        const email = await parseEmlFile(file)
        const activity = email ? buildEmailImportActivity({ contexte, ref, email }) : null
        if (!activity) {
          toast.add({ title: 'Fichier .eml illisible', type: 'error' })
          return false
        }
        const response = await window.api.createActivity({ url, ...activity })
        if (!response?.data?.id) return false
        toast.add({ title: 'Courriel importé', type: 'success' })
        return true
      }),
    [contexte, ref, run, url]
  )

  const editNote = useCallback(
    (id: number, note: string) =>
      run('note', async () => {
        if (!url || !window.api?.patchActivity) return false
        const response = await window.api.patchActivity({
          url,
          id,
          patch: {
            operation: 'edit_content',
            contenu: JSON.stringify({ version: 1, note: note.trim() })
          }
        })
        return Boolean(response?.data?.id)
      }),
    [run, url]
  )

  const deleteActivity = useCallback(
    async (id: number) => {
      if (!url || !window.api?.deleteActivity) return false
      const response = await window.api.deleteActivity({ url, id })
      if (!response) return false
      await refresh()
      return true
    },
    [refresh, url]
  )

  return {
    submitting,
    createAction,
    patchAction,
    saveTags,
    saveBucket,
    assignReferent,
    importEml,
    editNote,
    deleteActivity,
    author: `user:${userLogin}`
  }
}
