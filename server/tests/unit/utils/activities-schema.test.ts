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
      type: 'note',
      statut: 'logged',
      contenu: 'Bonjour'
    })
    expect(typeof created.id).toBe('number')
    expect(Number.isInteger(created.id)).toBe(true)
    expect(created.id).toBeGreaterThan(0)
    expect(created.date_creation).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(created.auteur).toBe(user(ALICE))
    expect(created.mentions).toEqual([])
  })

  it('refuse un objet mentions', () => {
    const db = new Database(DATASTORE_PATH)
    expect(() =>
      db.run(
        `INSERT INTO activites (date_creation, rattachement, auteur, type, mentions, contenu)
         VALUES ('2026-01-01T00:00:00', 'tickets:REQ-1', 'user:alice@exemple.fr', 'note', '{}', 'x')`
      )
    ).toThrow()
    db.close()
  })

  it('contraint les métadonnées action et crée les index du journal', () => {
    const db = new Database(DATASTORE_PATH)
    expect(() =>
      db.run(
        `INSERT INTO activites (date_creation, rattachement, auteur, type, mentions, contenu)
         VALUES ('2026-01-01T00:00:00Z', 'repayment:LOC-1',
           'user:alice@exemple.fr', 'action', '[]', '{}')`
      )
    ).toThrow()
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, mentions, contenu,
           thread_id, event, state, revision
         ) VALUES ('2026-01-01T00:00:00Z', 'repayment:LOC-1',
           'user:alice@exemple.fr', 'note', '[]', '{}',
           'todo-1', 'created', 'a_faire', 1)`
      )
    ).toThrow()
    const indexes = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => row.name)
    db.close()
    expect(indexes).toContain('idx_activites_rattachement_thread')
    expect(indexes).not.toContain('idx_activites_thread')
    expect(indexes).not.toContain('idx_activites_communication_thread')
  })

  it('réserve les threads sans révision aux communications', () => {
    const db = new Database(DATASTORE_PATH)
    for (const type of ['rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature']) {
      expect(() =>
        db.run(
          `INSERT INTO activites (
             date_creation, rattachement, auteur, destinataire, type, statut,
             mentions, contenu, thread_id
           ) VALUES (
             '2026-08-26T20:00:00Z', ?, 'user:alice@exemple.fr', 'destinataire',
             ?, 'queued', '[]', '{}', ?
           )`,
          [`repayment:${type}`, type, `thread-${type}`]
        )
      ).not.toThrow()
    }
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, statut, mentions, contenu,
           thread_id, event
         ) VALUES (
           '2026-08-26T20:00:00Z', 'repayment:invalid-email',
           'user:alice@exemple.fr', 'email', 'queued', '[]', '{}',
           'thread-invalid', 'created'
         )`
      )
    ).toThrow()
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, statut, mentions, contenu, thread_id
         ) VALUES (
           '2026-08-26T20:00:00Z', 'repayment:invalid-note',
           'user:alice@exemple.fr', 'note', 'logged', '[]', '{}', 'thread-note'
         )`
      )
    ).toThrow()
    db.close()
  })
})
