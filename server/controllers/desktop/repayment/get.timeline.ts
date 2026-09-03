import type { Context } from 'hono'
import { z } from 'zod'

import type { ActiviteListItem } from '../../../../shared/activites'
import type { Parsed_User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import { build_rattachement } from '../../../utils/activities/rows'
import { list_ledger_movements } from '../../../utils/ledger/query'

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

const all_activities = (
  actor: string,
  options: Parameters<typeof list_activities>[1]
): ActiviteListItem[] => {
  const rows: ActiviteListItem[] = []
  const batchSize = 500
  for (let offset = 0; ; offset += batchSize) {
    const batch = list_activities(actor, { ...options, limit: batchSize, offset })
    rows.push(...batch)
    if (batch.length < batchSize) return rows
  }
}

export const controller = (c: Context) => {
  const user = c.get('user') as Parsed_User | null | undefined
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

  const query = parse_query(c.req.url)
  if (!query) {
    return c.json(
      { error: { code: 'invalid_query', message: 'A single id_locataire is required' } },
      400
    )
  }

  const { id_locataire } = query
  let movements: Record<string, unknown>[] = []
  let notifications: ActiviteListItem[] = []
  let openActionEvents: ActiviteListItem[] = []
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
    notifications = all_activities(user.email, {
      rattachement: build_rattachement('repayment', id_locataire)
    })
  } catch {
    errors.notifications = true
  }
  try {
    openActionEvents = all_activities(user.email, {
      rattachement: build_rattachement('repayment', id_locataire),
      type: 'action',
      current_threads: true,
      state: 'a_faire'
    })
  } catch {
    errors.openActions = true
  }

  return c.json({
    data: { movements, notifications, openActionEvents },
    errors
  })
}
