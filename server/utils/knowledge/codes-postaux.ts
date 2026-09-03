import { Database } from 'bun:sqlite'
import { join } from 'node:path'

import { SERVER_ROOT } from '../paths'
import { normalize_knowledge_name } from './utils'

/** Stable table name exposed in knowledge and datastore databases. */
export const COMMUNES_PAR_CODE_POSTAL_TABLE = 'communes_par_code_postal'

export const CODES_POSTAUX_COLUMNS = [
  'code_postal',
  'code_insee',
  'nom_commune',
  'nom_epci',
  'nom_departement',
  'code_departement',
  'nom_region',
  'zonage_abc',
  'zonage_123'
] as const

type CodesPostauxColumn = (typeof CODES_POSTAUX_COLUMNS)[number]
export type CodePostalRow = Record<CodesPostauxColumn, string | null>

export const CODES_POSTAUX_CSV_PATH = join(
  SERVER_ROOT,
  'knowledge',
  'Connaissances générales',
  'Géographie',
  'zipcodes.csv'
)

/** Identifier columns whose leading zeros or letters are significant. */
export const KEEP_AS_TEXT_COLUMNS = new Set(['code_postal', 'code_insee', 'code_departement'])

export const is_keep_as_text_column = (column_key: string): boolean =>
  KEEP_AS_TEXT_COLUMNS.has(normalize_knowledge_name(column_key))

export const is_code_postal_column = (column_key: string): boolean =>
  normalize_knowledge_name(column_key) === 'code_postal'

export const stringify_identifier = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const identifier = String(value).trim()
  return identifier === '' ? null : identifier
}

/**
 * Converts an Excel postal-code cell to its canonical five-digit representation.
 * Only integers and digit-only strings are accepted.
 */
export const normalize_code_postal = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  const raw =
    typeof value === 'number'
      ? Number.isSafeInteger(value) && value >= 0
        ? String(value)
        : ''
      : typeof value === 'string'
        ? value.trim()
        : ''

  if (!/^\d{1,5}$/.test(raw)) return null
  return raw.padStart(5, '0')
}

type CsvRecord = { fields: string[]; line: number }

/**
 * Incremental RFC 4180 parser, with semicolons as delimiters.
 * It supports quoted delimiters/newlines and doubled quotes across stream chunks.
 */
class CsvRecordParser {
  readonly #records: CsvRecord[] = []
  #fields: string[] = []
  #field = ''
  #state: 'unquoted' | 'quoted' | 'after_quote' = 'unquoted'
  #line = 1
  #record_line = 1
  #last_was_cr = false

  push(chunk: string): CsvRecord[] {
    for (const character of chunk) this.#push_character(character)
    return this.#drain()
  }

  finish(): CsvRecord[] {
    if (this.#state === 'quoted') {
      throw new Error(`codes-postaux CSV line ${this.#record_line}: unterminated quoted field`)
    }
    if (this.#fields.length > 0 || this.#field !== '' || this.#state === 'after_quote') {
      this.#emit_record()
    }
    return this.#drain()
  }

  #push_character(character: string): void {
    if (this.#last_was_cr) {
      this.#last_was_cr = false
      if (character === '\n') return
    }

    if (this.#state === 'quoted') {
      if (character === '"') {
        this.#state = 'after_quote'
      } else {
        this.#field += character
        if (character === '\n') this.#line++
      }
      return
    }

    if (this.#state === 'after_quote') {
      if (character === '"') {
        this.#field += '"'
        this.#state = 'quoted'
        return
      }
      if (character !== ';' && character !== '\n' && character !== '\r') {
        throw new Error(
          `codes-postaux CSV line ${this.#line}: unexpected character after closing quote`
        )
      }
      this.#state = 'unquoted'
    }

