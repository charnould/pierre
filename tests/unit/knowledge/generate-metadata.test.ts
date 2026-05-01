import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'

import * as XLSX from 'xlsx'

import { generate_metadata } from '../../../utils/knowledge/generate-metadata'

XLSX.set_fs(fs)

const METADATA_PATH = `datastores/${Bun.env['SERVICE']}/files/_metadata.xlsx`

// Build a minimal _metadata.xlsx matching the expected format:
// row 0 & 1 are ignored headers, row 2 is the column-name row, row 3+ are data rows
function createXlsx(dataRows: (string | number | null)[][]): void {
  const headerRow = ['filename', 'access', 'agent_filename', 'sheet', 'headers']
  const sheet = XLSX.utils.aoa_to_sheet([
    ['ignored row 0'],
    ['ignored row 1'],
    headerRow,
    ...dataRows
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
      createXlsx([['mon_fichier.md', 'default', 'Mon fichier test', 1, 1]])
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
      createXlsx([['mon_fichier.md', 'default', null, 1, 1]])
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
})
