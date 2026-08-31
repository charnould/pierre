import { session } from 'electron'

import type { ActivitiesListResponse } from '../../src/shared/types/activites'
import { netFetch } from '../lib/net-fetch'
import { logMainError } from './logging'
import { countUnreadRows } from './notification-badge-poller'

export async function fetchInboxUnreadCount(
  partition: string,
  url: string
): Promise<number | null> {
  try {
    const response = await netFetch(`${url}/desktop/activities?inbox=true&unread_only=true`, {
      session: session.fromPartition(partition)
    })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    const body = (await response.json()) as ActivitiesListResponse
    if (!Array.isArray(body.data)) return null
    return countUnreadRows(body.data)
  } catch (error) {
    logMainError('notification-badge-poll', error)
    return null
  }
}
