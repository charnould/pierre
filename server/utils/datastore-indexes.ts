import { Database } from 'bun:sqlite'

const table_exists = (db: Database, name: string): boolean =>
  db
    .query<{ n: number }, [string]>(
      "SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name=?"
    )
    .get(name)!.n > 0

const column_exists = (db: Database, table: string, column: string): boolean =>
  db
    .query<{ name: string }, []>(`PRAGMA table_info("${table}")`)
    .all()
    .some((row) => row.name === column)

/** Indexes for ledger queries on mirrored HLM tables in `datastore.sqlite`. */
export const ensure_datastore_ledger_indexes = (db: Database): void => {
  if (table_exists(db, 'comptes_locataires')) {
    if (column_exists(db, 'comptes_locataires', 'id_client')) {
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_comptes_locataires_id_client ON "comptes_locataires"("id_client")'
      )
    }
    if (column_exists(db, 'comptes_locataires', 'id_locataire')) {
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_comptes_locataires_id_locataire ON "comptes_locataires"("id_locataire")'
      )
      if (column_exists(db, 'comptes_locataires', 'date_exigibilite')) {
        db.run(
          'CREATE INDEX IF NOT EXISTS idx_comptes_locataires_locataire_date ON "comptes_locataires"("id_locataire", "date_exigibilite" DESC)'
        )
      }
    }
  }

  if (table_exists(db, 'lots_locatifs')) {
    if (column_exists(db, 'lots_locatifs', 'id_client')) {
      db.run('CREATE INDEX IF NOT EXISTS idx_lots_id_client ON "lots_locatifs"("id_client")')
    }
    if (column_exists(db, 'lots_locatifs', 'id_lot')) {
      db.run('CREATE INDEX IF NOT EXISTS idx_lots_id_lot ON "lots_locatifs"("id_lot")')
      if (column_exists(db, 'lots_locatifs', 'id_locataire')) {
        db.run(
          'CREATE INDEX IF NOT EXISTS idx_lots_id_lot_id_locataire ON "lots_locatifs"("id_lot", "id_locataire")'
        )
      }
    }
  }
}
