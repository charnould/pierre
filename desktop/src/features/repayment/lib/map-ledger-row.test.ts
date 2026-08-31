import { describe, expect, test } from 'bun:test'

import { mapLedgerRowToTenantRepaymentRow } from './map-ledger-row'

describe('mapLedgerRowToTenantRepaymentRow', () => {
  test('pass-through all ledger API fields including movement columns', () => {
    const row = mapLedgerRowToTenantRepaymentRow({
      id_client: 'CLI-A',
      id_locataire: 'CLI-A-LOC-1',
      id_lot: 'LOT-A',
      solde_locataire: 400,
      categorie: 'loyer_principal',
      date_exigibilite: '2026-06-05T09:00:00',
      ratio_dette_loyer: 0.5
    })

    expect(row).toMatchObject({
      id_client: 'CLI-A',
      id_locataire: 'CLI-A-LOC-1',
      id_lot: 'LOT-A',
      solde_locataire: 400,
      categorie: 'loyer_principal',
      ratio_dette_loyer: 0.5
    })
  })
})
