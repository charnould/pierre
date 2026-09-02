import { describe, expect, test } from 'bun:test'

import type { ActivityFeedSyncData, ActiviteListItem } from '../../../../../../shared/activites'
import { Query, etagFor } from '../../../../../controllers/desktop/activities/get.feed-sync'

const activity = (lu: boolean): ActiviteListItem =>
  ({
    id: 1,
    date_creation: '2026-08-31T10:00:00.000Z',
    rattachement: 'tickets:REC-1',
    auteur: 'user:alice@example.test',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [{ destinataire: 'user:bob@example.test', lu, boost: null }],
    contenu: 'Test',
    my: { destinataire: 'user:bob@example.test', lu, boost: null }
  }) as ActiviteListItem

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
