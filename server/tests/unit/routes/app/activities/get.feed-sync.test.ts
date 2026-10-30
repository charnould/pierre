import { describe, expect, test } from 'bun:test'

import type { ActivityFeedSyncData, ActivityListItem } from '../../../../../../shared/activities'
import {
  ActivityFeedQuery as Query,
  etagForActivityFeed as etagFor
} from '../../../../../routes/activities'

const activity = (read: boolean): ActivityListItem => ({
  id: 1,
  createdAt: '2026-08-31T10:00:00.000Z',
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
  threadId: 'thread-1',
  revision: 1,
  bulkId: null,
  executionId: null,
  idempotencyKey: null,
  externalId: null,
  my: { destinataire: 'user:bob@example.test' },
  read,
  reaction: null
})

describe('GET /activities/feed', () => {
  test('parses bounded feed windows and unique authors', () => {
    const parsed = Query.parse({
      auteurs: 'user:alice@example.test,user:alice@example.test',
      unreadOnly: 'false',
      inboxLimit: '75',
      authoredLimit: '80'
    })
    expect(parsed).toMatchObject({
      auteurs: ['user:alice@example.test'],
      unreadOnly: false,
      inboxLimit: 75,
      authoredLimit: 80
    })
    expect(Query.parse({})).toMatchObject({
      auteurs: [],
      unreadOnly: false,
      inboxLimit: 50,
      authoredLimit: 50
    })
  })

  test('changes the ETag when mention read state changes', () => {
    const unread: ActivityFeedSyncData = { notifications: [activity(false)], authored: [] }
    const read: ActivityFeedSyncData = { notifications: [activity(true)], authored: [] }
    expect(etagFor(unread)).not.toBe(etagFor(read))
    expect(etagFor(unread)).toBe(etagFor(unread))
  })
})
