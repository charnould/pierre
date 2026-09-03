import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import * as fs from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'

import * as oxfmt from 'oxfmt'
import * as XLSX from 'xlsx'

import type { Metadata } from '../../../utils/knowledge/generate-metadata'
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
const GHOST_FILE = `${FILES_DIR}/_test_ghost_file_for_ingest.md`

// Build a minimal valid Metadata entry for a file that does NOT exist on disk
function missingFileEntry(): Metadata {
  return {
    filename: 'nonexistent_doc.md',
    agent_filename: 'Document inexistant',
    filepath: `${FILES_DIR}/nonexistent_doc.md`,
    type: 'md',
    sheet: 0,
    headers: 0,
    access: 'default',
    last_modified: '2024-01-01T00:00:00+00:00'
  }
}

describe('ingest_files', () => {
  describe('PROFILE_MISSING_IN_ASSETS', () => {
    it('should emit anomaly when access references a non-existent config', async () => {
      const entry: Metadata = {
        filename: 'doc.md',
        agent_filename: 'Doc',
        filepath: `${FILES_DIR}/doc.md`,
        type: 'md',
        sheet: 0,
        headers: 0,
        access: 'ghost_profile_xyz_not_real',
        last_modified: '2024-01-01T00:00:00+00:00'
      }

      const { anomalies } = await ingest_files([entry])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('PROFILE_MISSING_IN_ASSETS')
      const a = anomalies.find((x) => x.code === 'PROFILE_MISSING_IN_ASSETS')
      expect(a?.subject).toBe('ghost_profile_xyz_not_real')
    })
  })

  describe('METADATA_NOT_IN_FILES', () => {
    it('should emit anomaly when file is in metadata but absent from disk', async () => {
      const { anomalies } = await ingest_files([missingFileEntry()])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('METADATA_NOT_IN_FILES')
      const a = anomalies.find((x) => x.code === 'METADATA_NOT_IN_FILES')
      expect(a?.subject).toBe('nonexistent_doc.md')
    })
  })

  describe('FILE_NOT_IN_METADATA', () => {
    beforeAll(async () => {
      await Bun.write(GHOST_FILE, '# Ghost file\nThis file has no metadata entry.')
    })

    afterAll(async () => {
      await Bun.file(GHOST_FILE)
        .delete()
        .catch(() => {})
    })

    it('should emit anomaly for disk file not referenced in metadata', async () => {
      // Pass empty metadata so the ghost file is definitely not referenced
      const { anomalies } = await ingest_files([])
      const fnim = anomalies.filter((a) => a.code === 'FILE_NOT_IN_METADATA')
      const subjects = fnim.map((a) => a.subject)
      expect(subjects).toContain('_test_ghost_file_for_ingest.md')
    })
  })

  describe('PROFILE_NOT_IN_METADATA', () => {
    it('should emit info for any config not present in metadata', async () => {
      const { anomalies } = await ingest_files([])
      const profiles = anomalies
        .filter((a) => a.code === 'PROFILE_NOT_IN_METADATA')
        .map((a) => a.subject)
      expect(profiles).toContain('demo')
    })

    it('should NOT emit PROFILE_NOT_IN_METADATA when config id is present in metadata', async () => {
      const entry: Metadata = {
        filename: 'doc.md',
        agent_filename: 'Doc',
        filepath: `${FILES_DIR}/doc.md`,
        type: 'md',
        sheet: 0,
        headers: 0,
        access: 'testing_purpose_1',
        last_modified: '2024-01-01T00:00:00+00:00'
      }
      const { anomalies } = await ingest_files([entry])
      const profiles = anomalies
        .filter((a) => a.code === 'PROFILE_NOT_IN_METADATA')
        .map((a) => a.subject)
      expect(profiles).not.toContain('testing_purpose_1')
    })
  })
})

describe('content_cache_key', () => {
  it('combines filepath, type, sheet and headers', () => {
    const metadata: Metadata = {
      filename: 'reclamations.xlsx',
      agent_filename: 'Réclamations',
      filepath: '/data/reclamations.xlsx',
      type: 'xlsx',
      sheet: 1,
      headers: 2,
      access: 'default',
      last_modified: '2024-01-01T00:00:00+00:00'
    }
    expect(content_cache_key(metadata)).toBe('/data/reclamations.xlsx:xlsx:1:2')
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
    const base: Omit<Metadata, 'access'> = {
      filename: '_test_cache_shared.xlsx',
      agent_filename: 'Données cache test',
      filepath: CACHE_XLSX,
      type: 'xlsx',
      sheet: 0,
      headers: 0,
      last_modified: '2024-01-01T00:00:00+00:00'
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
