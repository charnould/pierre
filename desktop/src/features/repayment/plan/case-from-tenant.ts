import {
  emptyRepaymentForms,
  HOUSING_COST,
  type RepaymentForms
} from '../../../../../shared/repayment-plan'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { normalize } from './document'

function tenantText(tenant: TenantRepaymentRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tenant[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

export function caseFromTenant(tenant: TenantRepaymentRow): RepaymentForms {
  const forms = emptyRepaymentForms()
  const common = forms.donnees_communes
  common.identification.id_locataire = tenant.id_locataire || null
  common.identification.id_client = tenant.id_client || null
  common.identification.id_lot = tenantText(tenant, 'id_lot')
  common.logement.adresse = tenantText(tenant, 'adresse')
  common.logement.code_postal = tenantText(tenant, 'code_postal')
  common.logement.commune = tenantText(tenant, 'commune', 'ville', 'nom_commune')
  common.bail.debut_bail = tenantText(tenant, 'debut_bail')
  common.compte_locataire.solde_compte_en_euros = Number.isFinite(tenant.solde_locataire)
    ? Math.round(tenant.solde_locataire * 100) / 100
    : null
  const rent =
    tenant.ratio_dette_loyer != null && tenant.ratio_dette_loyer > 0 && tenant.solde_locataire > 0
      ? Math.round((tenant.solde_locataire / tenant.ratio_dette_loyer) * 100) / 100
      : null
  const housing = common.budget.charges_mensuelles.find((line) => line.type === HOUSING_COST)
  if (housing && rent != null) housing.montant_en_euros = rent
  return forms
}

/** Activity reference: the locataire id typed in the form, after trim. */
export function planLocataireRef(forms: RepaymentForms): string | null {
  return normalize(forms).donnees_communes.identification.id_locataire
}
