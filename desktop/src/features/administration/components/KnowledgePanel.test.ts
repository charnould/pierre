import { describe, expect, test } from 'bun:test'

import type { KnowledgeBuild, KnowledgeSource } from '@/shared/types/knowledge'

import {
  buildKnowledgeBuckets,
  knowledgeAssignmentSummary,
  knowledgeDeleteKind,
  knowledgeFileKind,
  isKnowledgeEntryAssigned,
  knowledgeItemState,
  knowledgeRowDescription,
  knowledgeRowTitle
} from './knowledge-model'

const source = (
  id: string,
  entries: KnowledgeSource['entries'],
  coreDataEntries: KnowledgeSource['coreDataEntries'] = []
): KnowledgeSource => ({
  id,
  storageName: `${id}.xlsx`,
  originalName: `${id}.xlsx`,
  fileType: 'xlsx',
  sizeBytes: 1,
  contentHash: 'a'.repeat(64),
  origin: 'ui',
  entries,
  itemKeys: entries.map((entry) => `${id}:${entry.sheetName ?? 'document'}`),
  coreDataEntries,
  createdAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:00.000Z'
})

const entry = (
  title: string,
  sheetName: string | null,
  profileIds: string[],
  moduleIds: KnowledgeSource['entries'][number]['moduleIds'] = []
): KnowledgeSource['entries'][number] => ({
  title,
  sheet: sheetName === null ? null : 0,
  sheetName,
  headerRow: sheetName === null ? null : 0,
  profileIds,
  moduleIds
})

const build = (
  status: KnowledgeBuild['status'],
  items: KnowledgeBuild['items']
): KnowledgeBuild => ({
  id: 'build-1',
  status,
  trigger: 'manual',
  requestedBy: null,
  catalogFingerprint: status === 'succeeded' ? 'published' : null,
  startedAt: '2026-09-10T12:00:00.000Z',
  finishedAt: '2026-09-10T12:00:01.000Z',
  mirrorTables: [],
  ownerId: 'test',
  heartbeatAt: '2026-09-10T12:00:01.000Z',
  items,
  diagnostics: [],
  createdAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:01.000Z'
})

describe('knowledge item buckets', () => {
  test('always lists every Core Data table and keeps all other entries together', () => {
    const core = {
      ...source(
        'core',
        [entry('reclamations', null, ['default'])],
        [{ index: 0, table: 'reclamations' }]
      ),
      originalName: 'core.reclamations.csv',
      fileType: 'csv' as const,
      itemKeys: ['core:document']
    }
    const ordinary = source('ordinary', [entry('Guide métier', 'Guide', [])])
    const csv = {
      ...source('indicateurs', [entry('Indicateurs', null, [])]),
      storageName: 'indicateurs.csv',
      originalName: 'indicateurs.csv',
      fileType: 'csv' as const
    }
    const buckets = buildKnowledgeBuckets(
      [core, ordinary, csv],
      [
        { table: 'lots_locatifs', filename: 'core.lots_locatifs.csv', label: 'Patrimoine' },
        {
          table: 'reclamations',
          filename: 'core.reclamations.csv',
          label: 'Réclamations'
        }
      ]
    )

    expect(
      buckets.coreData.map(({ contract, item }) => [
        contract.table,
        item?.source.originalName ?? null
      ])
    ).toEqual([
      ['lots_locatifs', null],
      ['reclamations', 'core.reclamations.csv']
    ])
    expect(buckets.other.map(({ source }) => source.originalName)).toEqual([
      'indicateurs.csv',
      'ordinary.xlsx'
    ])
  })

  test('search filters only the other bucket', () => {
    const buckets = buildKnowledgeBuckets(
      [
        source('source', [
          entry('Guide', 'Procédures', []),
          entry('Contacts', 'Contacts', ['default'])
        ])
      ],
      [{ table: 'reclamations', filename: 'core.reclamations.csv', label: 'Réclamations' }],
      'contacts'
    )

    expect(buckets.coreData).toHaveLength(1)
    expect(buckets.other.map(({ entry }) => entry.sheetName)).toEqual(['Contacts'])
  })
})

