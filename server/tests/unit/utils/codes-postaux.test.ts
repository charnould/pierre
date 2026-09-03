import { Database } from 'bun:sqlite'
import { afterAll, describe, expect, it } from 'bun:test'

import {
  CODES_POSTAUX_COLUMNS,
  CODES_POSTAUX_CSV_PATH,
  COMMUNES_PAR_CODE_POSTAL_TABLE,
  import_communes_par_code_postal_table,
  is_code_postal_column,
  is_keep_as_text_column,
  normalize_code_postal,
  parse_codes_postaux_csv,
  parse_csv_line
} from '../../../utils/knowledge/codes-postaux'
import { import_json_rows } from '../../../utils/knowledge/sqlite-table-import'

const TEST_CSV = 'datastores/_test_codes_postaux.csv'

afterAll(async () => {
  await Bun.file(TEST_CSV)
    .delete()
    .catch(() => {})
})

const csv = (...rows: string[]): string =>
  [`\uFEFF${CODES_POSTAUX_COLUMNS.join(';')}`, ...rows].join('\n')

describe('normalize_code_postal', () => {
  it('pads Excel numbers and digit-only strings to five digits', () => {
    expect(normalize_code_postal(1000)).toBe('01000')
    expect(normalize_code_postal('1000')).toBe('01000')
    expect(normalize_code_postal('01000')).toBe('01000')
    expect(normalize_code_postal('75001')).toBe('75001')
  })

  it('rejects empty, fractional, signed, contaminated, and overlong values', () => {
    for (const value of [null, undefined, '', '   ', 'abc', '75-001', 1000.5, -1000, '123456']) {
      expect(normalize_code_postal(value)).toBeNull()
    }
  })
})

describe('postal identifier columns', () => {
  it('recognizes normalized postal, INSEE, and department headers', () => {
    expect(is_code_postal_column('Code Postal')).toBe(true)
    expect(is_code_postal_column('code_insee')).toBe(false)
    expect(is_keep_as_text_column('code_postal')).toBe(true)
    expect(is_keep_as_text_column('Code Insee')).toBe(true)
    expect(is_keep_as_text_column('code_departement')).toBe(true)
    expect(is_keep_as_text_column('loyer_mensuel_en_euros')).toBe(false)
  })

  it('keeps identifiers as TEXT and imports the reference for a direct consumer', async () => {
    const db = new Database(':memory:')
    await import_json_rows(db, 'lots', [
      { code_postal: 1000, code_insee: 1053, code_departement: 1 }
    ])

    const types = Object.fromEntries(
      db
        .query<{ name: string; type: string }, []>('PRAGMA table_info("lots")')
        .all()
        .map(({ name, type }) => [name, type])
    )
    const row = db
      .query<{ code_postal: string; code_insee: string; code_departement: string }, []>(
        'SELECT code_postal, code_insee, code_departement FROM lots'
      )
      .get()
    const reference_count = db
      .query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}`)
      .get()!.n
    db.close()

    expect(types).toMatchObject({
      code_postal: 'TEXT',
      code_insee: 'TEXT',
      code_departement: 'TEXT'
    })
    expect(row).toEqual({ code_postal: '01000', code_insee: '1053', code_departement: '1' })
    expect(reference_count).toBe(35_510)
  })
})

describe('codes-postaux CSV parsing', () => {
  it('supports BOM, accents, empty cells, quoted delimiters, newlines, and doubled quotes', () => {
    const content = csv(
      '04120;04039;Castellane;"CC Alpes; Provence ""Sources\nde lumière""";Alpes-de-Haute-Provence;04;Provence-Alpes-Côte d\'Azur;C;3',
      '97133;97123;Saint-Barthélemy;;Saint-Barthélemy;977;Saint-Barthélemy;;'
    )

    const rows = parse_codes_postaux_csv(content)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      code_postal: '04120',
      nom_commune: 'Castellane',
      nom_epci: 'CC Alpes; Provence "Sources\nde lumière"',
      zonage_abc: 'C'
    })
    expect(rows[1]).toMatchObject({
      code_postal: '97133',
      nom_epci: null,
      zonage_abc: null,
      zonage_123: null
    })
  })

  it('parses one quoted line independently', () => {
    expect(parse_csv_line('a;"b;c";"d""e"')).toEqual(['a', 'b;c', 'd"e'])
  })

  it('rejects schema drift, invalid identifiers, duplicate localities, and malformed quoting', () => {
    expect(() => parse_codes_postaux_csv('foo;bar\n1;2')).toThrow(/header mismatch/)
    expect(() =>
      parse_codes_postaux_csv(
        csv('7500X;75056;Paris;Métropole du Grand Paris;Paris;75;Île-de-France;A bis;1')
      )
    ).toThrow(/invalid code_postal/)
    expect(() =>
      parse_codes_postaux_csv(
        csv(
          '75001;75056;Paris;Métropole du Grand Paris;Paris;75;Île-de-France;A bis;1',
          '75001;75056;Paris;Métropole du Grand Paris;Paris;75;Île-de-France;A bis;1'
        )
      )
    ).toThrow(/duplicate/)
    expect(() =>
      parse_codes_postaux_csv(`${CODES_POSTAUX_COLUMNS.join(';')}\n"unterminated`)
    ).toThrow(/unterminated/)
  })
})

