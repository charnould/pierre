import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import {
  emptyBulkOperationQueryDefinition,
  type BulkOperationQueryDefinition
} from '../../../../../shared/bulk-operations'
import {
  BulkOperationQueryDefinitionSchema,
  compile_query,
  execute_query
} from '../../../../utils/bulk/query'
import type { LedgerColumnMeta } from '../../../../utils/ledger/schema'
import { build_ledger_view_sql } from '../../../../utils/ledger/view'

const movementColumns = [
  'id_locataire',
  'id_client',
  'id_lot',
  'date_exigibilite',
  'montant_en_euros',
  'email_client',
  'telephone_client',
  'adresse'
]
const movementColumnSet = new Set(movementColumns)
const movementColumnMeta: LedgerColumnMeta[] = movementColumns.map((name) => ({
  name,
  type: name === 'montant_en_euros' ? 'REAL' : 'TEXT'
}))
const lotColumns = new Set([
  'id_locataire',
  'id_lot',
  'loyer_mensuel_en_euros',
  'debut_bail',
  'fin_bail'
])

const base = (): BulkOperationQueryDefinition => emptyBulkOperationQueryDefinition()

const database = (): Database => {
  const db = new Database(':memory:')
  db.run(`CREATE TABLE comptes_locataires (
    id_locataire TEXT, id_client TEXT, id_lot TEXT, date_exigibilite TEXT,
    montant_en_euros REAL, email_client TEXT, telephone_client TEXT, adresse TEXT
  )`)
  db.run(`CREATE TABLE lots_locatifs (
    id_locataire TEXT, id_lot TEXT, loyer_mensuel_en_euros REAL,
    debut_bail TEXT, fin_bail TEXT
  )`)
  db.run('CREATE TABLE contacts (value TEXT PRIMARY KEY, status TEXT, checked_at TEXT)')
  db.run(`CREATE TABLE activites (
    id INTEGER PRIMARY KEY, id_locataire TEXT, type TEXT, date_creation TEXT, contenu TEXT
  )`)
  return db
}

const run = (db: Database, definition: BulkOperationQueryDefinition) =>
  execute_query(db, compile_query(definition, movementColumnSet, true, lotColumns, true))

describe('BulkOperationQueryDefinitionSchema', () => {
  it('valide strictement les bornes', () => {
    for (const range of [{ from: 'Infinity' }, { from: 'abc' }, { from: '2', to: '1' }]) {
      expect(() =>
        BulkOperationQueryDefinitionSchema.parse({ ...base(), amountRange: range })
      ).toThrow()
    }
    expect(
      BulkOperationQueryDefinitionSchema.parse({
        ...base(),
        amountRange: { from: '1,5', to: '2' }
      }).amountRange
    ).toEqual({ from: '1,5', to: '2' })
  })

  it('valide les tags contre le catalogue, sans doublon ni intersection', () => {
    expect(() =>
      BulkOperationQueryDefinitionSchema.parse({ ...base(), requiredTags: ['inconnu'] })
    ).toThrow(/Tag inconnu/)
    expect(() =>
      BulkOperationQueryDefinitionSchema.parse({
        ...base(),
        requiredTags: ['décès', 'décès']
      })
    ).toThrow(/dupliqué/)
    expect(() =>
      BulkOperationQueryDefinitionSchema.parse({
        ...base(),
        requiredTags: ['décès'],
        excludedTags: ['décès']
      })
    ).toThrow(/à la fois requis et exclu/)
  })
})

