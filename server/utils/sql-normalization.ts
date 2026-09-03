const SPACE_OR_GROUP_SEPARATOR = /[\s\u00a0\u202f']/g
const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/
const FRENCH_DATE =
  /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?$/

const valid_date_parts = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): boolean => {
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) {
    return false
  }
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day
}

/**
 * Converts imported French/European money to integer cents.
 *
 * Spaces (including NBSP/narrow NBSP) and apostrophes are accepted as grouping
 * separators. When comma and dot coexist, the rightmost one is the decimal
 * separator. Invalid or non-finite values return null so SQLite SUM ignores them.
 */
export const canonical_money_cents = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : null
  }
  if (typeof value !== 'string') return null
  let normalized = value.trim().replace(SPACE_OR_GROUP_SEPARATOR, '')
  if (!normalized) return null

  const sign = normalized.startsWith('-') ? -1 : 1
  if (normalized[0] === '-' || normalized[0] === '+') normalized = normalized.slice(1)
  if (!normalized || !/^[\d.,]+$/.test(normalized)) return null

  const comma = normalized.lastIndexOf(',')
  const dot = normalized.lastIndexOf('.')
  let decimalIndex = -1
  if (comma >= 0 && dot >= 0) {
    decimalIndex = Math.max(comma, dot)
    const decimalSeparator = normalized[decimalIndex]
    const groupingSeparator = decimalSeparator === ',' ? '.' : ','
    const groupedInteger = normalized.slice(0, decimalIndex).split(groupingSeparator)
    if (
      normalized.slice(decimalIndex + 1).includes(groupingSeparator) ||
      (groupedInteger.length > 1 &&
        (groupedInteger[0]!.length < 1 ||
          groupedInteger[0]!.length > 3 ||
          !groupedInteger.slice(1).every((group) => group.length === 3)))
    ) {
      return null
    }
  } else {
    const separator = comma >= 0 ? ',' : dot >= 0 ? '.' : null
    if (separator) {
      const groups = normalized.split(separator)
      const looksLikeGroupedThousands =
        groups.length > 1 &&
        groups[0]!.length >= 1 &&
        groups.slice(1).every((group) => group.length === 3)
      if (groups.length > 2 && !looksLikeGroupedThousands) return null
      if (!looksLikeGroupedThousands) decimalIndex = normalized.lastIndexOf(separator)
    }
  }

  const integerPart = (decimalIndex < 0 ? normalized : normalized.slice(0, decimalIndex)).replace(
    /[.,]/g,
    ''
  )
  const decimalPart =
    decimalIndex < 0 ? '' : normalized.slice(decimalIndex + 1).replace(/[.,]/g, '')
  if (!/^\d+$/.test(integerPart) || (decimalPart && !/^\d+$/.test(decimalPart))) return null

  const amount = Number(`${integerPart}.${decimalPart || '0'}`)
  return Number.isFinite(amount) ? sign * Math.round(amount * 100) : null
}

/**
 * Returns a lexically sortable key for supported dates.
 *
 * Valid ISO and dd/mm/yyyy values sort chronologically under the `1:` prefix.
 * Invalid values use a stable `0:` key, so they always follow valid dates in
 * descending order and remain deterministic with the caller's row-id tie-break.
 */
export const chronological_date_key = (value: unknown): string => {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  const iso = ISO_DATE.exec(raw)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    const hour = Number(iso[4] ?? 0)
    const minute = Number(iso[5] ?? 0)
    const second = Number(iso[6] ?? 0)
    if (valid_date_parts(year, month, day, hour, minute, second)) {
      if (iso[8]) {
        const timestamp = Date.parse(raw)
        if (Number.isFinite(timestamp)) return `1:${new Date(timestamp).toISOString()}`
      }
      const fraction = (iso[7] ?? '').slice(0, 3).padEnd(3, '0')
      return `1:${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
        2,
        '0'
      )}:${String(second).padStart(2, '0')}.${fraction}Z`
    }
  }

  const french = FRENCH_DATE.exec(raw)
  if (french) {
    const day = Number(french[1])
    const month = Number(french[2])
    const year = Number(french[3])
    const hour = Number(french[4] ?? 0)
    const minute = Number(french[5] ?? 0)
    const second = Number(french[6] ?? 0)
    if (valid_date_parts(year, month, day, hour, minute, second)) {
      const fraction = (french[7] ?? '').slice(0, 3).padEnd(3, '0')
      return `1:${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
        2,
        '0'
      )}:${String(second).padStart(2, '0')}.${fraction}Z`
    }
  }

  return `0:${raw}`
}

