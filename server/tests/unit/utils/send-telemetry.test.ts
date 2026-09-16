import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { insert_activity_row, user_destinataire } from '../../../utils/activities/rows'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { send_telemetry, TELEMETRY_URL } from '../../../utils/send-telemetry'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('send_telemetry')

const telemetry_rows = (db: Database) =>
  db
    .query<{ recorded_at: string; host: string; event: string }, []>(
      'SELECT recorded_at, host, event FROM telemetry ORDER BY id'
    )
    .all()

const with_host = (host: string, run: () => void): void => {
  const previous = Bun.env['HOST']
  Bun.env['HOST'] = host
  try {
    run()
  } finally {
    if (previous === undefined) delete Bun.env['HOST']
    else Bun.env['HOST'] = previous
  }
}

const with_fetch_spy = (run: (spy: ReturnType<typeof spyOn>) => void): void => {
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(() => Promise.resolve(new Response(null, { status: 204 })), {
      preconnect: () => {}
    })
  )
  try {
    run(spy)
  } finally {
    spy.mockRestore()
  }
}

const forwarded = (spy: ReturnType<typeof spyOn>) => {
  const [url, init] = spy.mock.calls[0] ?? []
  return { url, body: JSON.parse(String((init as RequestInit | undefined)?.body)) }
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await setup()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('send_telemetry', () => {
  it('does not throw when the local write fails', () => {
    expect(() => send_telemetry('ai.chat', new Database(':memory:'))).not.toThrow()
  })

  it('records the activity type from insert_activity_row', () => {
    using db = new Database(paths.database)
    insert_activity_row(db, {
      date_creation: '2026-01-01T00:00:00Z',
      rattachement: 'tickets:REQ-1',
      auteur: user_destinataire('alice@exemple.fr'),
      facets: { id_client: null, id_locataire: null, id_lot: null },
      type: 'note.published',
      mentions: [],
      contenu: JSON.stringify({ version: 2, text: 'Bonjour' })
    })
    expect(telemetry_rows(db).map((row) => row.event)).toEqual(['note.published'])
  })

  it('opens the datastore and inserts the event', () => {
    send_telemetry('ai.chat')
    using db = new Database(paths.database)
    expect(telemetry_rows(db).map((row) => row.event)).toEqual(['ai.chat'])
  })

  it('forwards host and event when this instance is not the collector', () => {
    with_fetch_spy((spy) => {
      with_host('bailleur.example.org', () => {
        send_telemetry('ai.chat')
      })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(forwarded(spy)).toEqual({
        url: TELEMETRY_URL,
        body: { host: 'bailleur.example.org', event: 'ai.chat' }
      })
    })
  })

  it('forwards a normalized hostname when HOST is a URL', () => {
    with_fetch_spy((spy) => {
      with_host('https://Bailleur.Example.org', () => {
        send_telemetry('ai.chat')
      })
      using db = new Database(paths.database)
      expect(telemetry_rows(db).map((row) => row.host)).toEqual(['bailleur.example.org'])
      expect(forwarded(spy)).toEqual({
        url: TELEMETRY_URL,
        body: { host: 'bailleur.example.org', event: 'ai.chat' }
      })
    })
  })

  it('does not forward when this instance is the collector', () => {
    with_fetch_spy((spy) => {
      with_host('assistant.pierre-ia.org', () => {
        send_telemetry('ai.chat')
      })
      using db = new Database(paths.database)
      expect(spy).not.toHaveBeenCalled()
      expect(telemetry_rows(db).map((row) => row.event)).toEqual(['ai.chat'])
    })
  })

  it('does not forward when HOST is the collector URL', () => {
    with_fetch_spy((spy) => {
      with_host('https://assistant.pierre-ia.org', () => {
        send_telemetry('ai.chat')
      })
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
