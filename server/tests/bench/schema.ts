import { Database, type SQLQueryBindings } from 'bun:sqlite'
import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

import { ensure_datastore_ledger_indexes } from '../../utils/datastore-indexes'
import baselineSql from '../../utils/datastore-migrations/001-baseline.sql' with { type: 'text' }

type Bindings = SQLQueryBindings[]
type BenchQuery = {
  name: string
  sql: string
  candidateSql?: string
  params: Bindings
  table: string
  candidatePlan?: RegExp
  baselinePlan?: RegExp
  mutation?: boolean
}

const rows = {
  activities: 50_000,
  users: 5_000,
  conversations: 30_000,
  contacts: 30_000,
  automations: 5_000,
  bulkOperations: 200,
  bulkJobs: 40_000,
  hlm: 20_000
}
const planAssertionMinRows = 100
const now = '2026-09-03T06:00:00.000Z'
const sourcePath = (() => {
  const flag = Bun.argv.indexOf('--datastore')
  return flag >= 0 ? Bun.argv[flag + 1] : Bun.env['BENCH_DATASTORE']
})()

const querySql = (query: BenchQuery, candidate: boolean): string =>
  candidate ? (query.candidateSql ?? query.sql) : query.sql

const execute = (db: Database, query: BenchQuery, candidate = false): unknown => {
  const sql = querySql(query, candidate)
  if (!query.mutation) return db.query(sql).all(...query.params)
  db.run('SAVEPOINT schema_bench')
  try {
    const result = db.run(sql, query.params)
    return { changes: result.changes }
  } finally {
    db.run('ROLLBACK TO schema_bench')
    db.run('RELEASE schema_bench')
  }
}

const plan = (db: Database, query: BenchQuery, candidate = false): string => {
  const statement = db.prepare<{ detail: string }, Bindings>(
    `EXPLAIN QUERY PLAN ${querySql(query, candidate)}`
  )
  try {
    return statement
      .all(...query.params)
      .map((row) => row.detail)
      .join(' | ')
  } finally {
    statement.finalize()
  }
}

const medianMs = (db: Database, query: BenchQuery, candidate = false): number => {
  execute(db, query, candidate)
  execute(db, query, candidate)
  const samples = Array.from({ length: 7 }, () => {
    const start = performance.now()
    execute(db, query, candidate)
    return performance.now() - start
  }).sort((a, b) => a - b)
  return samples[3]!
}

const createMirrorTables = (db: Database): void => {
  db.run(`
    CREATE TABLE IF NOT EXISTS comptes_locataires (
      id_locataire TEXT, id_client TEXT, id_lot TEXT, date_exigibilite TEXT,
      montant_en_euros REAL, email_client TEXT, telephone_client TEXT
    );
    CREATE TABLE IF NOT EXISTS lots_locatifs (
      id_locataire TEXT, id_client TEXT, id_lot TEXT, telephone_locataire TEXT
    );
    CREATE TABLE IF NOT EXISTS candidats (
      id_candidat TEXT, id_client TEXT, id_lot TEXT, email_candidat TEXT
    );
    CREATE TABLE IF NOT EXISTS reclamations (
      id_reclamation TEXT, id_locataire TEXT, id_client TEXT, id_lot TEXT, statut TEXT
    );
  `)
}

