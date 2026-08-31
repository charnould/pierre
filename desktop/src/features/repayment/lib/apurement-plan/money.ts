/**
 * Parse un montant saisi au clavier : `"1 234,56"`, `"1.234,56"`, `"1,234.56"`
 * ou `"1234.56"` → `1234.56`. Vide ou non reconnu → `0`.
 *
 * Le séparateur décimal est le dernier des deux caractères `,` et `.`
 * rencontrés, l'autre étant alors un séparateur de milliers — même règle qu'à
 * l'import (`parse_numeric_string`, `server/utils/knowledge/ingest-files.ts`),
 * pour qu'une saisie et une donnée ingérée se lisent identiquement.
 *
 * Les espaces sont retirés quel que soit leur codet : `\s` couvre l'espace
 * insécable U+00A0 et l'espace insécable étroite U+202F, celle qu'émet
 * `Intl.NumberFormat('fr-FR')` — la sortie de `formatMoneyInput` se relit donc.
 */
export function parseMoneyInput(raw: string): number {
  const normalized = normalizeDecimalSeparators(raw.replace(/[€$£¥₹]/g, '').replace(/\s/g, ''))
  // Une saisie qui n'est pas exactement un nombre est rejetée plutôt que
  // tronquée : lire « 1 234,56 » comme 1 serait pire que de ne rien lire.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return 0
  return Number(normalized)
}

function normalizeDecimalSeparators(text: string): string {
  const lastComma = text.lastIndexOf(',')
  const lastPeriod = text.lastIndexOf('.')
  if (lastComma > lastPeriod) return text.replaceAll('.', '').replace(',', '.')
  if (lastPeriod > lastComma) return text.replaceAll(',', '')
  return text
}

/** Format number for money input display (virgule décimale). */
export function formatMoneyInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatMoneyDisplay(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}
