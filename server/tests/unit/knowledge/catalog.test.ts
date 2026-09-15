import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import {
  completeKnowledgeBuild,
  createKnowledgeBuild,
  failInterruptedKnowledgeBuilds,
  flattenKnowledgeEntries,
  getKnowledgeBuild,
  getKnowledgeCatalogSnapshot,
  insertKnowledgeSource,
  isKnowledgeEntryAssigned,
  knowledgePublishTargets,
  listKnowledgeBuilds,
  listKnowledgeSources,
  purgeOldKnowledgeBuilds,
  replaceKnowledgeSourceEntries
} from '../../../utils/knowledge/catalog'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'

const paths = testDatastorePaths('knowledge_catalog')

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await mkdir(paths.root, { recursive: true })
  await migrate_datastore(datastorePaths().database)
})

afterEach(async () => {
  await rm(datastorePaths().root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('knowledge catalog', () => {
  it('stores an unassigned source as a strict JSON document', () => {
    const source = insertKnowledgeSource({
      storageName: 'guide.md',
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 42,
      origin: 'ui',
      entries: []
    })

    expect(source.entries).toEqual([])
    expect(listKnowledgeSources()).toEqual([source])
  })

  it('fingerprints only assigned build inputs and preserves the file hash on patch', () => {
    const initialFingerprint = getKnowledgeCatalogSnapshot().fingerprint
    const source = insertKnowledgeSource({
      storageName: 'guide.md',
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 42,
      contentHash: 'a'.repeat(64),
      origin: 'ui',
      entries: []
    })

    expect(getKnowledgeCatalogSnapshot().fingerprint).toBe(initialFingerprint)

    const assigned = replaceKnowledgeSourceEntries(
      source.id,
      [
        {
          title: 'Guide',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: ['default']
        }
      ],
      new Set(['default'])
    )
    expect(assigned?.contentHash).toBe('a'.repeat(64))
    expect(getKnowledgeCatalogSnapshot().fingerprint).not.toBe(initialFingerprint)
  })

  it('fingerprints unassigned Core Data sources', () => {
    const initialFingerprint = getKnowledgeCatalogSnapshot().fingerprint
    insertKnowledgeSource({
      storageName: 'core_travaux.csv',
      originalName: 'core.travaux.csv',
      fileType: 'csv',
      sizeBytes: 12,
      contentHash: 'e'.repeat(64),
      origin: 'ui',
      entries: [
        {
          title: 'travaux',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: []
        }
      ]
    })

    expect(getKnowledgeCatalogSnapshot().fingerprint).not.toBe(initialFingerprint)
  })

  it('persists the fingerprint of the snapshot supplied by the completed build', () => {
    const build = createKnowledgeBuild('manual', null)

    expect(
      completeKnowledgeBuild(build.id, {
        catalogFingerprint: 'built-snapshot',
        diagnostics: [],
        items: [],
        mirrorTables: []
      })?.catalogFingerprint
    ).toBe('built-snapshot')
    expect(getKnowledgeBuild(build.id)?.catalogFingerprint).toBe('built-snapshot')
  })

  it('rejects output collisions within a profile', () => {
    const first = insertKnowledgeSource({
      storageName: 'a.md',
      originalName: 'A.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })
    const second = insertKnowledgeSource({
      storageName: 'b.md',
      originalName: 'B.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })
    const profiles = new Set(['default'])

    replaceKnowledgeSourceEntries(
      first.id,
      [
        {
          title: 'Guide CAF',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: ['default']
        }
      ],
      profiles
    )

    expect(() =>
      replaceKnowledgeSourceEntries(
        second.id,
        [
          {
            title: 'Guide CÀF',
            sheet: null,
            sheetName: null,
            headerRow: null,
            profileIds: ['default']
          }
        ],
        profiles
      )
    ).toThrow('Knowledge title already used')
  })

  it('rejects a reserved Core Data title on an ordinary source', () => {
    const source = insertKnowledgeSource({
      storageName: 'a.xlsx',
      originalName: 'A.xlsx',
      fileType: 'xlsx',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })

    expect(() =>
      replaceKnowledgeSourceEntries(
        source.id,
        [
          {
            title: 'Reclamations',
            sheet: 0,
            sheetName: 'Reclamations',
            headerRow: 0,
            profileIds: ['default']
          }
        ],
        new Set(['default'])
      )
    ).toThrow('Reserved Core Data title')
  })

  it('rejects duplicate workbook sheet names', () => {
    const workbook = insertKnowledgeSource({
      storageName: 'workbook.xlsx',
      originalName: 'Workbook.xlsx',
      fileType: 'xlsx',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })
    expect(() =>
      replaceKnowledgeSourceEntries(
        workbook.id,
        [
          {
            title: 'Premier',
            sheet: 0,
            sheetName: 'Données',
            headerRow: 0,
            profileIds: []
          },
          {
            title: 'Second',
            sheet: 1,
            sheetName: 'données',
            headerRow: 0,
            profileIds: []
          }
        ],
        new Set()
      )
    ).toThrow('Spreadsheet sheet names can only be selected once')
  })

  it('marks interrupted builds as failed', () => {
    createKnowledgeBuild('startup', null)

    expect(failInterruptedKnowledgeBuilds(new Date(Date.now() + 1000))).toBe(1)
    expect(listKnowledgeBuilds()[0]).toMatchObject({
      status: 'failed',
      diagnostics: [{ code: 'interrupted' }]
    })
  })

  it('allows only one active build lease', () => {
    createKnowledgeBuild('manual', null, [], 'process-a')
    expect(() => createKnowledgeBuild('cron', null, [], 'process-b')).toThrow()
  })

  it('purges terminal builds older than 30 days', () => {
    const build = createKnowledgeBuild('manual', 'admin@example.org')
    const db = new Database(datastorePaths().database)
    db.run(
      `UPDATE knowledge_records
       SET created_at = ?, document = json_set(document, '$.status', 'succeeded', '$.finishedAt', ?)
       WHERE id = ?`,
      ['2020-01-01T00:00:00.000Z', '2020-01-01T00:00:01.000Z', build.id]
    )
    db.close()

    expect(purgeOldKnowledgeBuilds()).toBe(1)
    expect(listKnowledgeBuilds()).toEqual([])
  })

  it('reads catalog entries that still persist a leftover url', () => {
    const now = new Date().toISOString()
    const db = new Database(datastorePaths().database)
    db.run(
      "INSERT INTO knowledge_records (id, kind, document, created_at, updated_at) VALUES (?, 'source', ?, ?, ?)",
      [
        'legacy-url',
        JSON.stringify({
          storageName: 'guide.md',
          originalName: 'Guide.md',
          fileType: 'md',
          sizeBytes: 1,
          contentHash: null,
          origin: 'ui',
          entries: [
            {
              title: 'Guide',
              sheet: null,
              sheetName: null,
              headerRow: null,
              url: 'https://example.org/guide',
              profileIds: []
            }
          ]
        }),
        now,
        now
      ]
    )
    db.close()

    expect(listKnowledgeSources()[0]?.entries[0]).toEqual({
      title: 'Guide',
      sheet: null,
      sheetName: null,
      headerRow: null,
      profileIds: [],
      moduleIds: []
    })
  })

  it('expands a tickets module to ticket skills and ignores modules without skills', () => {
    const assigned = {
      title: 'Guide',
      sheet: null,
      sheetName: null,
      headerRow: null,
      profileIds: [] as string[],
      moduleIds: ['tickets' as const]
    }
    const known = ['default', 'ticket.answer-ticket', 'ticket.write-memo', 'about.summary']
    expect(isKnowledgeEntryAssigned(assigned)).toBe(true)
    expect(knowledgePublishTargets(assigned, known)).toEqual([
      'ticket.answer-ticket',
      'ticket.write-memo'
    ])
    expect(knowledgePublishTargets({ ...assigned, moduleIds: ['repayment'] }, known)).toEqual([])

    const first = insertKnowledgeSource({
      storageName: 'a.md',
      originalName: 'A.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })
    const second = insertKnowledgeSource({
      storageName: 'b.md',
      originalName: 'B.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      entries: []
    })
    const profiles = new Set(known)
    replaceKnowledgeSourceEntries(
      first.id,
      [
        {
          title: 'Guide CAF',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: [],
          moduleIds: ['tickets']
        }
      ],
      profiles
    )
    expect(() =>
      replaceKnowledgeSourceEntries(
        second.id,
        [
          {
            title: 'Guide CÀF',
            sheet: null,
            sheetName: null,
            headerRow: null,
            profileIds: [],
            moduleIds: ['tickets']
          }
        ],
        profiles
      )
    ).toThrow('Knowledge title already used')
    expect(() =>
      insertKnowledgeSource(
        {
          storageName: 'c.md',
          originalName: 'C.md',
          fileType: 'md',
          sizeBytes: 1,
          origin: 'ui',
          entries: [
            {
              title: 'Guide CAF',
              sheet: null,
              sheetName: null,
              headerRow: null,
              profileIds: [],
              moduleIds: ['tickets']
            }
          ]
        },
        profiles
      )
    ).toThrow('Knowledge title already used')

    const snapshot = getKnowledgeCatalogSnapshot()
    expect(
      flattenKnowledgeEntries(snapshot, known)
        .map((entry) => entry.access)
        .sort()
    ).toEqual(['ticket.answer-ticket', 'ticket.write-memo'])
    expect(
      flattenKnowledgeEntries(
        {
          ...snapshot,
          sources: snapshot.sources.map((source) => ({
            ...source,
            entries: source.entries.map((entry) => ({
              ...entry,
              moduleIds: ['repayment' as const]
            }))
          }))
        },
        known
      )
    ).toEqual([])
  })

  it('rejects malformed JSON at the SQLite boundary', () => {
    const db = new Database(datastorePaths().database)
    expect(() =>
      db.run(
        "INSERT INTO knowledge_records (id, kind, document, created_at, updated_at) VALUES ('bad', 'source', '[]', '', '')"
      )
    ).toThrow()
    db.close()
  })
})
