import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { emptyBulkOperationDefinition } from '../../../../../shared/bulk-operations'
import { get_activity_by_idempotency_key } from '../../../../utils/activities/rows'
import {
  aggregate_bulk_run_with_db,
  get_bulk_report,
  list_bulk_reports
} from '../../../../utils/bulk/reports'
import {
  drain_bulk_jobs,
  set_bulk_clock_for_tests,
  stop_bulk_scheduler
} from '../../../../utils/bulk/scheduler/queue'
import { set_bulk_transport_for_tests } from '../../../../utils/bulk/scheduler/transport'
import { execute_bulk_operation } from '../../../../utils/bulk/send'
import { update_status } from '../../../../utils/bulk/status'
import {
  create_bulk_operation,
  delete_bulk_operation,
  get_bulk_operation,
  update_bulk_operation
} from '../../../../utils/bulk/store'
import { create_outbound } from '../../../../utils/communications/storage'
import { insert_contact_if_absent } from '../../../../utils/contacts'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_bulk_reports'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const ROOT = `datastores/${TEST_SERVICE}`
const DB_PATH = `${ROOT}/datastore.sqlite`
let now = new Date(Date.now() - 60_000)

const drainAll = async (): Promise<void> => {
  for (let index = 0; index < 8; index += 1) {
    now = new Date(now.getTime() + 60_000)
    await drain_bulk_jobs()
    stop_bulk_scheduler()
  }
}

const operation = (reportsToKeep = 10) =>
  create_bulk_operation('alice', {
    name: 'Rapports',
    reportsToKeep,
    definition: {
      ...emptyBulkOperationDefinition(),
      bucketId: 'amiable',
      delivery: {
        kind: 'fallback',
        steps: [
          {
            medium: 'email',
            subject: 'Relance',
            body: 'Bonjour',
            placeholderBindings: {},
            action: 'Relancer'
          }
        ]
      }
    }
  })

const seed = (withRows: boolean): void => {
  const db = new Database(DB_PATH)
  db.run(`
    CREATE TABLE comptes_locataires (
      id_locataire TEXT,
      id_client TEXT,
      montant_en_euros REAL,
      email_client TEXT,
      telephone_client TEXT
    )
  `)
  if (withRows) {
    db.run(
      `INSERT INTO comptes_locataires VALUES
       ('LOC-OK', 'CLI-1', 40, 'ok@example.org', NULL),
       ('LOC-NONE', 'CLI-2', 30, NULL, NULL)`
    )
    insert_contact_if_absent(db, 'ok@example.org', 'ok')
  }
  db.close()
}

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  now = new Date(Date.now() - 60_000)
  set_bulk_clock_for_tests({ now: () => now })
  await mkdir(ROOT, { recursive: true })
  await setup()
})

afterEach(async () => {
  stop_bulk_scheduler()
  set_bulk_transport_for_tests(null)
  set_bulk_clock_for_tests(null)
  await rm(ROOT, { recursive: true, force: true })
})