    if (character === ';') {
      this.#fields.push(this.#field)
      this.#field = ''
    } else if (character === '\n' || character === '\r') {
      this.#emit_record()
      this.#line++
      if (character === '\r') this.#last_was_cr = true
      this.#record_line = this.#line
    } else if (character === '"') {
      if (this.#field !== '') {
        throw new Error(`codes-postaux CSV line ${this.#line}: quote inside an unquoted field`)
      }
      this.#state = 'quoted'
    } else {
      this.#field += character
    }
  }

  #emit_record(): void {
    this.#fields.push(this.#field)
    this.#records.push({ fields: this.#fields, line: this.#record_line })
    this.#fields = []
    this.#field = ''
  }

  #drain(): CsvRecord[] {
    return this.#records.splice(0)
  }
}

export const parse_csv_line = (line: string): string[] => {
  const parser = new CsvRecordParser()
  const records = [...parser.push(line), ...parser.finish()]
  if (records.length !== 1) throw new Error('Expected exactly one CSV record')
  return records[0]!.fields
}

const assert_header = ({ fields, line }: CsvRecord): void => {
  const header = [...fields]
  if (header[0]?.startsWith('\uFEFF')) header[0] = header[0].slice(1)
  if (
    header.length !== CODES_POSTAUX_COLUMNS.length ||
    header.some((column, index) => column !== CODES_POSTAUX_COLUMNS[index])
  ) {
    throw new Error(
      `codes-postaux CSV line ${line}: header mismatch: got [${header.join(', ')}], expected [${CODES_POSTAUX_COLUMNS.join(', ')}]`
    )
  }
}

const optional_cell = (value: string): string | null => (value === '' ? null : value)

const validate_record = (record: CsvRecord, seen: Set<string>): CodePostalRow => {
  if (record.fields.length !== CODES_POSTAUX_COLUMNS.length) {
    throw new Error(
      `codes-postaux CSV line ${record.line}: expected ${CODES_POSTAUX_COLUMNS.length} fields, got ${record.fields.length}`
    )
  }

  const [
    code_postal,
    code_insee,
    nom_commune,
    nom_epci,
    nom_departement,
    code_departement,
    nom_region,
    zonage_abc,
    zonage_123
  ] = record.fields as [string, string, string, string, string, string, string, string, string]

  if (!/^\d{5}$/.test(code_postal)) {
    throw new Error(`codes-postaux CSV line ${record.line}: invalid code_postal`)
  }
  if (!/^(?:\d{5}|2[AB]\d{3})$/.test(code_insee)) {
    throw new Error(`codes-postaux CSV line ${record.line}: invalid code_insee`)
  }
  if (!/^(?:\d{2,3}|2[AB])$/.test(code_departement)) {
    throw new Error(`codes-postaux CSV line ${record.line}: invalid code_departement`)
  }
  if (!nom_commune || !nom_departement || !nom_region) {
    throw new Error(`codes-postaux CSV line ${record.line}: missing required locality name`)
  }
  if (zonage_abc && !['A', 'A bis', 'B1', 'B2', 'C'].includes(zonage_abc)) {
    throw new Error(`codes-postaux CSV line ${record.line}: invalid zonage_abc`)
  }
  if (zonage_123 && !['1', '1 bis', '2', '3'].includes(zonage_123)) {
    throw new Error(`codes-postaux CSV line ${record.line}: invalid zonage_123`)
  }

  const key = `${code_postal}\0${code_insee}`
  if (seen.has(key)) {
    throw new Error(
      `codes-postaux CSV line ${record.line}: duplicate code_postal/code_insee (${code_postal}, ${code_insee})`
    )
  }
  seen.add(key)

  return {
    code_postal,
    code_insee,
    nom_commune,
    nom_epci: optional_cell(nom_epci),
    nom_departement,
    code_departement,
    nom_region,
    zonage_abc: optional_cell(zonage_abc),
    zonage_123: optional_cell(zonage_123)
  }
}

const validated_rows = function* (records: Iterable<CsvRecord>): Generator<CodePostalRow> {
  const iterator = records[Symbol.iterator]()
  const header = iterator.next()
  if (header.done) throw new Error('codes-postaux CSV is empty')
  assert_header(header.value)
  const seen = new Set<string>()
  for (let item = iterator.next(); !item.done; item = iterator.next()) {
    yield validate_record(item.value, seen)
  }
}

