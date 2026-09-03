import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { emptyBulkOperationDefinition } from '../../../../../shared/bulk-operations'
import { get_activity_by_idempotency_key } from '../../../../utils/activities/rows'
import { handle_rich_rcs_reply } from '../../../../utils/bulk/rich-rcs'
import {
  drain_bulk_jobs,
  set_bulk_clock_for_tests,
  stop_bulk_scheduler
} from '../../../../utils/bulk/scheduler/queue'
import {
  set_bulk_transaction_hook_for_tests,
  set_bulk_transport_for_tests
} from '../../../../utils/bulk/scheduler/transport'
import { execute_bulk_operation } from '../../../../utils/bulk/send'
import { set_bulk_status_hook_for_tests, update_status } from '../../../../utils/bulk/status'
import { create_bulk_operation } from '../../../../utils/bulk/store'
import { next_status_timestamp } from '../../../../utils/communications/parsing'
import { create_inbound } from '../../../../utils/communications/storage'
import { insert_contact_if_absent } from '../../../../utils/contacts'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_bulk_operations_send'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const ORIGINAL_FETCH = globalThis.fetch
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
let now = new Date()

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  globalThis.fetch = ORIGINAL_FETCH
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  now = new Date(Date.now() + 60_000)
  set_bulk_clock_for_tests({ now: () => now })
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
  const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`)
  db.run(`
    CREATE TABLE comptes_locataires (
      id_locataire TEXT, id_client TEXT, montant_en_euros REAL,
      nom_locataire TEXT, email_client TEXT, telephone_client TEXT
    )
  `)
  db.run(
    `INSERT INTO comptes_locataires VALUES
      ('LOC-1', 'CLI-1', 40, 'Ada', 'ada@example.org', '0612345678')`
  )
  insert_contact_if_absent(db, 'ada@example.org', 'ok')
  insert_contact_if_absent(db, '+33612345678', 'rcs_compatible')
  db.close()
})

afterEach(async () => {
  stop_bulk_scheduler()
  set_bulk_status_hook_for_tests(null)
  set_bulk_transaction_hook_for_tests(null)
  set_bulk_transport_for_tests(null)
  set_bulk_clock_for_tests(null)
  globalThis.fetch = ORIGINAL_FETCH
  delete Bun.env['CM_PRODUCT_TOKEN']
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('bulk execution', () => {
  it('snapshots inline fallback content without duplicating it in jobs', async () => {
    const operation = create_bulk_operation('alice', {
      name: 'Relance',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'email',
              action: 'Courriel',
              subject: 'Relance {{id}}',
              body: 'Bonjour {{nom}}',
              placeholderBindings: { id: 'id_locataire', nom: 'nom_locataire' }
            }
          ]
        }
      }
    })
    set_bulk_transport_for_tests(async () => 'accepted')
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'send',
      clientCommandId: 'fallback'
    })
    await drain_bulk_jobs(now)
    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    const run = JSON.parse(
      db
        .query<{ contenu: string }, [string]>(
          `SELECT contenu FROM activites WHERE type = 'bulk_run' AND execution_id = ?`
        )
        .get(result.execution_id)!.contenu
    )
    const job = db
      .query<{ payload: string }, [string]>('SELECT payload FROM bulk_jobs WHERE execution_id = ?')
      .get(result.execution_id)!
    db.close()
    expect(run.snapshot.templates).toBeUndefined()
    expect(run.snapshot.operation.definition.delivery.steps[0].body).toContain('{{nom}}')
    expect(job.payload).not.toContain('Bonjour {{nom}}')
    expect(
      get_activity_by_idempotency_key(`bulk:${result.execution_id}:recipient:LOC-1:attempt:0`)
        ?.contenu
    ).toContain('Bonjour Ada')
  })

  it('rolls back activity creation with its job link and retries idempotently', async () => {
    const operation = create_bulk_operation('alice', {
      name: 'Relance atomique',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'email',
              action: 'Courriel',
              subject: 'Relance',
              body: 'Bonjour',
              placeholderBindings: {}
            }
          ]
        }
      }
    })
    set_bulk_transport_for_tests(async () => 'accepted')
    set_bulk_transaction_hook_for_tests((point) => {
      if (point === 'fallback_created') throw new Error('injected transaction failure')
    })
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'send',
      clientCommandId: 'atomic-retry'
    })
    await drain_bulk_jobs(now)

    let db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    expect(
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM activites
           WHERE execution_id = ? AND type = 'email'`
        )
        .get(result.execution_id)?.n
    ).toBe(0)
    expect(
      db
        .query<{ current_activity_id: number | null; attempts: number }, [string]>(
          'SELECT current_activity_id, attempts FROM bulk_jobs WHERE execution_id = ?'
        )
        .get(result.execution_id)
    ).toEqual({ current_activity_id: null, attempts: 1 })
    db.close()

    set_bulk_transaction_hook_for_tests(null)
    now = new Date(now.getTime() + 1_000)
    await drain_bulk_jobs(now)
    set_bulk_status_hook_for_tests(() => {
      throw new Error('injected status failure')
    })
    now = new Date(now.getTime() + 20_000)
    await drain_bulk_jobs(now)

    db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    expect(
      db
        .query<{ statut: string }, [string]>(
          `SELECT statut FROM activites
           WHERE execution_id = ? AND type = 'email'`
        )
        .get(result.execution_id)?.statut
    ).toBe('queued')
    expect(
      db
        .query<{ report_status: string }, [string]>(
          'SELECT report_status FROM bulk_jobs WHERE execution_id = ?'
        )
        .get(result.execution_id)?.report_status
    ).toBe('in_progress')
    db.close()

    set_bulk_status_hook_for_tests(null)
    now = new Date(now.getTime() + 1_000)
    await drain_bulk_jobs(now)
    now = new Date(now.getTime() + 20_000)
    await drain_bulk_jobs(now)

    db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    expect(
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM activites
           WHERE execution_id = ? AND type = 'email'`
        )
        .get(result.execution_id)?.n
    ).toBe(1)
    expect(
      db
        .query<{ report_status: string }, [string]>(
          'SELECT report_status FROM bulk_jobs WHERE execution_id = ?'
        )
        .get(result.execution_id)?.report_status
    ).toBe('ok')
    db.close()
  })

  it('sends rich RCS, follows an exact postback, and applies effects once', async () => {
    Bun.env['CM_PRODUCT_TOKEN'] = 'token'
    globalThis.fetch = Object.assign(
      async (_url: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => {
        const reference = JSON.parse(String(init?.body)).messages.msg[0].reference
        return new Response(
          JSON.stringify({
            errorCode: 0,
            messages: { msg: [{ reference, status: 'Accepted', messageErrorCode: 0 }] }
          }),
          { status: 200 }
        )
      },
      { preconnect: () => {} }
    )
    const operation = create_bulk_operation('alice', {
      name: 'Parcours',
      definition: {
        ...emptyBulkOperationDefinition(),
        bucketId: 'amiable',
        delivery: {
          kind: 'rich_rcs',
          action: 'Relancer',
          replyTimeoutHours: 72,
          placeholderBindings: { nom: 'nom_locataire' },
          nodes: [
            {
              id: 'message_1',
              body: 'Bonjour {{nom}}',
              richContent: {
                conversation: [
                  {
                    text: 'Bonjour {{nom}}',
                    suggestions: [{ action: 'Reply', label: 'Suite', postbackdata: 'suite' }]
                  }
                ]
              },
              transitions: { suite: 'message_2' }
            },
            {
              id: 'message_2',
              body: 'Merci {{nom}}',
              richContent: { conversation: [{ text: 'Merci {{nom}}' }] },
              transitions: {}
            }
          ]
        }
      }
    })
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'send',
      clientCommandId: 'rich'
    })
    await drain_bulk_jobs(now)
    const first = get_activity_by_idempotency_key(
      `bulk:${result.execution_id}:recipient:LOC-1:node:message_1`
    )!
    expect(first.statut).toBe('sent')
    const inbound = create_inbound({
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'rcs',
      auteur: 'tenant:LOC-1',
      contenu: JSON.stringify({ version: 1, corps: 'Suite' }),
      occurred_at: next_status_timestamp(first, now),
      thread_id: first.thread_id ?? undefined,
      idempotency_key: 'cm:reply-1'
    })
    expect(
      handle_rich_rcs_reply(first, inbound, {
        event: { custom: { label: 'Suite', postbackdata: 'suite' } },
        messageContext: `p${first.id}`
      })
    ).toBe(true)
    now = new Date(now.getTime() + 1_000)
    await drain_bulk_jobs(now)
    const second = get_activity_by_idempotency_key(
      `bulk:${result.execution_id}:recipient:LOC-1:node:message_2`
    )!
    update_status({
      activity_id: second.id,
      type: 'rcs',
      statut: 'delivered',
      occurred_at: next_status_timestamp(second, now)
    })
    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    expect(
      db
        .query<{ report_status: string }, [string]>(
          'SELECT report_status FROM bulk_jobs WHERE execution_id = ?'
        )
        .get(result.execution_id)?.report_status
    ).toBe('ok')
    expect(
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM activites
           WHERE execution_id = ? AND type = 'repayment_phase_change'`
        )
        .get(result.execution_id)?.n
    ).toBe(1)
    db.close()
  })

  it('fails rich RCS terminally when CM is not configured', async () => {
    const operation = create_bulk_operation('alice', {
      name: 'Parcours',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'rich_rcs',
          action: 'Relancer',
          replyTimeoutHours: 72,
          placeholderBindings: {},
          nodes: [
            {
              id: 'message_1',
              body: 'Bonjour',
              richContent: { conversation: [{ text: 'Bonjour' }] },
              transitions: {}
            }
          ]
        }
      }
    })
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'send',
      clientCommandId: 'rich-no-token'
    })
    await drain_bulk_jobs(now)
    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    const job = db
      .query<{ report_status: string; outcome: string }, [string]>(
        'SELECT report_status, outcome FROM bulk_jobs WHERE execution_id = ?'
      )
      .get(result.execution_id)!
    db.close()
    expect(job.report_status).toBe('ko')
    expect(job.outcome).toContain('send_failed')
  })

  it('expires an unanswered interactive node at the configured deadline', async () => {
    Bun.env['CM_PRODUCT_TOKEN'] = 'token'
    globalThis.fetch = Object.assign(
      async (_url: URL | RequestInfo, init?: BunFetchRequestInit | RequestInit) => {
        const reference = JSON.parse(String(init?.body)).messages.msg[0].reference
        return new Response(
          JSON.stringify({
            errorCode: 0,
            messages: { msg: [{ reference, status: 'Accepted', messageErrorCode: 0 }] }
          }),
          { status: 200 }
        )
      },
      { preconnect: () => {} }
    )
    const operation = create_bulk_operation('alice', {
      name: 'Expiration',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'rich_rcs',
          action: 'Relancer',
          replyTimeoutHours: 2,
          placeholderBindings: {},
          nodes: [
            {
              id: 'message_1',
              body: 'Répondez',
              richContent: {
                conversation: [
                  {
                    text: 'Répondez',
                    suggestions: [{ action: 'Reply', label: 'Oui', postbackdata: 'oui' }]
                  }
                ]
              },
              transitions: { oui: null }
            }
          ]
        }
      }
    })
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'send',
      clientCommandId: 'rich-timeout'
    })
    await drain_bulk_jobs(now)
    now = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 1)
    await drain_bulk_jobs(now)
    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    const job = db
      .query<{ report_status: string; outcome: string }, [string]>(
        'SELECT report_status, outcome FROM bulk_jobs WHERE execution_id = ?'
      )
      .get(result.execution_id)!
    db.close()
    expect(job.report_status).toBe('ko')
    expect(job.outcome).toContain('reply_timeout')
  })

  it('records the same outbound activity without transport when applying without send', async () => {
    let fetchCalls = 0
    globalThis.fetch = Object.assign(
      async () => {
        fetchCalls += 1
        return new Response('{}', { status: 200 })
      },
      { preconnect: () => {} }
    )
    const operation = create_bulk_operation('alice', {
      name: 'Relance',
      definition: {
        ...emptyBulkOperationDefinition(),
        bucketId: 'amiable',
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'email',
              action: 'Courriel',
              subject: 'Relance {{id}}',
              body: 'Bonjour {{nom}}',
              placeholderBindings: { id: 'id_locataire', nom: 'nom_locataire' }
            }
          ]
        }
      }
    })
    const result = await execute_bulk_operation('alice@example.org', operation, {
      mode: 'apply_without_send',
      clientCommandId: 'apply-no-send'
    })
    const activity = get_activity_by_idempotency_key(
      `bulk:${result.execution_id}:recipient:LOC-1:attempt:0`
    )!
    expect(activity.type).toBe('email')
    expect(activity.statut).toBe('sent')
    expect(activity.contenu).toContain('Courriel')
    expect(activity.contenu).toContain('Bonjour Ada')
    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    expect(
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM activites
           WHERE execution_id = ? AND type = 'bulk_application'`
        )
        .get(result.execution_id)?.n
    ).toBe(0)
    expect(
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM activites
           WHERE execution_id = ? AND type = 'repayment_phase_change'`
        )
        .get(result.execution_id)?.n
    ).toBe(1)
    expect(result.totals.applied).toBe(1)
    db.close()
    expect(fetchCalls).toBe(0)
  })

  it('refuses to execute an incomplete delivery', async () => {
    const operation = create_bulk_operation('alice', {
      name: 'Brouillon',
      definition: emptyBulkOperationDefinition()
    })
    expect(
      operation.definition.delivery.kind === 'fallback' && operation.definition.delivery.steps[0]
    ).toMatchObject({
      body: ''
    })
    await expect(
      execute_bulk_operation('alice@example.org', operation, {
        mode: 'send',
        clientCommandId: 'incomplete'
      })
    ).rejects.toThrow('Le contenu de chaque message est requis.')
  })
})
