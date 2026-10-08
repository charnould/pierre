const COMMON_FIELD_LABELS: Readonly<Record<string, string>> = {
  id_locataire: 'Locataire',
  id_client: 'Client',
  id_lot: 'Lot',
  id_rpls: 'RPLS',
  id_etage: 'Étage',
  id_entree: 'Entrée',
  id_batiment: 'Bâtiment',
  id_site: 'Site',
  id_secteur: 'Secteur',
  id_agence: 'Agence',
  id_direction: 'Direction',
  id_organisation: 'Organisation',
  code_postal: 'Code postal',
  date_extraction: 'Date d’extraction'
}

export function humanizeFieldName(name: string): string {
  const words = name.trim().replaceAll('_', ' ').replace(/\s+/g, ' ')

  if (!words) return name
  return words.charAt(0).toLocaleUpperCase('fr-FR') + words.slice(1)
}

export function resolveFieldLabel(
  name: string,
  labels: Readonly<Record<string, string>> = {}
): string {
  return labels[name] ?? COMMON_FIELD_LABELS[name] ?? humanizeFieldName(name)
}