const sql_compact_text = (expression: string): string =>
  `REPLACE(REPLACE(REPLACE(REPLACE(TRIM(CAST(${expression} AS TEXT)), ' ', ''), ` +
  `char(160), ''), char(8239), ''), '''', '')`

/**
 * SQL equivalent of canonical_money_cents for imported ledger columns.
 *
 * The expression returns integer cents so SUM remains exact for cent-based
 * amounts. It deliberately returns NULL for empty, non-numeric and misplaced
 * sign values.
 */
export const sql_money_cents = (expression: string): string => {
  const raw = sql_compact_text(expression)
  const unsigned = `REPLACE(REPLACE(${raw}, '-', ''), '+', '')`
  const validSign = `(${raw} = ${unsigned} OR ${raw} = '-' || ${unsigned} OR ${raw} = '+' || ${unsigned})`
  const commaCount = `(LENGTH(${raw}) - LENGTH(REPLACE(${raw}, ',', '')))`
  const dotCount = `(LENGTH(${raw}) - LENGTH(REPLACE(${raw}, '.', '')))`
  const commaSuffix = `(LENGTH(${raw}) - INSTR(${raw}, ','))`
  const dotSuffix = `(LENGTH(${raw}) - INSTR(${raw}, '.'))`
  const normalized = `CASE
    WHEN INSTR(${raw}, ',') > 0 AND INSTR(${raw}, '.') > 0 THEN
      CASE
        WHEN INSTR(${raw}, ',') > INSTR(${raw}, '.')
        THEN REPLACE(REPLACE(${raw}, '.', ''), ',', '.')
        ELSE REPLACE(${raw}, ',', '')
      END
    WHEN INSTR(${raw}, ',') > 0 THEN
      CASE
        WHEN ${commaCount} > 1 OR ${commaSuffix} = 3 THEN REPLACE(${raw}, ',', '')
        ELSE REPLACE(${raw}, ',', '.')
      END
    WHEN INSTR(${raw}, '.') > 0 THEN
      CASE
        WHEN ${dotCount} > 1 OR ${dotSuffix} = 3 THEN REPLACE(${raw}, '.', '')
        ELSE ${raw}
      END
    ELSE ${raw}
  END`
  return `CASE
    WHEN ${raw} = ''
      OR ${raw} GLOB '*[^0-9.,+-]*'
      OR NOT ${validSign}
      OR ${unsigned} = ''
      OR ${unsigned} NOT GLOB '*[0-9]*'
      OR (${commaCount} > 1 AND ${dotCount} = 0)
      OR (${dotCount} > 1 AND ${commaCount} = 0)
    THEN NULL
    ELSE ROUND(CAST((${normalized}) AS REAL) * 100)
  END`
}

/**
 * Produces the SQL chronology key used by ledger/activity ordering.
 *
 * ISO values are delegated to SQLite's strftime parser. French dd/mm/yyyy
 * values are rearranged to ISO first and validated by a round-trip. Unsupported
 * values get the stable `0:` prefix and therefore sort after valid `1:` keys.
 */
export const sql_date_key = (expression: string): string => {
  const raw = `TRIM(CAST(${expression} AS TEXT))`
  const frenchDate = `SUBSTR(${raw}, 7, 4) || '-' || SUBSTR(${raw}, 4, 2) || '-' || SUBSTR(${raw}, 1, 2)`
  const frenchTimestamp = `${frenchDate} || CASE WHEN LENGTH(${raw}) > 10 THEN ' ' || SUBSTR(${raw}, 12) ELSE '' END`
  return `CASE
    WHEN ${raw} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*'
      AND STRFTIME('%Y-%m-%d', ${raw}) = SUBSTR(${raw}, 1, 10)
    THEN '1:' || STRFTIME('%Y-%m-%dT%H:%M:%fZ', ${raw})
    WHEN ${raw} GLOB '[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9]*'
      AND STRFTIME('%d/%m/%Y', ${frenchTimestamp}) = SUBSTR(${raw}, 1, 10)
    THEN '1:' || STRFTIME('%Y-%m-%dT%H:%M:%fZ', ${frenchTimestamp})
    ELSE '0:' || ${raw}
  END`
}
