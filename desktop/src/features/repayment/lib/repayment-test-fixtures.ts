import type { TenantRepaymentRow } from './classify-tenants'

export function sampleRepaymentRow(
  overrides: Partial<TenantRepaymentRow> = {}
): TenantRepaymentRow {
  return {
    id_locataire: 'LOC-1',
    id_client: 'CLI-1',
    id_lot: 'LOT-1',
    id_batiment: 'BAT-1',
    id_site: 'SITE-1',
    id_organisation_7: 'ORG-7',
    statut: 'client',
    solde_locataire: 400,
    categorie: 'loyer_principal',
    ratio_dette_loyer: 0.5,
    ...overrides
  }
}