describe('communes_par_code_postal import', () => {
  it('streams the versioned source with multiple communes, accents, Corsica, and overseas rows', async () => {
    const db = new Database(':memory:')
    const imported = await import_communes_par_code_postal_table(db)
    const communes = db
      .query<{ nom_commune: string }, []>(
        `SELECT nom_commune FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}
         WHERE code_postal = '01000' ORDER BY nom_commune`
      )
      .all()
      .map(({ nom_commune }) => nom_commune)
    const edge_rows = db
      .query<{ n: number }, []>(
        `SELECT COUNT(*) AS n FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}
         WHERE nom_commune = 'Saint-Denis-lès-Bourg'
            OR code_insee = '2A004'
            OR code_postal = '97133'`
      )
      .get()!.n
    db.close()

    expect(Bun.file(CODES_POSTAUX_CSV_PATH).size).toBe(2_974_398)
    expect(imported).toBe(35_510)
    expect(communes).toEqual(['Bourg-en-Bresse', 'Saint-Denis-lès-Bourg'])
    expect(edge_rows).toBe(5)
  })

  it('is idempotent, has no duplicate locality keys, and provides a postal-code index', async () => {
    const db = new Database(':memory:')
    await import_communes_par_code_postal_table(db)
    await import_communes_par_code_postal_table(db)

    const counts = db
      .query<{ total: number; distinct_keys: number }, []>(
        `SELECT COUNT(*) AS total,
                COUNT(DISTINCT code_postal || char(0) || code_insee) AS distinct_keys
         FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}`
      )
      .get()!
    const indexed = db
      .query<{ n: number }, []>(
        `SELECT COUNT(*) AS n FROM sqlite_master
         WHERE type = 'index' AND tbl_name = '${COMMUNES_PAR_CODE_POSTAL_TABLE}'
           AND sql LIKE '%(code_postal)%'`
      )
      .get()!.n
    db.close()

    expect(counts).toEqual({ total: 35_510, distinct_keys: 35_510 })
    expect(indexed).toBe(1)
  })

  it('serializes concurrent imports on one connection and converges without staging tables', async () => {
    const db = new Database(':memory:')
    const counts = await Promise.all([
      import_communes_par_code_postal_table(db),
      import_communes_par_code_postal_table(db),
      import_communes_par_code_postal_table(db)
    ])

    const published = db
      .query<{ total: number; distinct_keys: number }, []>(
        `SELECT COUNT(*) AS total,
                COUNT(DISTINCT code_postal || char(0) || code_insee) AS distinct_keys
         FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}`
      )
      .get()!
    const staging_tables = db
      .query<{ n: number }, []>(
        `SELECT COUNT(*) AS n FROM sqlite_master
         WHERE type = 'table' AND name LIKE '${COMMUNES_PAR_CODE_POSTAL_TABLE}__import_%'`
      )
      .get()!.n
    db.close()

    expect(counts).toEqual([35_510, 35_510, 35_510])
    expect(published).toEqual({ total: 35_510, distinct_keys: 35_510 })
    expect(staging_tables).toBe(0)
  })

  it('keeps the published table unchanged when strict streaming validation fails', async () => {
    const db = new Database(':memory:')
    await Bun.write(
      TEST_CSV,
      csv('01000;01053;Bourg-en-Bresse;CA du Bassin;Ain;01;Auvergne-Rhône-Alpes;B2;3')
    )
    await import_communes_par_code_postal_table(db, TEST_CSV)

    await Bun.write(
      TEST_CSV,
      csv(
        '01000;01053;Bourg-en-Bresse;CA du Bassin;Ain;01;Auvergne-Rhône-Alpes;B2;3',
        '01000;01053;Doublon;CA du Bassin;Ain;01;Auvergne-Rhône-Alpes;B2;3'
      )
    )
    await expect(import_communes_par_code_postal_table(db, TEST_CSV)).rejects.toThrow(/duplicate/)

    expect(
      db
        .query<{ nom_commune: string }, []>(
          `SELECT nom_commune FROM ${COMMUNES_PAR_CODE_POSTAL_TABLE}`
        )
        .get()
    ).toEqual({ nom_commune: 'Bourg-en-Bresse' })
    expect(
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM sqlite_master
           WHERE type = 'table' AND name LIKE '${COMMUNES_PAR_CODE_POSTAL_TABLE}__import_%'`
        )
        .get()!.n
    ).toBe(0)
    db.close()
  })
})