describe('bulk reports', () => {
  it('conserve un rapport vide terminal sans item', async () => {
    seed(false)
    const bulk = operation()
    const result = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'empty'
    })
    const reports = list_bulk_reports(bulk.id)
    expect(reports).toHaveLength(1)
    expect(reports[0]?.report.status).toBe('ok')
    expect(reports[0]?.report.counts).toEqual({ total: 0, in_progress: 0, ok: 0, ko: 0 })
    expect(reports[0]?.items).toEqual([])
    expect(get_bulk_report(bulk.id, result.execution_id)?.items).toEqual([])
  })

  it('agrège un rapport mixte et expose tous ses items', async () => {
    seed(true)
    const bulk = operation()
    set_bulk_transport_for_tests(async () => 'accepted')
    const result = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'mixed'
    })
    stop_bulk_scheduler()
    await drainAll()
    const detail = get_bulk_report(bulk.id, result.execution_id)
    expect(detail?.report.status).toBe('partial')
    expect(detail?.report.counts).toEqual({ total: 2, in_progress: 0, ok: 1, ko: 1 })
    expect(detail?.items).toHaveLength(2)
    expect(detail?.items.every((item) => item.runAt === null)).toBe(true)
    const listed = list_bulk_reports(bulk.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.items).toHaveLength(2)
    expect(listed[0]?.report.executionId).toBe(result.execution_id)
  })

  it('retourne tous les items sans limite fonctionnelle', async () => {
    seed(false)
    const bulk = operation()
    const result = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'large-report'
    })
    const db = new Database(DB_PATH)
    db.run(
      `WITH RECURSIVE ids(n) AS (
         SELECT 1 UNION ALL SELECT n + 1 FROM ids WHERE n < 2501
       )
       INSERT INTO bulk_jobs (
         id, bulk_operation_id, execution_id, item_id, source, mode,
         report_status, outcome, completed_at, run_at, payload
       )
       SELECT 'item-' || n, ?, ?, 'LOC-' || n, 'comptes_locataires',
              'apply_without_send', 'ok', '{"code":"applied"}',
              '2026-08-28T12:00:00Z', NULL, '{}'
       FROM ids`,
      [bulk.id, result.execution_id]
    )
    aggregate_bulk_run_with_db(db, result.execution_id, '2026-08-28T12:00:00Z')
    db.close()
    const detail = get_bulk_report(bulk.id, result.execution_id)
    expect(detail?.items).toHaveLength(2501)
    expect(detail?.report.counts.ok).toBe(2501)
  })

  it('garde exactement X runs terminés et permet de rejouer une clé purgée', async () => {
    seed(true)
    const bulk = operation(2)
    const first = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'apply_without_send',
      clientCommandId: 'first'
    })
    const second = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'apply_without_send',
      clientCommandId: 'second'
    })
    const third = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'apply_without_send',
      clientCommandId: 'third'
    })
    expect(list_bulk_reports(bulk.id).map((detail) => detail.report.executionId)).toEqual(
      [second.execution_id, third.execution_id].sort().reverse()
    )
    expect(get_bulk_report(bulk.id, first.execution_id)).toBeNull()
    const db = new Database(DB_PATH, { readonly: true })
    expect(
      db
        .query<{ n: number }, [string]>(
          'SELECT COUNT(*) AS n FROM bulk_jobs WHERE execution_id = ?'
        )
        .get(first.execution_id)?.n
    ).toBe(0)
    db.close()

    const replay = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'apply_without_send',
      clientCommandId: 'first'
    })
    expect(replay.execution_id).not.toBe(first.execution_id)
    expect(list_bulk_reports(bulk.id)).toHaveLength(2)
  })

  it('purge immédiatement après réduction sans toucher un run en cours', async () => {
    seed(true)
    const bulk = operation(3)
    const inProgress = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'in-progress'
    })
    stop_bulk_scheduler()
    const emptyDefinition = {
      ...bulk.definition,
      amountRange: { from: '999', to: '999' }
    }
    const updated = update_bulk_operation(bulk.id, 'alice', { definition: emptyDefinition })
    await execute_bulk_operation('alice@example.org', updated, {
      mode: 'send',
      clientCommandId: 'done-1'
    })
    await execute_bulk_operation('alice@example.org', updated, {
      mode: 'send',
      clientCommandId: 'done-2'
    })
    update_bulk_operation(bulk.id, 'alice', { reportsToKeep: 1 })
    const reports = list_bulk_reports(bulk.id)
    expect(reports.filter((detail) => detail.report.status !== 'in_progress')).toHaveLength(1)
    expect(
      reports.find((detail) => detail.report.executionId === inProgress.execution_id)?.report.status
    ).toBe('in_progress')
  })

  it('supprime transactionnellement rapports et travaux mais conserve les activités visibles', async () => {
    seed(true)
    const bulk = operation()
    const result = await execute_bulk_operation('alice@example.org', bulk, {
      mode: 'send',
      clientCommandId: 'delete'
    })
    stop_bulk_scheduler()
    now = new Date(now.getTime() + 61_000)
    await drain_bulk_jobs()
    stop_bulk_scheduler()
    const queued = get_activity_by_idempotency_key(
      `bulk:${result.execution_id}:recipient:LOC-OK:attempt:0`
    )!
    update_status({
      activity_id: queued.id,
      type: 'email',
      statut: 'sent',
      occurred_at: new Date(Date.now() + 60_000).toISOString()
    })
    const second = create_outbound({
      actor: 'alice@example.org',
      contexte: 'repayment',
      ref: 'LOC-NONE',
      type: 'email',
      destinataire: 'none@example.org',
      contenu: '{"version":1,"corps":"queued"}',
      bulk_id: bulk.id,
      execution_id: result.execution_id,
      idempotency_key: `bulk:${result.execution_id}:manual-queued`
    })

    delete_bulk_operation(bulk.id)

    expect(get_bulk_operation(bulk.id)).toBeNull()
    const db = new Database(DB_PATH, { readonly: true })
    expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM bulk_jobs').get()?.n).toBe(0)
    expect(
      db
        .query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM activites WHERE type = 'bulk_run'`)
        .get()?.n
    ).toBe(0)
    const sent = db
      .query<{ statut: string; contenu: string }, [number]>(
        'SELECT statut, contenu FROM activites WHERE id = ?'
      )
      .get(queued.id)
    const cancelled = db
      .query<{ statut: string; contenu: string }, [number]>(
        'SELECT statut, contenu FROM activites WHERE id = ?'
      )
      .get(second.id)
    db.close()
    expect(sent?.statut).toBe('sent')
    expect(sent?.contenu).toContain('bulk_operation_deleted')
    expect(cancelled?.statut).toBe('failed')
    expect(cancelled?.contenu).toContain('bulk_operation_deleted')
  })
})
