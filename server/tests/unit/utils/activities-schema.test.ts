import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { insert_activity_row, user_destinataire } from '../../../utils/activities/rows'
import { create_activity } from '../../../utils/activities/write'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('activities_schema')
const DATASTORE_PATH = paths.database
const ALICE = 'alice@exemple.fr'
const user = (email: string) => user_destinataire(email)

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(paths.root, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('activites schema', () => {
  it('crée un id entier autoincrement et un timestamp ISO sans millisecondes', () => {
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: 'Bonjour' })
    })
    expect(typeof created.id).toBe('number')
    expect(Number.isInteger(created.id)).toBe(true)
    expect(created.id).toBeGreaterThan(0)
    expect(created.date_creation).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(created.auteur).toBe(user(ALICE))
    expect(created.mentions).toEqual([])
    expect(created.thread_id).toBeTruthy()
    expect(created.revision).toBe(1)
  })

  it('exige un canal pour une communication et interdit UPDATE/DELETE', () => {
    const db = new Database(DATASTORE_PATH)
    const communication = {
      date_creation: '2026-01-01T00:00:00Z',
      rattachement: 'repayment:LOC-1',
      auteur: user(ALICE),
      facets: { id_client: null, id_locataire: null, id_lot: null },
      type: 'communication.sent' as const,
      mentions: [],
      contenu: JSON.stringify({ version: 2, sender: 'Alice', body: 'Hi' }),
      thread_id: 'thread-1',
      revision: 1
    }
    expect(() => insert_activity_row(db, communication)).toThrow()
    insert_activity_row(db, { ...communication, channel: 'email' })
    expect(() =>
      db.run('UPDATE activites SET auteur = ? WHERE id = 1', ['user:eve@x.fr'])
    ).toThrow()
    expect(() => db.run('DELETE FROM activites WHERE id = 1')).toThrow()
    db.close()
  })

  it('indexe le journal par rattachement et thread', () => {
    const db = new Database(DATASTORE_PATH)
    const indexes = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => row.name)
    db.close()
    expect(indexes).toContain('idx_activites_rattachement_thread')
    expect(indexes).toContain('idx_activites_idempotency')
    expect(indexes).toContain('idx_activites_repayment_plan_thread')
    expect(indexes).toContain('idx_activites_repayment_plan_snapshot')
  })
})
