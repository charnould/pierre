import type { DatastoreTableStatus } from '@/shared/types/datastore-tables'

export const COMPTES_LOCATAIRES_TABLE = 'comptes_locataires'

/** True only when the tables report explicitly marks the ledger table as absent. */
export function isComptesLocatairesMissing(
  tables: DatastoreTableStatus[] | null | undefined
): boolean {
  return tables?.find((t) => t.name === COMPTES_LOCATAIRES_TABLE)?.exists === false
}
