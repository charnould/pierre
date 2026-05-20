import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import type { Metadata } from '../../../utils/knowledge/generate-metadata'
import {
  ingest_files,
  normalize_sheet_value,
  parse_numeric_string
} from '../../../utils/knowledge/ingest-files'

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

  it('returns null for empty strings', () => {
    expect(normalize_sheet_value('')).toBeNull()
  })

  it('returns null as-is', () => {
    expect(normalize_sheet_value(null)).toBeNull()
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
