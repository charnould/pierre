import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'

describe('reclamations import activity history', () => {
  test('emits one activity per changed normative field after the first import', () => {
    const db = new Database(':memory:')
    db.run(`
      CREATE TABLE activites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_creation TEXT NOT NULL,
        rattachement TEXT NOT NULL,
        auteur TEXT NOT NULL,
        id_client TEXT,
        id_locataire TEXT,
        id_lot TEXT,
        type TEXT NOT NULL,
        statut TEXT,
        mentions TEXT NOT NULL DEFAULT '[]',
        contenu TEXT NOT NULL DEFAULT '',
        CHECK (json_valid(mentions) AND json_type(mentions) = 'array')
      )
    `)
    import_json_rows(db, 'reclamations', [
      {
        id_reclamation: 'REQ-1',
        id_locataire: 'LOC-1',
        id_lot: 'LOT-1',
        dernier_evenement_le: '2026-07-01',
        affectation_1: 'alice'
      }
    ])
    expect(db.query('SELECT * FROM activites').all()).toHaveLength(0)

    import_json_rows(db, 'reclamations', [
      {
        id_reclamation: 'REQ-1',
        id_locataire: 'LOC-1',
        id_lot: 'LOT-1',
        dernier_evenement_le: '2026-07-02',
        affectation_1: 'bob'
      }
    ])

    const activities = db
      .query<{ rattachement: string; auteur: string; contenu: string }, []>(
        'SELECT rattachement, auteur, contenu FROM activites ORDER BY date_creation, id'
      )
      .all()
    expect(activities).toHaveLength(2)
    expect(activities.every((row) => row.rattachement === 'tickets:REQ-1')).toBe(true)
    expect(activities.every((row) => row.auteur === 'system:import.hlm')).toBe(true)
    expect(activities.map((row) => JSON.parse(row.contenu).champ).sort()).toEqual([
      'affectation_1',
      'dernier_evenement_le'
    ])
    db.close()
  })

  test('does not emit changes for equivalent normalized keys and values', () => {
    const db = new Database(':memory:')
    db.run(`
      CREATE TABLE activites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_creation TEXT NOT NULL,
        rattachement TEXT NOT NULL,
        auteur TEXT NOT NULL,
        id_client TEXT,
        id_locataire TEXT,
        id_lot TEXT,
        type TEXT NOT NULL,
        statut TEXT,
        mentions TEXT NOT NULL DEFAULT '[]',
        contenu TEXT NOT NULL DEFAULT ''
      )
    `)
    const rows = [
      {
        id_reclamation: 'REQ-1',
        id_locataire: 'LOC-1',
        id_lot: 'LOT-1',
        'État ticket': true
      }
    ]
    import_json_rows(db, 'reclamations', rows)
    import_json_rows(db, 'reclamations', rows)

    expect(db.query('SELECT * FROM activites').all()).toHaveLength(0)
    db.close()
  })
})
