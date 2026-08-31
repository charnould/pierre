import { parseLedgerDate } from './ledger-date'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Repère du jour civil, exprimé sur l'échelle UTC.
 *
 * Deux minuits *locaux* ne sont pas toujours séparés d'un multiple de 24 h : la
 * nuit du passage à l'heure d'été n'en compte que 23, et un écart d'un jour y
 * était arrondi à 0. L'échelle UTC rend l'écart exact.
 */
function localDayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Date calendaire locale `YYYY-MM-DD` (pour tests : passer `now`). */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Jours calendaires depuis un événement jusqu’à une référence :
 * `max(0, jour(référence) − jour(événement))`.
 * Retourne 0 si date invalide, même jour, ou événement après la référence.
 */
export function daysSinceIsoDate(eventIso: string, referenceIso: string): number {
  const reference = parseLedgerDate(referenceIso)
  const event = parseLedgerDate(eventIso)
  if (!reference || !event) return 0

  const diffMs = localDayIndex(reference) - localDayIndex(event)
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY))
}

/** `aujourd’hui − date` (jour civil local). */
export function daysSinceToday(eventIso: string, now: Date = new Date()): number {
  return daysSinceIsoDate(eventIso, todayIsoDate(now))
}

/**
 * Nombre de jours calendaires écoulés entre deux dates (valeur absolue).
 *
 * Accepte tout format reconnu par `parseLedgerDate` — ISO, mais aussi le
 * `DD/MM/YYYY` du grand livre, qui se lit jour/mois/année.
 * Retourne 0 si l'une des dates est invalide.
 */
export function daysElapsedBetweenIsoDates(recent: string, older: string): number {
  const recentDate = parseLedgerDate(recent)
  const olderDate = parseLedgerDate(older)
  if (!recentDate || !olderDate) return 0

  const diffMs = Math.abs(localDayIndex(recentDate) - localDayIndex(olderDate))
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY))
}
