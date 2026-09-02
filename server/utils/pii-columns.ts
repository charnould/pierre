/** Colonnes exclues de knowledge/db.sqlite (PII / RGPD). Éditer ici uniquement. */
export const KNOWLEDGE_PII_COLUMNS = new Set([
  'nom_locataire',
  'prenom_locataire',
  'email_locataire',
  'telephone_locataire',
  'adresse',
  'nom_client',
  'email_client',
  'telephone_client',
  'nom_candidat',
  'email_candidat',
  'telephone_candidat',
  'allocataire_caf',
  'sne'
])

/** Returns row copies without {@link KNOWLEDGE_PII_COLUMNS}. Missing keys are a no-op. */
export const strip_pii_from_rows = (
  rows: ReadonlyArray<Record<string, unknown>>
): Record<string, unknown>[] =>
  rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (!KNOWLEDGE_PII_COLUMNS.has(k.toLowerCase().trim())) out[k] = v
    }
    return out
  })
