import {
  type Activity,
  ACTIVITY_CONTENT_VERSION,
  type CreateActivityBody,
  parseTaskContent,
  type TaskContent,
  type TaskState
} from '@/shared/types/activites'

export type ActionDraft =
  | {
      mode: 'planifier'
      action: string
      assigneA: string
      dateEcheance: string
      note: string
    }
  | {
      mode: 'enregistrer'
      action: string
      resultat: string
    }

export function mapTodoForm(form: {
  action: string
  assigneA: string
  dateEcheance: string
  note: string
}): ActionDraft | null {
  const action = form.action.trim()
  if (!action) return null
  return {
    mode: 'planifier',
    action,
    assigneA: form.assigneA.trim(),
    dateEcheance: form.dateEcheance,
    note: form.note.trim()
  }
}

export function mapDoneActionForm(form: {
  action: string
  commentaire: string
}): ActionDraft | null {
  const action = form.action.trim()
  if (!action) return null
  return { mode: 'enregistrer', action, resultat: form.commentaire.trim() }
}

export type ActionActivity = {
  row: Activity
  contenu: TaskContent
  event: Activity['type']
  state: TaskState
  threadId: string
  revision: number
  createdBy: string
}

export function listOpenActions(rows: Activity[]): ActionActivity[] {
  const creators = new Map<string, string>()
  for (const row of rows) {
    if (row.type === 'task.created' && row.threadId) creators.set(row.threadId, row.auteur)
  }
  const latest = new Map<string, ActionActivity>()
  for (const row of rows) {
    const parsed = parseActionActivity(row, creators.get(row.threadId ?? ''))
    if (!parsed) continue
    const current = latest.get(parsed.threadId)
    if (!current || parsed.revision >= current.revision) latest.set(parsed.threadId, parsed)
  }
  return [...latest.values()]
    .filter((parsed) => parsed.state === 'open')
    .sort((a, b) => {
      const due = (a.contenu.task.due_date ?? '').localeCompare(b.contenu.task.due_date ?? '')
      if (due !== 0) return due
      return a.row.createdAt.localeCompare(b.row.createdAt)
    })
}

export function parseActionActivity(row: Activity, createdBy?: string): ActionActivity | null {
  if (!row.type.startsWith('task.') || !row.threadId || row.revision == null) return null
  const contenu = parseTaskContent(row.contenu)
  return contenu
    ? {
        row,
        contenu,
        event: row.type,
        state: contenu.task.state,
        threadId: row.threadId,
        revision: row.revision,
        createdBy: createdBy ?? row.auteur
      }
    : null
}

export function actionTimelineDate(row: Activity): string {
  return row.createdAt
}

export function indexTodoRevisions(rows: Activity[]): Map<string, ActionActivity> {
  const index = new Map<string, ActionActivity>()
  for (const row of rows) {
    const parsed = parseActionActivity(row)
    if (!parsed) continue
    index.set(`${parsed.threadId}:${parsed.revision}`, parsed)
  }
  return index
}

export function previousTodoContent(
  index: Map<string, ActionActivity>,
  threadId: string,
  revision: number
): TaskContent | null {
  return index.get(`${threadId}:${revision - 1}`)?.contenu ?? null
}

export function buildActionActivity(
  contexte: CreateActivityBody['contexte'],
  ref: string,
  draft: ActionDraft
): CreateActivityBody {
  const contenu =
    draft.mode === 'planifier'
      ? {
          version: ACTIVITY_CONTENT_VERSION,
          task: {
            title: draft.action.trim(),
            state: 'open' as const,
            assignee: { id: draft.assigneA.trim(), label: draft.assigneA.trim() },
            due_date: draft.dateEcheance
          },
          ...(draft.note.trim() ? { note: draft.note.trim() } : {})
        }
      : {
          version: ACTIVITY_CONTENT_VERSION,
          task: {
            title: draft.action.trim(),
            state: 'completed' as const
          },
          ...(draft.resultat.trim() ? { result: draft.resultat.trim() } : {})
        }

  return {
    contexte,
    ref,
    type: draft.mode === 'planifier' ? 'task.created' : 'task.completed',
    contenu: JSON.stringify(contenu)
  }
}