const seedSynthetic = (db: Database): void => {
  db.run('PRAGMA journal_mode = OFF')
  db.run('PRAGMA synchronous = OFF')
  db.run('PRAGMA temp_store = MEMORY')
  db.run(baselineSql)
  createMirrorTables(db)
  ensure_datastore_ledger_indexes(db)
  db.transaction(() => {
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO users (config, email, role, password_hash, preferences)
       SELECT 'default', printf('User%05d@Example.org', i),
              CASE WHEN i % 20 = 0 THEN 'administrator' ELSE 'user' END, 'hash', '{}'
       FROM n`,
      [rows.users]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO conversations (conv_id, config, role, timestamp, content, metadata)
       SELECT printf('conv-%06d', ((i - 1) / 12) + 1), 'default',
              CASE WHEN i % 2 = 0 THEN 'assistant' ELSE 'user' END,
              strftime('%Y-%m-%dT%H:%M:%SZ', '2024-01-01', '+' || i || ' seconds'),
              'deterministic benchmark message', '{}'
       FROM n`,
      [rows.conversations]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO contacts (value, status, checked_at)
       SELECT CASE WHEN i % 3 = 0 THEN printf('contact%06d@example.invalid', i)
                   ELSE printf('+336%08d', i) END,
              CASE WHEN i % 5 = 0 THEN 'sms_compatible'
                   WHEN i % 3 = 0 THEN 'ok' ELSE 'rcs_compatible' END,
              strftime('%Y-%m-%dT%H:%M:%SZ', '2025-01-01', '+' || i || ' seconds')
       FROM n`,
      [rows.contacts]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO automations
         (id, type, name, status, owner, cron, next_run_at, run_token,
          lease_expires_at, config)
       SELECT printf('auto-%06d', i), CASE WHEN i % 2 = 0 THEN 'report' ELSE 'ticket_reply' END,
              'Benchmark automation', CASE WHEN i % 4 = 0 THEN 'running'
                   WHEN i % 7 = 0 THEN 'paused' ELSE 'scheduled' END,
              'user00001@example.org', '0 8 * * *',
              strftime('%Y-%m-%dT%H:%M:%SZ', '2026-09-01', '+' || i || ' seconds'),
              CASE WHEN i % 4 = 0 THEN printf('token-%06d', i) END,
              CASE WHEN i % 4 = 0 THEN
                strftime('%Y-%m-%dT%H:%M:%SZ', '2026-09-02', '+' || i || ' seconds') END,
              '{}'
       FROM n`,
      [rows.automations]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO bulk_operations (id, name, definition)
       SELECT printf('bulk-%04d', i), 'Benchmark bulk', '{}' FROM n`,
      [rows.bulkOperations]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO bulk_jobs
         (id, bulk_operation_id, execution_id, item_id, source, mode,
          report_status, outcome, completed_at, run_at, attempts, payload)
       SELECT printf('job-%07d', i), printf('bulk-%04d', ((i - 1) % ?) + 1),
              printf('exec-%06d', ((i - 1) / 200) + 1), printf('tenant-%07d', i),
              'comptes_locataires', CASE WHEN i % 2 = 0 THEN 'send' ELSE 'apply_without_send' END,
              CASE WHEN i % 6 = 0 THEN 'in_progress' WHEN i % 5 = 0 THEN 'ko' ELSE 'ok' END,
              CASE WHEN i % 6 = 0 THEN NULL ELSE '{"code":"done"}' END,
              CASE WHEN i % 6 = 0 THEN NULL ELSE '2026-09-02T00:00:00Z' END,
              CASE WHEN i % 6 = 0 THEN
                strftime('%Y-%m-%dT%H:%M:%SZ', '2026-09-02', '+' || i || ' seconds') END,
              i % 4, '{}'
       FROM n`,
      [rows.bulkJobs, rows.bulkOperations]
    )
    db.run(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
       INSERT INTO activites
         (date_creation, rattachement, auteur, destinataire, id_client, id_locataire,
          id_lot, type, statut, mentions, contenu, thread_id, bulk_id, execution_id)
       SELECT strftime('%Y-%m-%dT%H:%M:%SZ', '2025-01-01', '+' || i || ' seconds'),
              CASE WHEN i % 10 = 0 THEN printf('tickets:ticket-%05d', i % 1000)
                   ELSE printf('repayment:tenant-%05d', i % 5000) END,
              'user:user00001@example.org',
              CASE WHEN i % 8 = 0 THEN '+33600000001' END,
              printf('client-%05d', i % 2000), printf('tenant-%05d', i % 5000),
              printf('lot-%05d', i % 8000),
              CASE WHEN i % 20 = 0 THEN 'bulk_run'
                   WHEN i % 8 = 0 THEN 'email'
                   WHEN i % 7 = 0 THEN 'case_assignment' ELSE 'note' END,
              CASE WHEN i % 8 = 0 THEN 'sent' ELSE 'logged' END, '[]',
              CASE WHEN i % 20 = 0 THEN
                json_object('status', CASE WHEN i % 40 = 0 THEN 'ok' ELSE 'in_progress' END,
                  'completed_at', strftime('%Y-%m-%dT%H:%M:%SZ', '2025-01-01', '+' || i || ' seconds'),
                  'snapshot', json_object('confirmed_at', '2025-01-01T00:00:00Z'))
                WHEN i % 8 <> 0 AND i % 7 = 0 THEN
                  json_object('version', 1, 'referent_precedent', NULL,
                    'referent', 'user00001@example.org')
                ELSE '{}' END,
              CASE WHEN i % 8 = 0 AND i % 20 <> 0 THEN printf('thread-%05d', i % 3000) END,
              CASE WHEN i % 20 = 0 THEN printf('bulk-%04d', ((i - 1) % ?) + 1) END,
              CASE WHEN i % 20 = 0 THEN printf('exec-%06d', ((i - 1) / 200) + 1) END
       FROM n`,
      [rows.activities, rows.bulkOperations]
    )
    for (const table of ['comptes_locataires', 'lots_locatifs', 'candidats', 'reclamations']) {
      const id =
        table === 'reclamations'
          ? 'id_reclamation'
          : `id_${table === 'candidats' ? 'candidat' : 'locataire'}`
      const extra =
        table === 'comptes_locataires'
          ? ', date_exigibilite, montant_en_euros, email_client, telephone_client'
          : ''
      const extraValues =
        table === 'comptes_locataires'
          ? ", '2026-01-01', (i % 1000) - 200, printf('tenant%06d@example.invalid', i), printf('+336%08d', i)"
          : ''
      db.run(
        `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?)
         INSERT INTO ${table} (${id}, id_client, id_lot${extra})
         SELECT printf('${table.slice(0, 3)}-%06d', i), printf('client-%05d', i % 2000),
                printf('lot-%05d', i % 8000)${extraValues} FROM n`,
        [rows.hlm]
      )
    }
  }).immediate()
  db.run('ANALYZE')
}

const anonymize = (db: Database): void => {
  const statements = [
    `UPDATE users SET email = printf('user-%d@example.invalid', rowid),
       password_hash = 'redacted', preferences = '{}', avatar = NULL`,
    `UPDATE conversations SET conv_id = printf('conversation-%d', rowid),
       content = 'redacted', metadata = '{}'`,
    `UPDATE contacts SET value = CASE WHEN value LIKE '%@%' THEN
       printf('contact-%d@example.invalid', rowid) ELSE printf('+339%08d', rowid) END`,
    `UPDATE activites SET auteur = 'user:redacted@example.invalid',
       destinataire = CASE WHEN destinataire IS NULL THEN NULL ELSE 'redacted' END,
       contenu = '{}', mentions = '[]'`,
    `UPDATE automations SET owner = 'redacted@example.invalid', mentions = '[]',
       name = 'redacted', description = '', config = '{}'`,
    `UPDATE bulk_operations SET name = 'redacted', description = '',
       definition = '{}', edits = '[]'`,
    `UPDATE bulk_jobs SET outcome = CASE WHEN outcome IS NULL THEN NULL ELSE '{}' END,
       last_error = CASE WHEN last_error IS NULL THEN NULL ELSE 'redacted' END, payload = '{}'`
  ]
  db.transaction(() => {
    for (const sql of statements) {
      const table = sql.match(/^UPDATE (\w+)/)?.[1]
      if (table && db.query(`PRAGMA table_info("${table}")`).all().length > 0) db.run(sql)
    }
    for (const table of ['comptes_locataires', 'lots_locatifs', 'candidats', 'reclamations']) {
      const columns = db
        .query<{ name: string; type: string }, []>(`PRAGMA table_info("${table}")`)
        .all()
        .filter((column) => /TEXT|CHAR|CLOB/i.test(column.type))
      for (const column of columns) {
        const quoted = `"${column.name.replaceAll('"', '""')}"`
        db.run(
          `UPDATE "${table}" SET ${quoted} = CASE WHEN ${quoted} IS NULL THEN NULL
           ELSE printf('${table.slice(0, 3)}-${column.name.slice(0, 3)}-%d', rowid) END`
        )
      }
    }
  }).immediate()
  db.run('ANALYZE')
}

