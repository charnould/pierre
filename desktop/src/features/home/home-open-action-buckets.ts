import type { ActionActivity } from '@/shared/lib/activities/action-activity'

export type HomeActionBucket = 'overdue' | 'upcoming'

export function localTodayIso(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function homeActionBucket(dueDate: string, today: string): HomeActionBucket | 'drop' {
  const due = dueDate.trim()
  if (!due) return 'drop'
  return due < today ? 'overdue' : 'upcoming'
}

export function partitionHomeActions(
  actions: ActionActivity[],
  today: string
): { overdue: ActionActivity[]; upcoming: ActionActivity[] } {
  const overdue: ActionActivity[] = []
  const upcoming: ActionActivity[] = []
  for (const action of actions) {
    const bucket = homeActionBucket(action.contenu.task.due_date ?? '', today)
    if (bucket === 'overdue') overdue.push(action)
    else if (bucket === 'upcoming') upcoming.push(action)
  }
  return { overdue, upcoming }
}
