import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { openDatastore } from '../../../utils/datastore-db'
import { migrate_datastore } from '../../../utils/datastore-migrations'
import { datastorePaths, setDatastoreRoot } from '../../../utils/paths'

const root = 'datastores/_test_datastore_db'

afterEach(async () => {
  setDatastoreRoot(null)
  await rm(root, { recursive: true, force: true })
})

describe('openDatastore', () => {
  it('applies the same wait and foreign-key policy to every connection', async () => {
    await mkdir(root, { recursive: true })
    setDatastoreRoot(root)
    await migrate_datastore(datastorePaths().database)

    using db = openDatastore()
    expect(db.query<{ timeout: number }, []>('PRAGMA busy_timeout').get()?.timeout).toBe(5000)
    expect(db.query<{ foreign_keys: number }, []>('PRAGMA foreign_keys').get()?.foreign_keys).toBe(
      1
    )
    db.run(
      `INSERT INTO users
         (id, name, email, emailVerified, createdAt, updatedAt)
       VALUES ('user-1', 'Ada', 'ada@example.com', 1, '2026-01-01', '2026-01-01')`
    )
    db.run(
      `INSERT INTO session
         (id, expiresAt, token, createdAt, updatedAt, userId)
       VALUES ('session-1', '2026-02-01', 'token-1', '2026-01-01', '2026-01-01', 'user-1')`
    )
    db.run(`DELETE FROM users WHERE id = 'user-1'`)
    expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM session').get()?.n).toBe(0)

    using readonly = openDatastore({ readonly: true })
    expect(() =>
      readonly.run(`INSERT INTO telemetry (recorded_at, host, event) VALUES ('x', 'h', 'e')`)
    ).toThrow()
  })
})
