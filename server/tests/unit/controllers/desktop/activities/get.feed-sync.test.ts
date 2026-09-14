import { describe, expect, test } from 'bun:test'

import type { ActivityFeedSyncData, ActiviteListItem } from '../../../../../../shared/activites'
import { Query, etagFor } from '../../../../../controllers/desktop/activities/get.feed-sync'

const activity = (read: boolean): ActiviteListItem => ({
  id: 1,
  date_creation: '2026-08-31T10:00:00.000Z',
  rattachement: 'tickets:REC-1',
  auteur: 'user:alice@example.test',
  destinataire: null,
  id_client: null,
  id_locataire: null,
  id_lot: null,
  type: 'note.published',
  channel: null,
  mentions: [{ destinataire: 'user:bob@example.test' }],
  contenu: JSON.stringify({ version: 2, text: 'Test' }),
  thread_id: 'thread-1',
  revision: 1,
  bulk_id: null,
  execution_id: null,
  idempotency_key: null,
  my: { destinataire: 'user:bob@example.test' },
  read,
  reaction: null
})

describe('GET /desktop/activity-feed/sync', () => {
  test('parses bounded feed windows and unique authors', () => {
    const parsed = Query.parse({
      auteurs: 'user:alice@example.test,user:alice@example.test',
      unread_only: 'false',
      inbox_limit: '75',
      authored_limit: '80'
    })
    expect(parsed).toMatchObject({
      auteurs: ['user:alice@example.test'],
      unread_only: false,
      inbox_limit: 75,
      authored_limit: 80
    })
    expect(Query.parse({})).toMatchObject({
      auteurs: [],
      unread_only: false,
      inbox_limit: 50,
      authored_limit: 50
    })
  })

  test('changes the ETag when mention read state changes', () => {
    const unread: ActivityFeedSyncData = { notifications: [activity(false)], authored: [] }
    const read: ActivityFeedSyncData = { notifications: [activity(true)], authored: [] }
    expect(etagFor(unread)).not.toBe(etagFor(read))
    expect(etagFor(unread)).toBe(etagFor(unread))
  })
})
