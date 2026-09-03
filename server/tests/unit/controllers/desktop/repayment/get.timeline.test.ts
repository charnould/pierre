import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../../controllers/desktop/repayment/get.timeline'
import type { Parsed_User } from '../../../../../utils/_schema'
import { create_activity, create_trusted_activity } from '../../../../../utils/activities/write'
import { import_json_rows } from '../../../../../utils/knowledge/sqlite-table-import'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const SERVICE = '_test_repayment_timeline'
const originalService = Bun.env['SERVICE']
const paths = datastorePaths(SERVICE)
const user: Parsed_User = {
  email: 'alice@example.org',
  role: 'contributor',
  config: ['default'],
  password_hash: 'unused'
}

const app = new Hono<{ Variables: { user: Parsed_User } }>()
app.use('*', async (context, next) => {
  if (context.req.header('x-authenticated') === 'true') context.set('user', user)
  await next()
})
app.get('/desktop/repayment/timeline', controller)

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await setup()
  const db = new Database(paths.database)
  db.run(
    "INSERT INTO users (config, email, role, password_hash) VALUES ('default', 'alice@example.org', 'contributor', 'x')"
  )
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
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
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
      type: 'repayment_phase_change',
      statut: 'logged',
      contenu: JSON.stringify({ phase: 'amiable' }),
      auteur: 'system:repayment'
    })
    create_activity(user.email, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'action',
      contenu: JSON.stringify({
        action: 'Appeler le locataire',
        etat: 'a_faire',
        assigne_a: 'alice',
        date_echeance: '2030-02-05'
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
            type: 'action',
            state: 'a_faire',
            event: 'created'
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
      type: 'repayment_tag_change',
      statut: 'logged',
      contenu: JSON.stringify({ tag: 'fragile' }),
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
      type: 'repayment_tag_change',
      statut: 'logged',
      contenu: JSON.stringify({ tag: 'fragile' }),
      auteur: 'system:repayment'
    })

    const response = await request('?id_locataire=LOC-1')
    expect(await response.json()).toMatchObject({
      data: { movements: [], notifications: [{ type: 'repayment_tag_change' }] },
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
         date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu
       ) VALUES (?, 'repayment:LOC-1', 'system:test', 'LOC-1',
                 'repayment_tag_change', 'logged', '[]', ?)`
    )
    const insertAction = db.prepare(
      `INSERT INTO activites (
           date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu,
           thread_id, event, state, revision
         ) VALUES (?, 'repayment:LOC-1', 'user:alice@example.org', 'LOC-1',
                   'action', 'logged', '[]', ?, ?, 'created', 'a_faire', 1)`
    )
    db.transaction(() => {
      for (let index = 0; index < 2_001; index += 1) {
        insertTag.run(
          new Date(Date.UTC(2035, 0, 1, 0, 0, index)).toISOString(),
          JSON.stringify({ tag: `tag-${index}` })
        )
      }
      for (let index = 0; index < 501; index += 1) {
        const date = new Date(Date.UTC(2040, 0, 1, 0, 0, index)).toISOString()
        insertAction.run(
          date,
          JSON.stringify({
            version: 1,
            action: `Action ${index}`,
            etat: 'a_faire',
            cree_par: 'user:alice@example.org',
            cree_le: date,
            assigne_a: 'user:alice@example.org',
            date_echeance: '2041-01-01'
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
