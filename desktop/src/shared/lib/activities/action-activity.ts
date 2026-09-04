import {
  ACTIVITY_CONTENT_VERSION,
  parse_action_activity_content,
  type ActionActivityContent,
  type ActionActivityEvent,
  type ActionActivityState,
  type Activite,
  type CreateActivityBody
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
  row: Activite
  contenu: ActionActivityContent
  event: ActionActivityEvent
  state: ActionActivityState
  threadId: string
  revision: number
}

export function listOpenActions(rows: Activite[]): ActionActivity[] {
  return rows
    .flatMap((row) => {
      const parsed = parseActionActivity(row)
      return parsed?.state === 'a_faire' ? [parsed] : []
    })
    .sort((a, b) => {
      const due = (a.contenu.date_echeance ?? '').localeCompare(b.contenu.date_echeance ?? '')
      if (due !== 0) return due
      return a.row.date_creation.localeCompare(b.row.date_creation)
    })
}

export function parseActionActivity(row: Activite): ActionActivity | null {
  if (row.type !== 'action') return null
  if (!row.event || !row.state || !row.thread_id || row.revision == null) return null
  const contenu = parse_action_activity_content(row.contenu)
  return contenu
    ? {
        row,
        contenu,
        event: row.event,
        state: row.state,
        threadId: row.thread_id,
        revision: row.revision
      }
    : null
}

export function actionTimelineDate(row: Activite): string {
  return row.date_creation
}

export type TodoSentencePart =
  | { type: 'text'; text: string }
  | { type: 'title'; text: string }
  | { type: 'person'; identity: string }
  | { type: 'date'; iso: string }

export function indexTodoRevisions(rows: Activite[]): Map<string, ActionActivity> {
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
): ActionActivityContent | null {
  return index.get(`${threadId}:${revision - 1}`)?.contenu ?? null
}

function joinFrench(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} et ${items[1]}`
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

function todoTitleParts(title: string): TodoSentencePart[] {
  return [
    { type: 'text', text: 'la tâche' },
    { type: 'title', text: title }
  ]
}

function assignedParts(assignee?: string, due?: string): TodoSentencePart[] {
  const parts: TodoSentencePart[] = []
  if (assignee) {
    parts.push({ type: 'text', text: 'assignée à' }, { type: 'person', identity: assignee })
  }
  if (due) {
    parts.push({ type: 'text', text: 'pour le' }, { type: 'date', iso: due })
  }
  return parts
}

export function todoTimelineSentence(
  current: ActionActivity,
  previous: ActionActivityContent | null
): TodoSentencePart[] {
  const title = current.contenu.action
  const assignee = current.contenu.assigne_a
  const due = current.contenu.date_echeance

  if (current.event === 'created') {
    return [
      { type: 'text', text: 'a créé' },
      ...todoTitleParts(title),
      ...assignedParts(assignee, due)
    ]
  }
  if (current.event === 'completed') {
    return [
      { type: 'text', text: 'a réalisé' },
      ...todoTitleParts(title),
      ...assignedParts(assignee, due)
    ]
  }
  if (current.event === 'ignored') {
    return [{ type: 'text', text: 'a ignoré' }, ...todoTitleParts(title)]
  }
  if (current.event === 'reopened') {
    return [
      { type: 'text', text: 'a rouvert' },
      ...todoTitleParts(title),
      ...assignedParts(assignee, due)
    ]
  }

  const changed: string[] = []
  const values: TodoSentencePart[] = []
  if (!previous || previous.action !== title) changed.push('le libellé')
  if (!previous || previous.date_echeance !== due) {
    changed.push('l’échéance')
    if (due) values.push({ type: 'text', text: 'au' }, { type: 'date', iso: due })
  }
  if (!previous || previous.assigne_a !== assignee) {
    changed.push('le responsable')
    if (assignee) values.push({ type: 'text', text: 'à' }, { type: 'person', identity: assignee })
  }

  if (changed.length === 0) {
    return [{ type: 'text', text: 'a modifié' }, ...todoTitleParts(title)]
  }
  return [
    { type: 'text', text: `a modifié ${joinFrench(changed)} de` },
    ...todoTitleParts(title),
    ...values
  ]
}

export function buildActionActivity(
  contexte: CreateActivityBody['contexte'],
  ref: string,
  draft: ActionDraft
): CreateActivityBody {
  const common = {
    version: ACTIVITY_CONTENT_VERSION,
    action: draft.action.trim()
  }
  const contenu =
    draft.mode === 'planifier'
      ? {
          ...common,
          etat: 'a_faire' as const,
          assigne_a: draft.assigneA.trim(),
          date_echeance: draft.dateEcheance,
          ...(draft.note.trim() ? { note: draft.note.trim() } : {})
        }
      : {
          ...common,
          etat: 'fait' as const,
          ...(draft.resultat.trim() ? { resultat: draft.resultat.trim() } : {})
        }

  return {
    contexte,
    ref,
    type: 'action',
    contenu: JSON.stringify(contenu)
  }
}
