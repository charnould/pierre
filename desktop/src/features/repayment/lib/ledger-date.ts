/**
 * Analyse des dates du grand livre.
 *
 * `date_exigibilite` n'est pas garanti ISO : la spécification accepte
 * `YYYY-MM-DDTHH:MM:SS`, `YYYY-MM-DD` et `DD/MM/YYYY`. Les valeurs à barres
 * obliques se lisent **jour/mois/année** — `new Date('05/01/2024')` les lit à
 * l'américaine et renvoie le 1er mai.
 *
 * Ce module est le seul point d'entrée sanctionné : ne jamais passer un
 * `date_exigibilite` à `new Date()`, ni le trier comme du texte.
 */

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/

/**
 * Construit une date locale et rejette les combinaisons impossibles : sans ce
 * contrôle, `new Date(2024, 0, 32)` basculerait silencieusement au 1er février.
 */
function localDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date | null {
  const date = new Date(year, month - 1, day, hours, minutes, seconds)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/** Analyse une date du grand livre. Renvoie `null` si elle est illisible. */
export function parseLedgerDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  // Construite en heure locale : `new Date('2024-01-05')` vaut minuit UTC et
  // désigne donc la veille dans les fuseaux à l'ouest de Greenwich.
  const iso = ISO_DATE_ONLY.exec(text)
  if (iso) return localDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const slash = SLASH_DATE.exec(text)
  if (slash) {
    return localDate(
      Number(slash[3]),
      Number(slash[2]),
      Number(slash[1]),
      Number(slash[4] ?? 0),
      Number(slash[5] ?? 0),
      Number(slash[6] ?? 0)
    )
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Tri chronologique croissant ; les dates illisibles sont renvoyées en fin de liste. */
export function compareLedgerDatesAsc(a: unknown, b: unknown): number {
  const left = parseLedgerDate(a)
  const right = parseLedgerDate(b)
  if (!left) return right ? 1 : 0
  if (!right) return -1
  return left.getTime() - right.getTime()
}

/** Tri chronologique décroissant ; les dates illisibles restent en fin de liste. */
export function compareLedgerDatesDesc(a: unknown, b: unknown): number {
  const left = parseLedgerDate(a)
  const right = parseLedgerDate(b)
  if (!left) return right ? 1 : 0
  if (!right) return -1
  return right.getTime() - left.getTime()
}