const candidateIndexes = `
  CREATE INDEX bench_users_lower_email ON users(lower(email));
  CREATE INDEX bench_contacts_stale ON contacts(checked_at)
    WHERE status = 'sms_compatible' AND value NOT LIKE '%@%';
  CREATE INDEX bench_automations_stuck ON automations(lease_expires_at)
    WHERE status = 'running' AND run_token IS NOT NULL;
  CREATE INDEX bench_candidats_id ON candidats(id_candidat);
  CREATE INDEX bench_reclamations_id ON reclamations(id_reclamation);
`

const queries: BenchQuery[] = [
  {
    name: 'bulk queue',
    sql: `SELECT id, bulk_operation_id, execution_id, item_id, attempts,
                 current_activity_id, payload FROM bulk_jobs
          WHERE report_status = 'in_progress' AND run_at IS NOT NULL
            AND run_at <= ?
          ORDER BY run_at, id LIMIT 100`,
    params: [now],
    table: 'bulk_jobs',
    baselinePlan: /idx_bulk_jobs_due/,
    candidatePlan: /idx_bulk_jobs_due/
  },
  {
    name: 'bulk report items',
    sql: `SELECT * FROM bulk_jobs WHERE execution_id = ? ORDER BY item_id`,
    params: ['exec-000050'],
    table: 'bulk_jobs',
    baselinePlan: /sqlite_autoindex_bulk_jobs_2/,
    candidatePlan: /sqlite_autoindex_bulk_jobs_2/
  },
  {
    name: 'bulk reports',
    sql: `SELECT auteur, bulk_id, execution_id, contenu FROM activites
          WHERE type = 'bulk_run' AND bulk_id = ?
          ORDER BY COALESCE(json_extract(contenu, '$.completed_at'),
             json_extract(contenu, '$.snapshot.confirmed_at')) DESC, execution_id DESC`,
    params: ['bulk-0040'],
    table: 'activites',
    baselinePlan: /idx_activites_bulk_reports/,
    candidatePlan: /idx_activites_bulk_reports/
  },
  {
    name: 'activity thread',
    sql: `SELECT * FROM activites WHERE rattachement = ? AND type = ?
          AND thread_id IS NOT NULL ORDER BY date_creation, id`,
    params: ['repayment:tenant-00008', 'email'],
    table: 'activites',
    baselinePlan: /idx_activites_rattachement/,
    candidatePlan: /idx_activites_rattachement/
  },
  {
    name: 'activity feed',
    sql: `SELECT * FROM activites WHERE rattachement = ?
          ORDER BY date_creation DESC, id DESC LIMIT 100`,
    params: ['repayment:tenant-00001'],
    table: 'activites',
    baselinePlan: /idx_activites_rattachement/,
    candidatePlan: /idx_activites_rattachement/
  },
  {
    name: 'activity inbound',
    sql: `SELECT a.rattachement, a.thread_id, MAX(a.id_locataire)
          FROM activites a WHERE a.type = ? AND a.thread_id IN (
            SELECT thread_id FROM activites
            WHERE type = ? AND destinataire = ? AND thread_id IS NOT NULL
          ) AND a.rattachement NOT LIKE 'a_qualifier:%'
          GROUP BY a.rattachement, a.thread_id HAVING MAX(a.date_creation) >= ?`,
    params: ['email', 'email', '+33600000001', '2025-01-01T00:00:00Z'],
    table: 'activites',
    baselinePlan: /idx_activites_inbound_thread/,
    candidatePlan: /idx_activites_inbound_thread/
  },
  {
    name: 'users lower(email)',
    sql: `SELECT preferences FROM users WHERE lower(email) = ? LIMIT 1`,
    params: ['user00001@example.org'],
    table: 'users',
    candidatePlan: /bench_users_lower_email/
  },
  {
    name: 'conversation thread',
    sql: `SELECT * FROM conversations WHERE conv_id = ? ORDER BY timestamp`,
    params: ['conv-000050'],
    table: 'conversations',
    baselinePlan: /sqlite_autoindex_conversations_1/,
    candidatePlan: /sqlite_autoindex_conversations_1/
  },
  {
    name: 'conversations recent',
    sql: `SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 100`,
    params: [],
    table: 'conversations',
    baselinePlan: /idx_conversations_timestamp/,
    candidatePlan: /idx_conversations_timestamp/
  },
  {
    name: 'contacts stale refresh',
    sql: `UPDATE contacts SET status = 'rcs_compatible', checked_at = ?
          WHERE status = 'sms_compatible' AND checked_at <= ? AND value NOT LIKE '%@%'`,
    params: [now, '2026-03-03T06:00:00Z'],
    table: 'contacts',
    candidatePlan: /bench_contacts_stale/,
    mutation: true
  },
  {
    name: 'automations due',
    sql: `SELECT id FROM automations WHERE status = 'scheduled'
          AND next_run_at IS NOT NULL AND next_run_at <= ?`,
    params: [now],
    table: 'automations',
    baselinePlan: /idx_automations_due/,
    candidatePlan: /idx_automations_due/
  },
  {
    name: 'automations stuck',
    sql: `SELECT id, run_token FROM automations WHERE status = 'running'
          AND run_token IS NOT NULL AND lease_expires_at <= ?`,
    params: [now],
    table: 'automations',
    candidatePlan: /bench_automations_stuck/
  },
  ...(
    [
      ['HLM tenant', 'comptes_locataires', 'id_locataire', 'com-000100'],
      ['HLM lots tenant', 'lots_locatifs', 'id_locataire', 'lot-000100'],
      ['HLM lot', 'lots_locatifs', 'id_lot', 'lot-00100'],
      ['HLM candidate', 'candidats', 'id_candidat', 'can-000100'],
      ['HLM reclamation', 'reclamations', 'id_reclamation', 'rec-000100']
    ] as const
  ).map(
    ([name, table, column, value]) =>
      ({
        name,
        sql: `SELECT * FROM ${table} WHERE ${column} = ? LIMIT 1`,
        params: [value],
        table,
        candidatePlan: /USING (?:COVERING )?INDEX/
      }) satisfies BenchQuery
  )
]

