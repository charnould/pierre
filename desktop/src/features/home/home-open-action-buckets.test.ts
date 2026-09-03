import { describe, expect, test } from 'bun:test'

import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import type { Activite } from '@/shared/types/activites'

import { homeActionBucket, partitionHomeActions } from './home-open-action-buckets'

function action(dueDate: string): ActionActivity {
  return {
    row: { id: 1, date_creation: '2026-09-01T00:00:00.000Z' } as Activite,
    contenu: {
      version: 2,
      task: { title: 'Tâche', state: 'open', due_date: dueDate }
    },
    event: 'task.created',
    state: 'open',
    threadId: 'thread',
    revision: 1,
    createdBy: 'user:alice@exemple.fr'
  }
}

describe('homeActionBucket', () => {
  test('classifies overdue, upcoming, and drop', () => {
    expect(homeActionBucket('2026-09-16', '2026-09-17')).toBe('overdue')
    expect(homeActionBucket('2026-09-17', '2026-09-17')).toBe('upcoming')
    expect(homeActionBucket('2026-10-01', '2026-09-17')).toBe('upcoming')
    expect(homeActionBucket('', '2026-09-17')).toBe('drop')
  })
})

describe('partitionHomeActions', () => {
  test('splits overdue and upcoming without a 7-day window', () => {
    const { overdue, upcoming } = partitionHomeActions(
      [action('2026-09-16'), action('2026-09-20'), action('2026-10-01'), action('')],
      '2026-09-17'
    )
    expect(overdue.map((item) => item.contenu.task.due_date)).toEqual(['2026-09-16'])
    expect(upcoming.map((item) => item.contenu.task.due_date)).toEqual(['2026-09-20', '2026-10-01'])
  })
})
