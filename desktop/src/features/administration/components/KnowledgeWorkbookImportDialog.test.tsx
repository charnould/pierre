import { describe, expect, test } from 'bun:test'

import type { KnowledgeSource, WorkbookInspectSheet } from '@/shared/types/knowledge'

import {
  createInitialSheetDraft,
  detectHeaderRow,
  evaluateSheetDraft
} from './KnowledgeWorkbookImportDialog'

const inspectSheet: WorkbookInspectSheet = {
  name: 'Patrimoine',
  totalRows: 5,
  columnStats: [
    { colIndex: 0, colLetter: 'A', lastNonEmptyRow: 5, lastOwnRow: 5 },
    { colIndex: 1, colLetter: 'B', lastNonEmptyRow: 5, lastOwnRow: 5 }
  ],
  rows: [
    {
      rowNumber: 1,
      cells: [
        { value: 'Bandeau titre', own: true },
        { value: null, own: false }
      ]
    },
    {
      rowNumber: 2,
      cells: [
        { value: 'Code', own: true },
        { value: 'Adresse', own: true }
      ]
    },
    {
      rowNumber: 3,
      cells: [
        { value: 'RES-1', own: true },
        { value: '10 rue des Lilas', own: true }
      ]
    }
  ]
}

const existingSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id: 'src-1',
  originalName: 'Carnet.xlsx',
  fileType: 'xlsx',
  sizeBytes: 10,
  contentHash: 'a'.repeat(64),
  origin: 'ui',
  title: 'Patrimoine immobilier',
  sheetName: 'Patrimoine',
  headerRow: 2,
  headerHash: 'b'.repeat(64),
  profileIds: ['default'],
  moduleIds: ['tickets'],
  coreDataTable: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...overrides
})

describe('KnowledgeWorkbookImportDialog helpers', () => {
  test('auto-detects the first valid header row for a new sheet', () => {
    expect(detectHeaderRow(inspectSheet)).toBe(2)
    expect(createInitialSheetDraft(inspectSheet, null)).toEqual({
      headerRow: 2,
      title: 'Patrimoine'
    })
  })

  test('keeps an existing sheet headerRow when still valid and auto-recovers when headers shifted', () => {
    expect(createInitialSheetDraft(inspectSheet, existingSource({ headerRow: 2 }))).toEqual({
      headerRow: 2,
      title: 'Patrimoine immobilier'
    })

    // Previously row 1 was configured, now row 1 is a banner and row 2 is valid -> auto-detects row 2
    expect(createInitialSheetDraft(inspectSheet, existingSource({ headerRow: 1 }))).toEqual({
      headerRow: 2,
      title: 'Patrimoine immobilier'
    })
  })

  test('reports untitled columns on the wrong row and succeeds on the real header row', () => {
    expect(evaluateSheetDraft(inspectSheet, { headerRow: 1, title: 'Patrimoine' })).toEqual({
      kind: 'error',
      message: 'Colonne sans titre : B.'
    })

    expect(evaluateSheetDraft(inspectSheet, { headerRow: 2, title: 'Patrimoine' })).toMatchObject({
      kind: 'ok',
      validation: {
        ok: true,
        columns: [
          { colLetter: 'A', name: 'code' },
          { colLetter: 'B', name: 'adresse' }
        ]
      }
    })
  })

  test('asks to load more rows when headerRow exceeds the loaded preview window', () => {
    expect(evaluateSheetDraft(inspectSheet, { headerRow: 4, title: 'Patrimoine' })).toMatchObject({
      kind: 'error',
      needsMoreRows: true
    })
  })
})
