import type { Context } from 'hono'
import { Hono } from 'hono'
import { z } from 'zod'

import type { ActivityListItem } from '../../shared/activities'
import { parseTaskContent } from '../../shared/activity-content'
import { list_activities } from '../utils/activities/query'
import { build_rattachement } from '../utils/activities/rows'
import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeModule } from '../utils/authorize-role'
import { list_ledger_movements } from '../utils/ledger/query'

const RepaymentTimelineQuery = z
  .object({
    id_locataire: z.string().trim().min(1).max(256)
  })
  .strict()

const parse_query = (url: string) => {
  const params = new URL(url).searchParams
  if (
    params.getAll('id_locataire').length !== 1 ||
    [...params.keys()].some((key) => key !== 'id_locataire')
  ) {
    return null
  }
  const parsed = RepaymentTimelineQuery.safeParse({
    id_locataire: params.get('id_locataire')
  })
  return parsed.success ? parsed.data : null
}

const open_actions = (activities: ActivityListItem[]): ActivityListItem[] => {
  const heads = new Map<string, ActivityListItem>()
  for (const activity of activities) {
    if (!activity.type.startsWith('task.') || !activity.threadId) continue
    const current = heads.get(activity.threadId)
    if (!current || (activity.revision ?? 0) > (current.revision ?? 0)) {
      heads.set(activity.threadId, activity)
    }
  }
  return [...heads.values()].filter(
    (activity) => parseTaskContent(activity.contenu)?.task.state === 'open'
  )
}

export const listRepayment = (c: Context<AuthEnv>) => {
  const user = c.get('user')

  const query = parse_query(c.req.url)
  if (!query) {
    return c.json(
      { error: { code: 'invalid_query', message: 'A single id_locataire is required' } },
      400
    )
  }

  const { id_locataire } = query
  let movements: Record<string, unknown>[] = []
  let notifications: ActivityListItem[] = []
  let openActionEvents: ActivityListItem[] = []
  const errors = {
    movements: false,
    notifications: false,
    openActions: false
  }

  try {
    movements = list_ledger_movements(id_locataire).data
  } catch {
    errors.movements = true
  }
  try {
    notifications = list_activities(user.email, {
      rattachement: build_rattachement('repayment', id_locataire),
      all: true
    })
    openActionEvents = open_actions(notifications)
  } catch {
    errors.notifications = true
    errors.openActions = true
  }

  return c.json({
    data: { movements, notifications, openActionEvents },
    errors
  })
}

export const repayment = new Hono<AuthEnv>()

repayment.get('/', authenticate, authorizeModule('repayment'), listRepayment)
