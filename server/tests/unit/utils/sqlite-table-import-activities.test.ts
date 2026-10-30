import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import { import_rows } from '../../../utils/knowledge/sqlite-table-import'

type Activity = { rattachement: string; auteur: string; contenu: string }

const activityDb = () => {
  const db = new Database(':memory:')
  db.run(`
    CREATE TABLE activites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_creation TEXT NOT NULL,
      rattachement TEXT NOT NULL,
      auteur TEXT NOT NULL,
      destinataire TEXT,
      id_client TEXT,
      id_locataire TEXT,
      id_lot TEXT,
      type TEXT NOT NULL,
      channel TEXT,
      mentions TEXT NOT NULL DEFAULT '[]',
      contenu TEXT NOT NULL,
      thread_id TEXT,
      revision INTEGER,
      bulk_id TEXT,
      execution_id TEXT,
      idempotency_key TEXT,
      id_externe TEXT,
      CHECK (json_valid(mentions) AND json_type(mentions) = 'array')
    )
  `)
  return db
}

const activities = (db: Database) =>
  db
    .query<Activity, []>(
      'SELECT rattachement, auteur, contenu FROM activites ORDER BY date_creation, id'
    )
    .all()

const claim = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id_reclamation: 'REQ-1',
  id_locataire: 'LOC-1',
  id_lot: 'LOT-1',
  ...overrides
})

describe('reclamations import activity history', () => {
  test('emits one activity per changed historized field after the first import', async () => {
    const db = activityDb()
    await import_rows(db, 'reclamations', [
      claim({
        dernier_evenement_le: '2026-07-01',
        email_collaborateur_en_charge: 'alice@bailleur.fr'
      })
    ])
    expect(activities(db)).toHaveLength(0)

    await import_rows(db, 'reclamations', [
      claim({
        dernier_evenement_le: '2026-07-02',
        email_collaborateur_en_charge: 'bob@bailleur.fr'
      })
    ])

    const rows = activities(db)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.rattachement === 'tickets:REQ-1')).toBe(true)
    expect(rows.every((row) => row.auteur === 'system:import.hlm')).toBe(true)
    expect(rows.map((row) => JSON.parse(row.contenu).field).sort()).toEqual([
      'dernier_evenement_le',
      'email_collaborateur_en_charge'
    ])
    db.close()
  })

  test('records one full hierarchy path when any segment changes', async () => {
    const db = activityDb()
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'Direction > Agence Mansart' })
    ])
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'Direction > Agence Becquerel' })
    ])

    const rows = activities(db)
    expect(rows).toHaveLength(1)
    expect(JSON.parse(rows[0]!.contenu)).toEqual({
      version: 2,
      field: 'unite_organisationnelle_en_charge_hierarchie',
      before: 'direction > agence_mansart',
      after: 'direction > agence_becquerel'
    })
    db.close()
  })

  test('does not emit changes for equivalent normalized keys and values', async () => {
    const db = activityDb()
    const rows = [claim({ 'État ticket': true })]
    await import_rows(db, 'reclamations', rows)
    await import_rows(db, 'reclamations', rows)

    expect(activities(db)).toHaveLength(0)
    db.close()
  })

  test('ignores typography that normalizes to the same hierarchy', async () => {
    const db = activityDb()
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'Service Proximité' })
    ])
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'service   proximité' })
    ])

    expect(activities(db)).toHaveLength(0)
    db.close()
  })

  test('ignores an accent difference that normalizes to the same hierarchy', async () => {
    const db = activityDb()
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'cote' })
    ])
    await import_rows(db, 'reclamations', [
      claim({ unite_organisationnelle_en_charge_hierarchie: 'côté' })
    ])

    expect(activities(db)).toHaveLength(0)
    db.close()
  })

  test('does not historize snapshots, free hierarchies, or derived qualification columns', async () => {
    const db = activityDb()
    await import_rows(db, 'reclamations', [claim({ message: 'fuite' })])
    await import_rows(db, 'reclamations', [
      claim({
        message: 'fuite corrigée',
        date_extraction: '2026-07-02',
        qualification_hierarchie: 'technique > plomberie',
        domaine: 'technique',
        sous_domaine: 'chauffage',
        motif: 'panne',
        integrite_physique: 'intacte',
        lieu: 'logement',
        obligation_reglementaire: 'bailleur',
        ton: 'neutre'
      })
    ])

    expect(activities(db)).toHaveLength(0)
    db.close()
  })
})