describe('compile_query', () => {
  it('encapsule exactement le builder SQL de la vue Impayés', () => {
    const ledger = build_ledger_view_sql(movementColumnMeta, true, lotColumns, true)
    const compiled = compile_query(base(), movementColumnSet, true, lotColumns)
    expect(compiled.sql).toContain(`FROM (${ledger}) ledger`)
    expect(compiled.sql).not.toContain(' LIMIT ')
  })

  it('conserve solde positif, dernier mouvement, lot, coordonnées et ratio arrondi', () => {
    const db = database()
    db.run(`INSERT INTO comptes_locataires VALUES
      ('LOC-1', 'CLI-1', 'LOT-1', '2026-01-01', 300, 'old@example.org', '0600000000', 'Ancienne'),
      ('LOC-1', 'CLI-1', 'LOT-1', '2026-02-01', 155, 'new@example.org', '0612345678', '1 rue Neuve'),
      ('LOC-0', 'CLI-0', 'LOT-0', '2026-01-01', 0, NULL, NULL, NULL)`)
    db.run(`INSERT INTO lots_locatifs VALUES ('LOC-1', 'LOT-1', 300, '2025-01-01', NULL)`)
    db.run(`INSERT INTO contacts VALUES
      ('new@example.org', 'ok', ''), ('0612345678', 'rcs_compatible', '')`)

    const rows = run(db, base())
    expect(rows).toEqual([
      expect.objectContaining({
        id_locataire: 'LOC-1',
        solde_locataire: 455,
        ratio_dette_loyer: 1.5,
        id_client: 'CLI-1',
        email_client: 'new@example.org',
        telephone_client: '0612345678',
        adresse: '1 rue Neuve',
        email_status: 'ok',
        telephone_status: 'rcs_compatible'
      })
    ])
    db.close()
  })

  it('applique les deux ranges inclusivement et exclut un ratio NULL quand actif', () => {
    const db = database()
    db.run(`INSERT INTO comptes_locataires VALUES
      ('MIN', 'C1', 'L1', '2026-01-01', 100, NULL, NULL, NULL),
      ('MAX', 'C2', 'L2', '2026-01-01', 200, NULL, NULL, NULL),
      ('NULL-RATIO', 'C3', 'L3', '2026-01-01', 150, NULL, NULL, NULL)`)
    db.run(`INSERT INTO lots_locatifs VALUES
      ('MIN', 'L1', 100, NULL, NULL), ('MAX', 'L2', 100, NULL, NULL)`)

    expect(
      run(db, {
        ...base(),
        amountRange: { from: '100', to: '200' },
        unpaidMonthsRange: { from: '1', to: '2' }
      }).map((row) => row['id_locataire'])
    ).toEqual(['MAX', 'MIN'])
    db.close()
  })

  it('applique requiredTags en ALL et excludedTags en NONE sur le dernier snapshot', () => {
    const db = database()
    for (const id of ['ALL', 'OLD', 'NONE']) {
      db.run(
        `INSERT INTO comptes_locataires VALUES (?, ?, NULL, '2026-01-01', 100, NULL, NULL, NULL)`,
        [id, id]
      )
    }
    db.run(`INSERT INTO activites VALUES
      (1, 'ALL', 'repayment_tag_change', '2026-01-01', '{"version":1,"tags":["décès","+65 ans"]}'),
      (2, 'OLD', 'repayment_tag_change', '2026-01-01', '{"version":1,"tags":["décès","+65 ans"]}'),
      (3, 'OLD', 'repayment_tag_change', '2026-02-01', '{"version":1,"tags":["décès","Redémarrage APL"]}')`)

    expect(
      run(db, {
        ...base(),
        requiredTags: ['décès', '+65 ans'],
        excludedTags: ['Redémarrage APL']
      }).map((row) => row['id_locataire'])
    ).toEqual(['ALL'])
    expect(
      run(db, { ...base(), excludedTags: ['décès'] }).map((row) => row['id_locataire'])
    ).toEqual(['NONE'])
    db.close()
  })

  it('ne tronque pas une audience supérieure à 2000 lignes', () => {
    const db = database()
    db.run(`WITH RECURSIVE ids(n) AS (
      SELECT 1 UNION ALL SELECT n + 1 FROM ids WHERE n < 2005
    )
    INSERT INTO comptes_locataires
    SELECT 'LOC-' || n, 'CLI-' || n, NULL, '2026-01-01', 1, NULL, NULL, NULL FROM ids`)
    expect(run(db, base())).toHaveLength(2005)
    db.close()
  })
})
