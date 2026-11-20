import { describe, expect, test } from 'bun:test'

import { BUSINESS_MODULES } from '@pierre/shared/modules'

import type { KnowledgeBuild, KnowledgeSource } from '@/shared/types/knowledge'

import {
  buildKnowledgeBuckets,
  isKnowledgeSourceAssigned,
  knowledgeAssignmentSummary,
  knowledgeFileKind,
  knowledgeItemState,
  knowledgeRowDescription,
  knowledgeRowTitle
} from './knowledge-model'

const source = (id: string, overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id,
  originalName: `${id}.xlsx`,
  fileType: 'xlsx',
  sizeBytes: 1,
  contentHash: 'a'.repeat(64),
  origin: 'ui',
  title: 'Guide',
  sheetName: 'Guide',
  headerRow: 1,
  headerHash: 'b'.repeat(64),
  profileIds: [],
  moduleIds: [],
  coreDataTable: null,
  createdAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:00.000Z',
  ...overrides
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
  coreFingerprint: null,
  ownerId: 'test',
  heartbeatAt: '2026-09-10T12:00:01.000Z',
  items,
  diagnostics: [],
  createdAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:01.000Z'
})

describe('knowledge item buckets', () => {
  test('always lists every Core Data table and keeps all other sources together', () => {
    const core = source('core', {
      originalName: 'core.reclamations.csv',
      fileType: 'csv',
      title: 'reclamations',
      sheetName: null,
      headerRow: null,
      headerHash: null,
      profileIds: ['default'],
      coreDataTable: 'reclamations'
    })
    const ordinary = source('ordinary', { title: 'Guide métier', sheetName: 'Guide' })
    const csv = source('indicateurs', {
      originalName: 'indicateurs.csv',
      fileType: 'csv',
      title: 'Indicateurs',
      sheetName: null,
      headerRow: null,
      headerHash: null
    })
    const intake = source('intake-1', {
      originalName: 'intake:enquete_parc',
      fileType: 'intake',
      title: 'Enquête satisfaction',
      sheetName: null,
      headerRow: null,
      headerHash: null
    })
    const buckets = buildKnowledgeBuckets(
      [core, intake, ordinary, csv],
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
      buckets.coreData.map(({ contract, source: item }) => [
        contract.table,
        item?.originalName ?? null
      ])
    ).toEqual([
      ['lots_locatifs', null],
      ['reclamations', 'core.reclamations.csv']
    ])
    expect(buckets.intakes.map((item) => [item.title, item.originalName])).toEqual([
      ['Enquête satisfaction', 'intake:enquete_parc']
    ])
    expect(buckets.other.map((item) => item.originalName)).toEqual([
      'indicateurs.csv',
      'ordinary.xlsx'
    ])
  })

  test('search filters only the other bucket', () => {
    const buckets = buildKnowledgeBuckets(
      [
        source('s1', {
          originalName: 'Carnet.xlsx',
          title: 'Guide',
          sheetName: 'Procédures'
        }),
        source('s2', {
          originalName: 'Carnet.xlsx',
          title: 'Contacts',
          sheetName: 'Contacts',
          profileIds: ['default']
        })
      ],
      [{ table: 'reclamations', filename: 'core.reclamations.csv', label: 'Réclamations' }],
      'contacts'
    )

    expect(buckets.coreData).toHaveLength(1)
    expect(buckets.other.map((item) => item.sheetName)).toEqual(['Contacts'])
  })
})

describe('knowledge item state', () => {
  const assignedItem = source('assigned', { profileIds: ['default'] })
  const unassignedItem = source('unassigned')

  test('derives absent, unassigned, running, success and failure without persisted row state', () => {
    expect(knowledgeItemState(null, null, false)).toBe('absent')
    expect(knowledgeItemState(unassignedItem, null, false)).toBe('unassigned')
    expect(knowledgeItemState(assignedItem, null, false)).toBe('pending')
    expect(knowledgeItemState(assignedItem, build('running', []), true)).toBe('running')
    expect(
      knowledgeItemState(
        assignedItem,
        build('succeeded', [{ key: assignedItem.id, status: 'succeeded' }]),
        false
      )
    ).toBe('succeeded')
    expect(
      knowledgeItemState(
        assignedItem,
        build('failed', [{ key: assignedItem.id, status: 'failed' }]),
        true
      )
    ).toBe('failed')
    expect(
      knowledgeItemState(
        assignedItem,
        build('succeeded', [{ key: assignedItem.id, status: 'succeeded' }]),
        true
      )
    ).toBe('pending')
    const moduleOnly = source('module-only', { moduleIds: ['tickets'] })
    expect(isKnowledgeSourceAssigned(unassignedItem)).toBe(false)
    expect(isKnowledgeSourceAssigned(moduleOnly)).toBe(true)
    expect(knowledgeItemState(moduleOnly, null, false)).toBe('pending')
  })
})

describe('knowledge assignment summary', () => {
  test('resolves profile and module labels and stays empty when unassigned', () => {
    expect(
      knowledgeAssignmentSummary(
        source('s', { profileIds: ['default', 'tickets-bot'], moduleIds: ['tickets'] }),
        [
          { id: 'default', label: 'Assistant' },
          { id: 'tickets-bot', label: 'Réclamations' }
        ]
      )
    ).toEqual({
      profiles: ['Assistant', 'Réclamations'],
      modules: [BUSINESS_MODULES.find((module) => module.id === 'tickets')?.label ?? '']
    })
    expect(knowledgeAssignmentSummary(source('s'), [])).toEqual({
      profiles: [],
      modules: []
    })
    expect(
      knowledgeAssignmentSummary(source('s', { profileIds: ['default', 'ghost'] }), [
        { id: 'default', label: 'Assistant' }
      ])
    ).toEqual({
      profiles: ['Assistant', 'ghost'],
      modules: []
    })
  })
})

describe('knowledge list identity', () => {
  const ordinary = source('ordinary', {
    title: 'Suivi des indicateurs',
    sheetName: 'Indicateurs'
  })

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

  test('shows the defined intake name as title and raw table name as description', () => {
    const intake = source('intake-1', {
      originalName: 'intake:enquete_parc',
      fileType: 'intake',
      title: 'Enquête satisfaction',
      sheetName: null
    })
    expect(knowledgeRowTitle(intake)).toBe('Enquête satisfaction')
    expect(knowledgeRowDescription(intake)).toBe('enquete_parc')
  })

  test('uses a table glyph for CSV/Excel and a document glyph for Markdown/DOCX', () => {
    expect(knowledgeFileKind('csv')).toBe('table')
    expect(knowledgeFileKind('xlsx')).toBe('table')
    expect(knowledgeFileKind('md')).toBe('document')
    expect(knowledgeFileKind('docx')).toBe('document')
  })
})