describe('knowledge item state', () => {
  const assignedItem = buildKnowledgeBuckets(
    [source('source', [entry('Guide', 'Guide', ['default'])])],
    []
  ).other[0]!
  const unassignedItem = buildKnowledgeBuckets(
    [source('source', [entry('Guide', 'Guide', [])])],
    []
  ).other[0]!

  test('derives absent, unassigned, running, success and failure without persisted row state', () => {
    expect(knowledgeItemState(null, null, false)).toBe('absent')
    expect(knowledgeItemState(unassignedItem, null, false)).toBe('unassigned')
    expect(knowledgeItemState(assignedItem, null, false)).toBe('pending')
    expect(knowledgeItemState(assignedItem, build('running', []), true)).toBe('running')
    expect(
      knowledgeItemState(
        assignedItem,
        build('succeeded', [{ key: assignedItem.itemKey, status: 'succeeded' }]),
        false
      )
    ).toBe('succeeded')
    expect(
      knowledgeItemState(
        assignedItem,
        build('failed', [{ key: assignedItem.itemKey, status: 'failed' }]),
        true
      )
    ).toBe('failed')
    expect(
      knowledgeItemState(
        assignedItem,
        build('succeeded', [{ key: assignedItem.itemKey, status: 'succeeded' }]),
        true
      )
    ).toBe('pending')
    const moduleOnly = buildKnowledgeBuckets(
      [source('source', [entry('Guide', 'Guide', [], ['tickets'])])],
      []
    ).other[0]!
    expect(isKnowledgeEntryAssigned(unassignedItem.entry)).toBe(false)
    expect(isKnowledgeEntryAssigned(moduleOnly.entry)).toBe(true)
    expect(knowledgeItemState(moduleOnly, null, false)).toBe('pending')
  })
})

describe('knowledge assignment summary', () => {
  test('resolves profile and module labels and stays empty when unassigned', () => {
    expect(
      knowledgeAssignmentSummary(entry('Guide', 'Guide', ['default', 'tickets-bot'], ['tickets']), [
        { id: 'default', label: 'Assistant' },
        { id: 'tickets-bot', label: 'Réclamations' }
      ])
    ).toEqual({
      profiles: ['Assistant', 'Réclamations'],
      modules: ['Traiter les réclamations']
    })
    expect(knowledgeAssignmentSummary(entry('Guide', 'Guide', [], []), [])).toEqual({
      profiles: [],
      modules: []
    })
    expect(
      knowledgeAssignmentSummary(entry('Guide', 'Guide', ['default', 'ghost'], []), [
        { id: 'default', label: 'Assistant' }
      ])
    ).toEqual({
      profiles: ['Assistant', 'ghost'],
      modules: []
    })
  })
})

describe('knowledge list identity', () => {
  const ordinary = buildKnowledgeBuckets(
    [source('ordinary', [entry('Suivi des indicateurs', 'Indicateurs', [])])],
    []
  ).other[0]!

  test('shows the encyclopedia title and uploaded filename for other sources', () => {
    expect(knowledgeRowTitle(ordinary)).toBe('Suivi des indicateurs')
    expect(knowledgeRowDescription(ordinary)).toBe('ordinary.xlsx')
  })

  test('keeps Core Data identity on the reserved filename and métier label', () => {
    expect(knowledgeRowTitle(null, { filename: 'core.reclamations.csv' })).toBe(
      'core.reclamations.csv'
    )
    expect(knowledgeRowDescription(null, { label: 'Réclamations' })).toBe('Réclamations')
  })

  test('uses a table glyph for CSV/Excel and a document glyph for Markdown/DOCX', () => {
    expect(knowledgeFileKind('csv')).toBe('table')
    expect(knowledgeFileKind('xlsx')).toBe('table')
    expect(knowledgeFileKind('md')).toBe('document')
    expect(knowledgeFileKind('docx')).toBe('document')
  })

  test('deletes a workbook sheet in place when other sheets remain', () => {
    const first = entry('Premier', 'Premier', [])
    const second = entry('Second', 'Second', [])
    const workbook = buildKnowledgeBuckets([source('classeur', [first, second])], []).other[1]!
    expect(knowledgeDeleteKind(workbook)).toBe('sheet')
    expect(knowledgeDeleteKind(ordinary)).toBe('file')
  })
})
