import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import * as fs from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'

import * as oxfmt from 'oxfmt'
import * as XLSX from 'xlsx'

import type { KnowledgeIngestionEntry } from '../../../utils/knowledge/catalog'
import {
  content_cache_key,
  ingest_files,
  normalize_sheet_value,
  parse_numeric_string,
  save_formatted_file
} from '../../../utils/knowledge/ingest-files'

XLSX.set_fs(fs)

describe('parse_numeric_string', () => {
  it('parses european format with space thousands separator', () => {
    expect(parse_numeric_string('1 234,56')).toBe(1234.56)
  })

  it('parses european format with dot thousands and comma decimal', () => {
    expect(parse_numeric_string('1.234,56')).toBe(1234.56)
  })

  it('parses standard format with period decimal', () => {
    expect(parse_numeric_string('1234,56')).toBe(1234.56)
  })

  it('parses standard format with comma thousands and period decimal', () => {
    expect(parse_numeric_string('1,234.56')).toBe(1234.56)
  })

  it('parses plain integer', () => {
    expect(parse_numeric_string('1234')).toBe(1234)
  })

  it('parses negative number with comma decimal', () => {
    expect(parse_numeric_string('-3,5')).toBe(-3.5)
  })

  it('converts percentage to decimal', () => {
    expect(parse_numeric_string('25%')).toBe(0.25)
  })

  it('converts percentage with space before symbol', () => {
    expect(parse_numeric_string('25 %')).toBe(0.25)
  })

  it('strips euro symbol', () => {
    expect(parse_numeric_string('50 €')).toBe(50)
  })

  it('strips euro symbol with european thousands format', () => {
    expect(parse_numeric_string('1 234,56 €')).toBe(1234.56)
  })

  it('returns null for non-numeric string', () => {
    expect(parse_numeric_string('abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parse_numeric_string('')).toBeNull()
  })

  it('returns null for lone dash', () => {
    expect(parse_numeric_string('-')).toBeNull()
  })

  it('strips dollar symbol', () => {
    expect(parse_numeric_string('99$')).toBe(99)
  })

  it('strips pound symbol', () => {
    expect(parse_numeric_string('£1,234.56')).toBe(1234.56)
  })

  it('strips yen symbol', () => {
    expect(parse_numeric_string('¥500')).toBe(500)
  })

  it('strips rupee symbol', () => {
    expect(parse_numeric_string('₹1 000')).toBe(1000)
  })

  it('handles non-breaking space as thousands separator', () => {
    // \u00A0 is a non-breaking space, used as thousands separator in French locale
    expect(parse_numeric_string('1\u00A0234,56')).toBe(1234.56)
  })
})

describe('normalize_sheet_value', () => {
  it('formats a Date as YYYY-MM-DD in Europe/Paris timezone', () => {
    // 2026-05-20T00:00:00Z is 2026-05-20 02:00 in Paris (UTC+2) → same date
    expect(normalize_sheet_value(new Date('2026-05-20T00:00:00.000Z'))).toBe('2026-05-20')
  })

  it('formats a Date at UTC midnight correctly even when Paris is UTC+2', () => {
    // 2026-01-15T23:00:00Z is 2026-01-16 00:00 in Paris (UTC+1) → next day
    expect(normalize_sheet_value(new Date('2026-01-15T23:00:00.000Z'))).toBe('2026-01-16')
  })

  it('converts DD/MM/YYYY string to YYYY-MM-DD', () => {
    expect(normalize_sheet_value('20/05/2026')).toBe('2026-05-20')
  })

  it('converts DD/MM/YYYY string with leading zeros to YYYY-MM-DD', () => {
    expect(normalize_sheet_value('01/01/2024')).toBe('2024-01-01')
  })

  it('leaves plain strings unchanged', () => {
    expect(normalize_sheet_value('hello world')).toBe('hello world')
  })

  it('converts numeric strings to numbers', () => {
    expect(normalize_sheet_value('1 234,56')).toBe(1234.56)
  })

  it('keeps code_postal as a five-digit string', () => {
    expect(normalize_sheet_value('01000', 'code_postal')).toBe('01000')
    expect(typeof normalize_sheet_value('01000', 'code_postal')).toBe('string')
  })

  it('pads numeric Excel code_postal values', () => {
    expect(normalize_sheet_value(1000, 'code_postal')).toBe('01000')
    expect(normalize_sheet_value('1000', 'Code Postal')).toBe('01000')
  })

  it('returns null for empty or invalid code_postal values', () => {
    expect(normalize_sheet_value('', 'code_postal')).toBeNull()
    expect(normalize_sheet_value(null, 'code_postal')).toBeNull()
    expect(normalize_sheet_value('75-001', 'code_postal')).toBeNull()
  })

  it('keeps code_insee as a string, including leading zeros', () => {
    expect(normalize_sheet_value('01053', 'code_insee')).toBe('01053')
    expect(typeof normalize_sheet_value('01053', 'code_insee')).toBe('string')
    expect(normalize_sheet_value(1053, 'code_insee')).toBe('1053')
  })

  it('keeps code_departement as a string, including Corsican identifiers', () => {
    expect(normalize_sheet_value('01', 'code_departement')).toBe('01')
    expect(normalize_sheet_value('2A', 'code_departement')).toBe('2A')
    expect(normalize_sheet_value(1, 'code_departement')).toBe('1')
  })

  it('returns null for empty strings', () => {
    expect(normalize_sheet_value('')).toBeNull()
  })

  it('returns null as-is', () => {
    expect(normalize_sheet_value(null)).toBeNull()
  })

  it('returns boolean values as-is', () => {
    expect(normalize_sheet_value(true)).toBe(true)
    expect(normalize_sheet_value(false)).toBe(false)
  })

  it('returns numeric values as-is', () => {
    expect(normalize_sheet_value(42)).toBe(42)
    expect(normalize_sheet_value(3.14)).toBe(3.14)
  })

  it('lowercases string values', () => {
    expect(normalize_sheet_value('HELLO WORLD')).toBe('hello world')
  })

  it('collapses multiple spaces in strings', () => {
    expect(normalize_sheet_value('foo   bar')).toBe('foo bar')
  })

  it('trims leading and trailing whitespace from strings', () => {
    expect(normalize_sheet_value('  bonjour  ')).toBe('bonjour')
  })
})

const SERVICE = Bun.env['SERVICE']!
const FILES_DIR = `datastores/${SERVICE}/files`

function missingFileEntry(): KnowledgeIngestionEntry {
  return {
    filename: 'nonexistent_doc.md',
    agent_filename: 'Document inexistant',
    filepath: `${FILES_DIR}/nonexistent_doc.md`,
    type: 'md',
    sheet: 0,
    headers: 0,
    access: 'default',
    coreDataTable: null
  }
}

describe('ingest_files', () => {
  describe('PROFILE_MISSING', () => {
    it('should emit anomaly when access references a non-existent config', async () => {
      const entry: KnowledgeIngestionEntry = {
        filename: 'doc.md',
        agent_filename: 'Doc',
        filepath: `${FILES_DIR}/doc.md`,
        type: 'md',
        sheet: 0,
        headers: 0,
        access: 'ghost_profile_xyz_not_real',
        coreDataTable: null
      }

      const { anomalies } = await ingest_files([entry])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('PROFILE_MISSING')
      const a = anomalies.find((x) => x.code === 'PROFILE_MISSING')
      expect(a?.subject).toBe('ghost_profile_xyz_not_real')
    })
  })

  describe('SOURCE_FILE_MISSING', () => {
    it('should emit anomaly when a catalog source is absent from disk', async () => {
      const { anomalies } = await ingest_files([missingFileEntry()])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('SOURCE_FILE_MISSING')
      const a = anomalies.find((x) => x.code === 'SOURCE_FILE_MISSING')
      expect(a?.subject).toBe('nonexistent_doc.md')
    })
  })
})

describe('content_cache_key', () => {
  it('combines filepath, type, sheet and headers', () => {
    const entry: KnowledgeIngestionEntry = {
      filename: 'reclamations.xlsx',
      agent_filename: 'Réclamations',
      filepath: '/data/reclamations.xlsx',
      type: 'xlsx',
      sheet: 1,
      headers: 2,
      access: 'default',
      coreDataTable: null
    }
    expect(content_cache_key(entry)).toBe('/data/reclamations.xlsx:xlsx:1:2')
  })
})

describe('save_formatted_file', () => {
  it('writes JSON directly without calling oxfmt', async () => {
    const output_path = `${FILES_DIR}/_test_save_json.json`
    const format_spy = spyOn(oxfmt, 'format')

    try {
      await save_formatted_file(output_path, { data: '[{"a":1}]', parser: 'json' })
      expect(format_spy).not.toHaveBeenCalled()
      expect(await Bun.file(output_path).text()).toBe('[{"a":1}]')
    } finally {
      format_spy.mockRestore()
      await Bun.file(output_path)
        .delete()
        .catch(() => {})
    }
  })
})

describe('CSV ingestion', () => {
  it('parses semicolon records and preserves an empty schema', async () => {
    const path = `${FILES_DIR}/_test_csv.csv`
    const knowledgeRoot = `datastores/${SERVICE}/knowledge`
    await Bun.write(path, 'nom;description\nalpha;"ligne 1\nligne 2"')
    await mkdir(`${knowledgeRoot}/testing_purpose_1`, { recursive: true })
    try {
      await ingest_files([
        {
          filename: '_test_csv.csv',
          agent_filename: 'Indicateurs',
          filepath: path,
          type: 'csv',
          sheet: 0,
          headers: 0,
          access: 'testing_purpose_1',
          coreDataTable: null
        }
      ])
      const payload = await Bun.file(`${knowledgeRoot}/testing_purpose_1/indicateurs.json`).json()
      expect(payload).toEqual({
        columns: ['nom', 'description'],
        rows: [{ nom: 'alpha', description: 'ligne 1 ligne 2' }]
      })

      await Bun.write(path, 'nom;description\n')
      await ingest_files([
        {
          filename: '_test_csv.csv',
          agent_filename: 'Indicateurs',
          filepath: path,
          type: 'csv',
          sheet: 0,
          headers: 0,
          access: 'testing_purpose_1',
          coreDataTable: null
        }
      ])
      expect(await Bun.file(`${knowledgeRoot}/testing_purpose_1/indicateurs.json`).json()).toEqual({
        columns: ['nom', 'description'],
        rows: []
      })
    } finally {
      await rm(path, { force: true })
      await rm(`${knowledgeRoot}/testing_purpose_1/indicateurs.json`, { force: true })
    }
  })
})

describe('ingest_files parse cache', () => {
  const CACHE_XLSX = `${FILES_DIR}/_test_cache_shared.xlsx`
  const KNOWLEDGE_ROOT = `datastores/${SERVICE}/knowledge`

  beforeAll(async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['id', 'valeur'],
      ['A1', 1],
      ['A2', 2]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Feuille1')
    XLSX.writeFile(wb, CACHE_XLSX)

    await mkdir(`${KNOWLEDGE_ROOT}/testing_purpose_1`, { recursive: true })
    await mkdir(`${KNOWLEDGE_ROOT}/default`, { recursive: true })
  })

  afterAll(async () => {
    await Bun.file(CACHE_XLSX)
      .delete()
      .catch(() => {})
    await rm(`${KNOWLEDGE_ROOT}/testing_purpose_1/donnees_cache_test.json`, { force: true }).catch(
      () => {}
    )
    await rm(`${KNOWLEDGE_ROOT}/default/donnees_cache_test.json`, { force: true }).catch(() => {})
  })

  it('writes the same parsed xlsx to multiple profiles without re-parsing', async () => {
    const base: Omit<KnowledgeIngestionEntry, 'access'> = {
      filename: '_test_cache_shared.xlsx',
      agent_filename: 'Données cache test',
      filepath: CACHE_XLSX,
      type: 'xlsx',
      sheet: 0,
      headers: 0,
      coreDataTable: null
    }

    const parse_logs: string[] = []
    const original_info = console.info
    console.info = (...args: unknown[]) => {
      const line = args.map(String).join(' ')
      if (line.includes('Parsed _test_cache_shared.xlsx')) parse_logs.push(line)
      original_info(...args)
    }

    try {
      await ingest_files([
        { ...base, access: 'testing_purpose_1' },
        { ...base, access: 'default' }
      ])

      expect(parse_logs).toHaveLength(1)

      const path_a = `${KNOWLEDGE_ROOT}/testing_purpose_1/donnees_cache_test.json`
      const path_b = `${KNOWLEDGE_ROOT}/default/donnees_cache_test.json`
      expect(await Bun.file(path_a).exists()).toBe(true)
      expect(await Bun.file(path_b).exists()).toBe(true)
      expect(await Bun.file(path_a).text()).toBe(await Bun.file(path_b).text())
    } finally {
      console.info = original_info
    }
  })
})
