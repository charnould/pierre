import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../../controllers/desktop/repayment/get.timeline'
import type { User } from '../../../../../utils/_schema'
import { create_activity, create_trusted_activity } from '../../../../../utils/activities/write'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { createTestUser } from '../../../../test-user'

const paths = testDatastorePaths('repayment_timeline')
const user: User = {
  email: 'alice@example.org',
  isAdministrator: false,
  moduleIds: ['repayment'],
  chatbotIds: ['default']
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (context, next) => {
  if (context.req.header('x-authenticated') === 'true') context.set('user', user)
  await next()
})
app.get('/desktop/repayment/timeline', controller)

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await setup()
  await createTestUser(user)
  const db = new Database(paths.database)
  await import_json_rows(db, 'comptes_locataires', [
    {
      id_client: 'CLIENT-1',
      id_locataire: 'LOC-1',
      montant_en_euros: 420,
      date_exigibilite: '2030-01-05'
    },
    {
      id_client: 'CLIENT-1',
      id_locataire: 'LOC-2',
      montant_en_euros: 900,
      date_exigibilite: '2030-01-06'
    }
  ])
  db.close()
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

afterAll(() => {
  setDatastoreRoot(null)
})

const request = (query: string, authenticated = true) =>
  app.request(`/desktop/repayment/timeline${query}`, {
    headers: authenticated ? { 'x-authenticated': 'true' } : {}
  })

describe('GET /desktop/repayment/timeline', () => {
  it('requires authentication and validates one exact tenant id', async () => {
    expect((await request('?id_locataire=LOC-1', false)).status).toBe(401)
    for (const query of [
      '',
      '?id_locataire=',
      '?id_locataire=LOC-1&id_locataire=LOC-2',
      '?id_locataire=LOC-1&extra=true',
      '?id_locataire=LOC-1&limit=501',
      '?id_locataire=LOC-1&offset=-1'
    ]) {
      const response = await request(query)
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'invalid_query' } })
    }
  })

  it('combines movements, repayment activities and current open actions', async () => {
    create_trusted_activity(user.email, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'case.group_changed',
      contenu: JSON.stringify({ version: 2, before: null, after: 'amiable' }),
      auteur: 'system:repayment'
    })
    create_activity(user.email, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'Appeler le locataire',
          state: 'open',
          assignee: { id: user.email, label: user.email },
          due_date: '2030-02-05'
        }
      })
    })

    const response = await request('?id_locataire=LOC-1')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        movements: [{ id_locataire: 'LOC-1', montant_en_euros: 420 }],
        notifications: [{ rattachement: 'repayment:LOC-1' }, { rattachement: 'repayment:LOC-1' }],
        openActionEvents: [
          {
            rattachement: 'repayment:LOC-1',
            type: 'task.created',
            contenu: expect.stringContaining('"state":"open"')
          }
        ]
      },
      errors: { movements: false, notifications: false, openActions: false }
    })
  })

  it('does not leak a sibling tenant and repeated reads are idempotent', async () => {
    create_trusted_activity(user.email, {
      contexte: 'repayment',
      ref: 'LOC-2',
      type: 'case.tags_changed',
      contenu: JSON.stringify({ version: 2, before: [], after: ['fragile'] }),
      auteur: 'system:repayment'
    })

    const first = await request('?id_locataire=LOC-1')
    const second = await request('?id_locataire=LOC-1')
    const firstBody = await first.json()
    expect(firstBody).toEqual(await second.json())
    expect(JSON.stringify(firstBody)).not.toContain('LOC-2')

    const db = new Database(paths.database, { readonly: true })
    expect(
      db.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM activites').get()?.count
    ).toBe(1)
    db.close()
  })

  it('keeps activity data when the optional ledger table is absent', async () => {
    const db = new Database(paths.database)
    db.run('DROP TABLE comptes_locataires')
    db.close()
    create_trusted_activity(user.email, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'case.tags_changed',
      contenu: JSON.stringify({ version: 2, before: [], after: ['fragile'] }),
      auteur: 'system:repayment'
    })

    const response = await request('?id_locataire=LOC-1')
    expect(await response.json()).toMatchObject({
      data: { movements: [], notifications: [{ type: 'case.tags_changed' }] },
      errors: { movements: false, notifications: false, openActions: false }
    })
  })

  it('returns more than 2,000 activities and 500 actions/movements without truncation', async () => {
    const db = new Database(paths.database)
    await import_json_rows(
      db,
      'comptes_locataires',
      Array.from({ length: 501 }, (_, index) => ({
        id_client: 'CLIENT-1',
        id_locataire: 'LOC-1',
        montant_en_euros: index % 2 === 0 ? 10 : -5,
        date_exigibilite: new Date(Date.UTC(2030, 0, 1, 0, 0, index)).toISOString(),
        sequence: index
      }))
    )
    const insertTag = db.prepare(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, mentions, contenu
       ) VALUES (?, 'repayment:LOC-1', 'system:test', 'LOC-1',
                 'case.tags_changed', '[]', ?)`
    )
    const insertAction = db.prepare(
      `INSERT INTO activites (
           date_creation, rattachement, auteur, id_locataire, type, mentions, contenu,
           thread_id, revision
         ) VALUES (?, 'repayment:LOC-1', 'user:alice@example.org', 'LOC-1',
                   'task.created', '[]', ?, ?, 1)`
    )
    db.transaction(() => {
      for (let index = 0; index < 2_001; index += 1) {
        insertTag.run(
          new Date(Date.UTC(2035, 0, 1, 0, 0, index)).toISOString(),
          JSON.stringify({ version: 2, before: [], after: [`tag-${index}`] })
        )
      }
      for (let index = 0; index < 501; index += 1) {
        const date = new Date(Date.UTC(2040, 0, 1, 0, 0, index)).toISOString()
        insertAction.run(
          date,
          JSON.stringify({
            version: 2,
            task: {
              title: `Action ${index}`,
              state: 'open',
              assignee: {
                id: 'user:alice@example.org',
                label: 'alice@example.org'
              },
              due_date: '2041-01-01'
            }
          }),
          `thread-${index}`
        )
      }
    }).immediate()
    db.close()

    const response = await request('?id_locataire=LOC-1')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: {
        movements: Record<string, unknown>[]
        notifications: Array<{ id: number }>
        openActionEvents: Array<{ id: number }>
      }
      errors: Record<string, boolean>
      meta?: unknown
    }
    expect(body.data.movements).toHaveLength(501)
    expect(body.data.notifications).toHaveLength(2_502)
    expect(body.data.openActionEvents).toHaveLength(501)
    expect(new Set(body.data.notifications.map((activity) => activity.id)).size).toBe(2_502)
    expect(new Set(body.data.openActionEvents.map((activity) => activity.id)).size).toBe(501)
    expect(body.errors).toEqual({ movements: false, notifications: false, openActions: false })
    expect(body).not.toHaveProperty('meta')
  })
})
