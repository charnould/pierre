import { describe, expect, it } from 'bun:test'

import { KNOWLEDGE_PII_COLUMNS, strip_pii_from_rows } from '../../../utils/pii-columns'

describe('strip_pii_from_rows', () => {
  it('removes every KNOWLEDGE_PII_COLUMNS key when present', () => {
    const row: Record<string, unknown> = { id_lot: 'LOT-1' }
    for (const col of KNOWLEDGE_PII_COLUMNS) row[col] = `val-${col}`

    const [stripped] = strip_pii_from_rows([row])
    expect(stripped).toEqual({ id_lot: 'LOT-1' })
    for (const col of KNOWLEDGE_PII_COLUMNS) expect(stripped).not.toHaveProperty(col)
  })

  it('is a no-op when no PII keys are present', () => {
    const rows = [{ id_lot: 'LOT-1', loyer_mensuel_en_euros: 620 }]
    expect(strip_pii_from_rows(rows)).toEqual(rows)
  })

  it('strips a partial PII subset without throwing', () => {
    const [stripped] = strip_pii_from_rows([
      { id_lot: 'LOT-1', email_locataire: 'a@b.c', surface_en_m2: 52 }
    ])
    expect(stripped).toEqual({ id_lot: 'LOT-1', surface_en_m2: 52 })
  })

  it('matches keys case-insensitively and trimmed', () => {
    const [stripped] = strip_pii_from_rows([
      { id_lot: 'LOT-1', Email_Locataire: 'a@b.c', ' adresse ': '1 rue X' }
    ])
    expect(stripped).toEqual({ id_lot: 'LOT-1' })
  })

  it('does not mutate the source rows', () => {
    const source = [{ id_lot: 'LOT-1', nom_locataire: 'Becquerel', email_locataire: 'a@b.c' }]
    const snapshot = structuredClone(source)
    strip_pii_from_rows(source)
    expect(source).toEqual(snapshot)
  })

  it('returns an empty array for empty input', () => {
    expect(strip_pii_from_rows([])).toEqual([])
  })
})