/** Synchronous parser used by focused validation tests. Production imports stream the file. */
export const parse_codes_postaux_csv = (text: string): CodePostalRow[] => {
  const parser = new CsvRecordParser()
  const records = [...parser.push(text), ...parser.finish()]
  return [...validated_rows(records)]
}

const create_staging_table = (db: Database, table: string): void => {
  db.run(`DROP TABLE IF EXISTS "${table}"`)
  db.run(
    `CREATE TABLE "${table}" (
      code_postal TEXT NOT NULL,
      code_insee TEXT NOT NULL,
      nom_commune TEXT NOT NULL,
      nom_epci TEXT,
      nom_departement TEXT NOT NULL,
      code_departement TEXT NOT NULL,
      nom_region TEXT NOT NULL,
      zonage_abc TEXT,
      zonage_123 TEXT,
      UNIQUE(code_postal, code_insee)
    )`
  )
}

const import_queues = new WeakMap<Database, Promise<void>>()

/**
 * Atomically replaces the postal-code reference table from the versioned CSV.
 * Parsing and inserts are streaming; a malformed or duplicate source leaves the
 * previously published table untouched. Imports sharing one connection are
 * serialized because bun:sqlite transactions and DDL are synchronous per connection.
 */
const import_communes_par_code_postal_table_unqueued = async (
  db: Database,
  source_path = CODES_POSTAUX_CSV_PATH
): Promise<number> => {
  const staging = `${COMMUNES_PAR_CODE_POSTAL_TABLE}__import_${Bun.randomUUIDv7().replaceAll('-', '')}`
  create_staging_table(db, staging)
  const insert = db.prepare(
    `INSERT INTO "${staging}" (${CODES_POSTAUX_COLUMNS.map((column) => `"${column}"`).join(', ')})
     VALUES (${CODES_POSTAUX_COLUMNS.map(() => '?').join(', ')})`
  )
  const parser = new CsvRecordParser()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const seen = new Set<string>()
  const pending_rows: CodePostalRow[] = []
  let header_seen = false
  let count = 0

  const flush = db.transaction(() => {
    for (const row of pending_rows) {
      insert.run(...CODES_POSTAUX_COLUMNS.map((column) => row[column]))
    }
    pending_rows.length = 0
  })

  const consume = (records: CsvRecord[]): void => {
    for (const record of records) {
      if (!header_seen) {
        assert_header(record)
        header_seen = true
        continue
      }
      const row = validate_record(record, seen)
      pending_rows.push(row)
      count++
      if (pending_rows.length === 1000) flush.immediate()
    }
  }

  try {
    const reader = Bun.file(source_path).stream().getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      consume(parser.push(decoder.decode(value, { stream: true })))
    }
    consume(parser.push(decoder.decode()))
    consume(parser.finish())
    if (!header_seen) throw new Error('codes-postaux CSV is empty')
    if (count === 0) throw new Error('codes-postaux CSV has no data rows')
    if (pending_rows.length > 0) flush.immediate()

    db.transaction(() => {
      db.run(`DROP TABLE IF EXISTS "${COMMUNES_PAR_CODE_POSTAL_TABLE}"`)
      db.run(`ALTER TABLE "${staging}" RENAME TO "${COMMUNES_PAR_CODE_POSTAL_TABLE}"`)
      db.run(
        `CREATE INDEX idx_communes_par_code_postal_code_postal
         ON "${COMMUNES_PAR_CODE_POSTAL_TABLE}"(code_postal)`
      )
    }).immediate()
  } catch (error) {
    db.transaction(() => {
      db.run(`DROP TABLE IF EXISTS "${staging}"`)
    }).immediate()
    throw error
  }

  return count
}

export const import_communes_par_code_postal_table = (
  db: Database,
  source_path = CODES_POSTAUX_CSV_PATH
): Promise<number> => {
  const previous = import_queues.get(db) ?? Promise.resolve()
  const current = previous
    .catch(() => {})
    .then(() => import_communes_par_code_postal_table_unqueued(db, source_path))
  const settled = current.then(
    () => {},
    () => {}
  )
  import_queues.set(db, settled)
  return current
}
