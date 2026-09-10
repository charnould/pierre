import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { parse_repayment_plan_content } from '../../../../shared/activites'
import { controller as postActivity } from '../../../controllers/desktop/activities/post'
import { list_activities } from '../../../utils/activities/query'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const SERVICE = '_test_repayment_plan_activities'
const ROOT = datastorePaths(SERVICE).root
const DATABASE = datastorePaths(SERVICE).database
const originalService = Bun.env['SERVICE']
const ALICE = 'alice@example.org'

const plan_content = (amount = 1_200, note?: string): string =>
  JSON.stringify({
    version: 2,
    title: "Plan d'apurement",
    plan: {
      kind: 'repayment_plan',
      tenant_reference: 'LOC-1',
      client_reference: 'CLI-1',
      occupancy: 'lease',
      address: { line: '1 rue Pierre', postal_code: '75001', city: 'Paris' },
      debt: { amount },
      procedures: {
        banque_de_france: { status: 'none' },
        ccapex_opened: false
      },
      social_worker: null,
      household: {
        adults: [
          {
            id: 'adult-1',
            last_name: 'Martin',
            first_name: 'Alice',
            birth_date: '',
            employment_status: 'permanent',
            pension_fund: '',
            caf_number: '',
            lease_holder: true
          }
        ],
        children: []
      },
      budget: {
        income: [{ label: 'Salaire', amount: 2_000, person_id: 'adult-1' }],
        expenses: [{ label: 'Loyer', amount: 600 }]
      },
      requested_aids: [],
      installments: [{ year_month: '2026-10', amount }]
    },
    ...(note ? { note } : {})
  })

const thread_rows = (threadId: string) =>
  list_activities(ALICE, { rattachement: 'repayment:LOC-1', limit: 100 })
    .filter((row) => row.thread_id === threadId)
    .sort((a, b) => a.id - b.id)

const snapshots = (threadId: string) =>
  thread_rows(threadId).filter(
    (row) => parse_repayment_plan_content(row.type, row.contenu)?.plan != null
  )

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

beforeEach(async () => {
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

describe('repayment plan activity lifecycle', () => {
  it('moves one snapshot through create, update, finalize and close', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content()
    })
    expect(created.revision).toBeNull()
    expect(created.thread_id).toBeTruthy()
    expect(snapshots(created.thread_id!)).toHaveLength(1)

    const updated = patch_activity(ALICE, created.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(900, 'Mensualité ajustée')
    })
    expect(updated.type).toBe('repayment_plan.updated')
    expect(updated.thread_id).toBe(created.thread_id)
    expect(updated.revision).toBeNull()
    expect(snapshots(created.thread_id!).map((row) => row.id)).toEqual([updated.id])
    expect(
      parse_repayment_plan_content(created.type, thread_rows(created.thread_id!)[0]!.contenu)
    ).not.toHaveProperty('plan')

    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(800)
      })
    ).toThrow(/changed/)

    const finalized = patch_activity(ALICE, updated.id, {
      operation: 'finalize_repayment_plan',
      contenu: plan_content(900, 'Accord signé')
    })
    expect(finalized.type).toBe('repayment_plan.finalized')
    expect(finalized.thread_id).toBe(created.thread_id)
    expect(snapshots(created.thread_id!).map((row) => row.id)).toEqual([finalized.id])

    const closed = patch_activity(ALICE, finalized.id, {
      operation: 'close_repayment_plan',
      reason: 'execution_complete'
    })
    expect(closed.type).toBe('repayment_plan.closed')
    expect(closed.thread_id).toBe(created.thread_id)
    expect(snapshots(created.thread_id!).map((row) => row.id)).toEqual([closed.id])
    expect(parse_repayment_plan_content(closed.type, closed.contenu)).toMatchObject({
      reason: 'execution_complete',
      plan: { debt: { amount: 900 } }
    })
  })

  it('creates light created then full finalized when saved signed initially', () => {
    const finalized = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.finalized',
      contenu: plan_content()
    })
    const rows = thread_rows(finalized.thread_id!)
    expect(rows.map((row) => row.type)).toEqual([
      'repayment_plan.created',
      'repayment_plan.finalized'
    ])
    expect(rows[0]?.revision).toBeNull()
    expect(parse_repayment_plan_content(rows[0]!.type, rows[0]!.contenu)).not.toHaveProperty('plan')
    expect(snapshots(finalized.thread_id!).map((row) => row.id)).toEqual([finalized.id])
  })

  it('withdraws a draft without deleting its history', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content()
    })
    delete_activity(ALICE, created.id)
    const rows = thread_rows(created.thread_id!)
    expect(rows.map((row) => row.type)).toEqual(['repayment_plan.created', 'repayment_plan.closed'])
    expect(snapshots(created.thread_id!)).toHaveLength(1)
    expect(parse_repayment_plan_content(rows[1]!.type, rows[1]!.contenu)).toMatchObject({
      reason: 'withdrawn'
    })
  })

  it('enforces one full snapshot per thread in SQLite', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content()
    })
    const db = new Database(DATABASE)
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, mentions, contenu, thread_id, revision
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          '2026-09-10T10:00:00Z',
          'repayment:LOC-1',
          'user:alice@example.org',
          'repayment_plan.updated',
          '[]',
          plan_content(500),
          created.thread_id!
        ]
      )
    ).toThrow(/UNIQUE/)
    db.close()
  })

  it('rejects legacy content', () => {
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" })
      })
    ).toThrow(/Invalid repayment_plan\.created content/)
  })

  it('returns JSON for invalid plan content', async () => {
    const app = new Hono<{ Variables: { user: { email: string } } }>()
    app.use('*', async (context, next) => {
      context.set('user', { email: ALICE })
      await next()
    })
    app.post('/desktop/activities', postActivity)
    const response = await app.request('/desktop/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" })
      })
    })
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_body', message: 'Invalid repayment_plan.created content' }
    })
  })
})
