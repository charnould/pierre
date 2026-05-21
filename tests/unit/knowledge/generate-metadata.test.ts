import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'

import * as XLSX from 'xlsx'

import { generate_metadata } from '../../../utils/knowledge/generate-metadata'

XLSX.set_fs(fs)

const METADATA_PATH = `datastores/${Bun.env['SERVICE']}/files/_metadata.xlsx`

/**
 * Builds a minimal `_metadata.xlsx` matching the expected format:
 * row 0 and 1 are ignored headers, row 2 is the column-name row,
 * row 3+ are data rows.
 *
 * @param data_rows - Raw metadata rows to write below the header.
 */
const create_xlsx = (data_rows: (string | number | null)[][]): void => {
  const header_row = ['filename', 'access', 'agent_filename', 'sheet', 'headers']
  const sheet = XLSX.utils.aoa_to_sheet([
    ['ignored row 0'],
    ['ignored row 1'],
    header_row,
    ...data_rows
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'metadata')
  XLSX.writeFile(wb, METADATA_PATH)
}

describe('generate_metadata', () => {
  describe('when _metadata.xlsx is absent', () => {
    beforeAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('should return METADATA_MISSING anomaly', async () => {
      const { files, anomalies } = await generate_metadata()
      expect(files).toHaveLength(0)
      expect(anomalies).toContainEqual({ code: 'METADATA_MISSING', subject: null })
    })
  })

  describe('when _metadata.xlsx has a valid row', () => {
    beforeAll(() => {
      create_xlsx([['mon_fichier.md', 'default', 'Mon fichier test', 1, 1]])
    })

    afterAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('should return files with no anomalies', async () => {
      const { files, anomalies } = await generate_metadata()
      expect(files.length).toBeGreaterThan(0)
      expect(anomalies).toHaveLength(0)
    })

    it('should map the row to the correct filename and access', async () => {
      const { files } = await generate_metadata()
      expect(files[0].filename).toBe('mon_fichier.md')
      expect(files[0].access).toBe('default')
      expect(files[0].agent_filename).toBe('Mon fichier test')
    })
  })

  describe('when _metadata.xlsx has an invalid row (missing agent_filename)', () => {
    beforeAll(() => {
      // agent_filename is null/missing — Zod will reject it
      create_xlsx([['mon_fichier.md', 'default', null, 1, 1]])
    })

    afterAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('should return METADATA_FORMAT_ERROR anomaly', async () => {
      const { files, anomalies } = await generate_metadata()
      expect(files).toHaveLength(0)
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('METADATA_FORMAT_ERROR')
    })
  })

  describe('file type inference from filename', () => {
    afterAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('infers type "md" for .md files', async () => {
      create_xlsx([['rapport.md', 'default', 'Rapport', 1, 1]])
      const { files } = await generate_metadata()
      expect(files.find((f) => f.filename === 'rapport.md')?.type).toBe('md')
    })

    it('infers type "docx" for .docx files', async () => {
      create_xlsx([['notice.docx', 'default', 'Notice', 1, 1]])
      const { files } = await generate_metadata()
      expect(files.find((f) => f.filename === 'notice.docx')?.type).toBe('docx')
    })

    it('infers type "xlsx" for .xlsx files', async () => {
      create_xlsx([['tableau.xlsx', 'default', 'Tableau', 1, 1]])
      const { files } = await generate_metadata()
      expect(files.find((f) => f.filename === 'tableau.xlsx')?.type).toBe('xlsx')
    })

    it('infers type from uppercase extensions while preserving filename casing', async () => {
      create_xlsx([['TABLEAU.XLSX', 'default', 'Tableau', 1, 1]])
      const { files } = await generate_metadata()
      expect(files.find((f) => f.filename === 'TABLEAU.XLSX')?.type).toBe('xlsx')
    })
  })

  describe('multi-access rows', () => {
    beforeAll(() => {
      // The header row includes a 'url' column at index 5 to test URL passthrough too
      const sheet = XLSX.utils.aoa_to_sheet([
        ['ignored row 0'],
        ['ignored row 1'],
        ['filename', 'access', 'agent_filename', 'sheet', 'headers', 'url'],
        ['rapport.md', 'default, admin', 'Rapport test', 1, 1, null]
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, 'metadata')
      XLSX.writeFile(wb, METADATA_PATH)
    })

    afterAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('produces one entry per access value', async () => {
      const { files } = await generate_metadata()
      const entries = files.filter((f) => f.filename === 'rapport.md')
      expect(entries).toHaveLength(2)
    })

    it('produces entries with the correct individual access values', async () => {
      const { files } = await generate_metadata()
      const accesses = files.filter((f) => f.filename === 'rapport.md').map((f) => f.access)
      expect(accesses).toContain('default')
      expect(accesses).toContain('admin')
    })
  })

  describe('url field', () => {
    beforeAll(() => {
      const sheet = XLSX.utils.aoa_to_sheet([
        ['ignored row 0'],
        ['ignored row 1'],
        ['filename', 'access', 'agent_filename', 'sheet', 'headers', 'url'],
        ['guide.md', 'default', 'Guide', 1, 1, 'https://example.com/guide.pdf']
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, 'metadata')
      XLSX.writeFile(wb, METADATA_PATH)
    })

    afterAll(async () => {
      await Bun.file(METADATA_PATH)
        .delete()
        .catch(() => {})
    })

    it('passes the url field through to the validated entry', async () => {
      const { files } = await generate_metadata()
      const entry = files.find((f) => f.filename === 'guide.md')
      expect(entry?.url).toBe('https://example.com/guide.pdf')
    })
  })
})
