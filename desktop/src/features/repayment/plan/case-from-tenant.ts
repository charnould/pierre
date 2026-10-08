import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { type CaseFile, emptyCase, normalize } from './document'

function tenantText(tenant: TenantRepaymentRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tenant[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

export function caseFromTenant(tenant: TenantRepaymentRow): CaseFile {
  const dossier = emptyCase()
  const debt = Math.max(tenant.solde_locataire, 0)
  const rent =
    tenant.ratio_dette_loyer != null && tenant.ratio_dette_loyer > 0
      ? tenant.solde_locataire / tenant.ratio_dette_loyer
      : null

  dossier.identification.identifiant_locataire = tenant.id_locataire || null
  dossier.identification.identifiant_client = tenant.id_client || null
  dossier.identification.identifiant_logement = tenantText(tenant, 'id_lot')
  dossier.identification.adresse.voie = tenantText(tenant, 'adresse')
  dossier.identification.adresse.code_postal = tenantText(tenant, 'code_postal')
  dossier.identification.adresse.commune = tenantText(tenant, 'commune', 'ville', 'nom_commune')
  dossier.dette.montant_restant_du_euros = debt > 0 ? debt : null
  if (rent != null && rent > 0) {
    dossier.budget.loyer_charges_moins_aides_au_logement_euros = rent
  }
  return dossier
}

/** Activity reference: the locataire id typed in the form, after trim. */
export function planLocataireRef(dossier: CaseFile): string | null {
  return normalize(dossier).identification.identifiant_locataire
}
