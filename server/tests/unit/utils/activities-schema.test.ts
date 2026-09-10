import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { user_destinataire } from '../../../utils/activities/rows'
import { create_activity } from '../../../utils/activities/write'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const TEST_SERVICE = '_test_activities_schema'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const TEST_PATHS = datastorePaths(TEST_SERVICE)
const DATASTORE_ROOT = TEST_PATHS.root
const DATASTORE_PATH = TEST_PATHS.database
const ALICE = 'alice@exemple.fr'
const user = (email: string) => user_destinataire(email)

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
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

  it('refuse un contenu sans version 2', () => {
    const db = new Database(DATASTORE_PATH)
    expect(() =>
      db.run(
        `INSERT INTO activites (date_creation, rattachement, auteur, type, mentions, contenu)
         VALUES ('2026-01-01T00:00:00Z', 'tickets:REQ-1', 'user:alice@exemple.fr',
           'note.published', '[]', '{"text":"x"}')`
      )
    ).toThrow()
    db.close()
  })

  it('exige un canal pour une communication et interdit UPDATE/DELETE', () => {
    const db = new Database(DATASTORE_PATH)
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, mentions, contenu, thread_id, revision
         ) VALUES (
           '2026-01-01T00:00:00Z', 'repayment:LOC-1', 'user:alice@exemple.fr',
           'communication.sent', '[]', '{"version":2,"sender":"Alice","body":"Hi"}',
           'thread-1', 1
         )`
      )
    ).toThrow()
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, type, channel, mentions, contenu, thread_id, revision
       ) VALUES (
         '2026-01-01T00:00:00Z', 'repayment:LOC-1', 'user:alice@exemple.fr',
         'communication.sent', 'email', '[]',
         '{"version":2,"sender":"Alice","body":"Hi"}', 'thread-1', 1
       )`
    )
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
