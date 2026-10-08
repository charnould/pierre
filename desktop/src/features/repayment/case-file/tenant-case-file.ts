import {
  emptyRepaymentCaseFile,
  HOUSING_COST,
  type RepaymentCaseFile
} from '@pierre/shared/repayment-case-file'

import type { TenantRepaymentRow } from '../lib/classify-tenants'

function tenantText(tenant: TenantRepaymentRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tenant[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

export function caseFileFromTenant(tenant: TenantRepaymentRow): RepaymentCaseFile {
  const caseFile = emptyRepaymentCaseFile()
  const common = caseFile.donnees_communes
  const rent =
    tenant.ratio_dette_loyer != null && tenant.ratio_dette_loyer > 0 && tenant.solde_locataire > 0
      ? Math.round((tenant.solde_locataire / tenant.ratio_dette_loyer) * 100) / 100
      : null
  return {
    ...caseFile,
    donnees_communes: {
      ...common,
      identification: {
        id_locataire: tenant.id_locataire || null,
        id_client: tenant.id_client || null,
        id_lot: tenantText(tenant, 'id_lot')
      },
      logement: {
        adresse: tenantText(tenant, 'adresse'),
        code_postal: tenantText(tenant, 'code_postal'),
        commune: tenantText(tenant, 'commune', 'ville', 'nom_commune')
      },
      bail: { ...common.bail, debut_bail: tenantText(tenant, 'debut_bail') },
      compte_locataire: {
        ...common.compte_locataire,
        solde_compte_en_euros: Number.isFinite(tenant.solde_locataire)
          ? Math.round(tenant.solde_locataire * 100) / 100
          : null
      },
      budget: {
        ...common.budget,
        charges_mensuelles: common.budget.charges_mensuelles.map((line) =>
          line.type === HOUSING_COST && rent != null ? { ...line, montant_en_euros: rent } : line
        )
      }
    }
  }
}

/** Board row for a case file that is not yet, or not only, a ledger balance. */
export function tenantFromCaseFile(caseFile: RepaymentCaseFile): TenantRepaymentRow {
  const common = caseFile.donnees_communes
  const identification = common.identification
  const adult = common.foyer.adultes[0]
  const balance = common.compte_locataire.solde_compte_en_euros ?? 0
  const rent = common.budget.charges_mensuelles.find(
    (line) => line.type === HOUSING_COST
  )?.montant_en_euros
  return {
    id_locataire: identification.id_locataire ?? '',
    id_client: identification.id_client ?? '',
    solde_locataire: balance,
    ratio_dette_loyer: rent != null && rent > 0 ? Math.round((balance / rent) * 10) / 10 : null,
    id_lot: identification.id_lot,
    adresse: common.logement.adresse,
    code_postal: common.logement.code_postal,
    commune: common.logement.commune,
    debut_bail: common.bail.debut_bail,
    prenom: adult?.prenom,
    nom: adult?.nom,
    statut: 'client'
  }
}