const tableRows = (db: Database, table: string): number =>
  db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM "${table}"`).get()!.n

const size = (
  db: Database
): {
  pages: number
  bytes: number
  indexes?: number
  candidateIndexes?: Record<string, number>
} => {
  const pageSize = db.query<{ page_size: number }, []>('PRAGMA page_size').get()!.page_size
  const pages = db.query<{ page_count: number }, []>('PRAGMA page_count').get()!.page_count
  try {
    const indexes = db
      .query<{ bytes: number }, []>(
        `SELECT COALESCE(SUM(pgsize), 0) AS bytes FROM dbstat
         WHERE name IN (SELECT name FROM sqlite_master WHERE type = 'index')`
      )
      .get()!.bytes
    const candidateIndexes = Object.fromEntries(
      db
        .query<{ name: string; bytes: number }, []>(
          `SELECT name, SUM(pgsize) AS bytes FROM dbstat
           WHERE name LIKE 'bench_%' GROUP BY name ORDER BY name`
        )
        .all()
        .map((row) => [row.name, row.bytes])
    )
    return { pages, bytes: pages * pageSize, indexes, candidateIndexes }
  } catch {
    return { pages, bytes: pages * pageSize }
  }
}

const main = async (): Promise<void> => {
  const root = await mkdtemp(`${tmpdir()}/pierre-schema-bench-`)
  const baselinePath = resolve(root, 'baseline.sqlite')
  const candidatePath = resolve(root, 'candidate.sqlite')
  try {
    let baseline: Database
    if (sourcePath) {
      const absolute = resolve(sourcePath)
      const source = new Database(absolute, { readonly: true, strict: true })
      try {
        await mkdir(dirname(baselinePath), { recursive: true })
        await Bun.write(baselinePath, source.serialize())
      } finally {
        source.close()
      }
      baseline = new Database(baselinePath, { strict: true })
      createMirrorTables(baseline)
      ensure_datastore_ledger_indexes(baseline)
      anonymize(baseline)
      console.log('mode: anonymized datastore clone')
    } else {
      baseline = new Database(baselinePath, { create: true, strict: true })
      seedSynthetic(baseline)
      console.log(`mode: deterministic synthetic (${JSON.stringify(rows)})`)
    }
    await Bun.write(candidatePath, baseline.serialize())
    const candidate = new Database(candidatePath, { strict: true })
    candidate.run(candidateIndexes)
    candidate.run('ANALYZE')

    console.log('query                         baseline ms  candidate ms  change')
    const rowCounts = new Map<string, number>()
    for (const query of queries) {
      const baselineResult = execute(baseline, query)
      const candidateResult = execute(candidate, query, true)
      assert.deepStrictEqual(candidateResult, baselineResult, `${query.name}: results differ`)
      const baselinePlan = plan(baseline, query)
      const candidatePlan = plan(candidate, query, true)
      const count = rowCounts.get(query.table) ?? tableRows(baseline, query.table)
      rowCounts.set(query.table, count)
      const assertPlans = count >= planAssertionMinRows
      if (query.baselinePlan && assertPlans) {
        assert.match(
          baselinePlan,
          query.baselinePlan,
          `${query.name}: baseline plan: ${baselinePlan}`
        )
      }
      if (query.candidatePlan && assertPlans) {
        assert.match(
          candidatePlan,
          query.candidatePlan,
          `${query.name}: candidate plan: ${candidatePlan}`
        )
      }
      const before = medianMs(baseline, query)
      const after = medianMs(candidate, query, true)
      console.log(
        `${query.name.padEnd(29)} ${before.toFixed(3).padStart(11)}  ${after
          .toFixed(3)
          .padStart(12)}  ${(((after - before) / Math.max(before, 0.0001)) * 100)
          .toFixed(1)
          .padStart(6)}%`
      )
      console.log(`  baseline:  ${baselinePlan}`)
      console.log(`  candidate: ${candidatePlan}`)
      if (!assertPlans && (query.baselinePlan || query.candidatePlan)) {
        console.log(
          `  plan assertions skipped: ${query.table} has ${count} rows (<${planAssertionMinRows})`
        )
      }
    }
    const beforeSize = size(baseline)
    const afterSize = size(candidate)
    console.log('size:', {
      baseline: beforeSize,
      candidate: afterSize,
      addedBytes: afterSize.bytes - beforeSize.bytes,
      addedIndexBytes:
        beforeSize.indexes == null || afterSize.indexes == null
          ? 'unavailable'
          : afterSize.indexes - beforeSize.indexes,
      candidateIndexBytes: afterSize.candidateIndexes ?? 'unavailable'
    })
    candidate.close()
    baseline.close()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await main()
