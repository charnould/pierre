import { TZDate } from '@date-fns/tz'
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns'

/**
 * Returns a human-readable string describing the current date, ISO week number and time,
 * and indicates if today is one of the predefined French public holidays.
 *
 * Returns:
 * - A single string with the formatted date, ISO week and time. If today matches one of the predefined
 *   French public holidays, the string ends with " – today is a French public holiday".
 *
 * Example:
 * - "Monday, July 14, 2025 (Week 29) at 09:30 – today is a French public holiday"
 *
 * @returns {string} Formatted date, ISO week and time, with an optional French public holiday indicator.
 */
export const today_is = (): string => {
  // Define public holidays
  // Source: https://www.service-public.fr/particuliers/actualites/A15406
  // TODO: Update the list of public holidays for 2028, etc.
  const public_french_holidays: { date: string; name: string }[] = [
    { date: '2025-01-01', name: "Jour de l'an" },
    { date: '2025-04-21', name: 'Lundi de Pâques' },
    { date: '2025-05-01', name: 'Fête du travail' },
    { date: '2025-05-08', name: 'Victoire 1945' },
    { date: '2025-05-29', name: 'Ascension' },
    { date: '2025-06-09', name: 'Lundi de Pentecôte' },
    { date: '2025-07-14', name: 'Fête nationale' },
    { date: '2025-08-15', name: 'Assomption' },
    { date: '2025-11-01', name: 'Toussaint' },
    { date: '2025-11-11', name: 'Armistice 1918' },
    { date: '2025-12-25', name: 'Noël' },
    { date: '2026-01-01', name: "Jour de l'an" },
    { date: '2026-04-06', name: 'Lundi de Pâques' },
    { date: '2026-05-01', name: 'Fête du travail' },
    { date: '2026-05-08', name: 'Victoire 1945' },
    { date: '2026-05-14', name: 'Ascension' },
    { date: '2026-05-25', name: 'Lundi de Pentecôte' },
    { date: '2026-07-14', name: 'Fête nationale' },
    { date: '2026-08-15', name: 'Assomption' },
    { date: '2026-11-01', name: 'Toussaint' },
    { date: '2026-11-11', name: 'Armistice 1918' },
    { date: '2026-12-25', name: 'Noël' },
    { date: '2027-01-01', name: "Jour de l'an" },
    { date: '2027-03-29', name: 'Lundi de Pâques' },
    { date: '2027-05-01', name: 'Fête du travail' },
    { date: '2027-05-06', name: 'Ascension' },
    { date: '2027-05-08', name: 'Victoire 1945' },
    { date: '2027-05-17', name: 'Lundi de Pentecôte' },
    { date: '2027-07-14', name: 'Fête nationale' },
    { date: '2027-08-15', name: 'Assomption' },
    { date: '2027-11-01', name: 'Toussaint' },
    { date: '2027-11-11', name: 'Armistice 1918' },
    { date: '2027-12-25', name: 'Noël' }
  ]

  const now = new TZDate(Date.now(), 'Europe/Paris')
  const date = format(now, 'EEEE, MMMM dd, yyyy')
  const time = format(now, 'HH:mm')
  const week = getISOWeek(now)
  const holiday = public_french_holidays.find((h) => isSameDay(now, parseISO(h.date)))

  return `${date} (Week ${week}) at ${time}${holiday ? ` – today is a French public holiday (${holiday.name})` : ''}`
}
