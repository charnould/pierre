import { parseLedgerDate } from './ledger-date'

/** Formats a date as `DD/MM/YYYY`, or null if missing/unparseable. */
export function formatDebutBailDisplay(value: unknown): string | null {
  if (value == null || value === '') return null
  const text = typeof value === 'string' ? value.trim() : String(value).trim()
  if (!text) return null

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (slash) {
    const day = slash[1]!.padStart(2, '0')
    const month = slash[2]!.padStart(2, '0')
    return `${day}/${month}/${slash[3]}`
  }

  const date = parseLedgerDate(text)
  if (!date) return null
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
