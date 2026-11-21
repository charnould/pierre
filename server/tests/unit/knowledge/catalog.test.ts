import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import {
  completeKnowledgeBuild,
  createKnowledgeBuild,
  failInterruptedKnowledgeBuilds,
  getKnowledgeBuild,
  getKnowledgeCatalogSnapshot,
  insertKnowledgeSource,
  isKnowledgeSourceAssigned,
  knowledgeProjections,
  knowledgePublishTargets,
  listKnowledgeBuilds,
  listKnowledgeSources,
  purgeOldKnowledgeBuilds,
  updateKnowledgeSourceMetadata
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
  it('stores an unassigned flat source as a strict JSON document', () => {
    const source = insertKnowledgeSource({
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 42,
      origin: 'ui',
      title: 'Guide',
      profileIds: [],
      moduleIds: []
    })

    expect(listKnowledgeSources()).toEqual([source])
    const db = new Database(datastorePaths().database, { readonly: true })
    const document = JSON.parse(
      db.query<{ document: string }, []>('SELECT document FROM knowledge_records').get()!.document
    )
    db.close()
    expect(document.original_name).toBe('Guide.md')
    expect(document.file_type).toBe('md')
    expect(document.title).toBe('Guide')
    expect(document.originalName).toBeUndefined()
  })

  it('fingerprints only assigned build inputs and preserves the file hash on patch', () => {
    const initialFingerprint = getKnowledgeCatalogSnapshot().fingerprint
    const source = insertKnowledgeSource({
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 42,
      contentHash: 'a'.repeat(64),
      origin: 'ui',
      title: 'Guide',
      profileIds: [],
      moduleIds: []
    })

    expect(getKnowledgeCatalogSnapshot().fingerprint).toBe(initialFingerprint)

    const assigned = updateKnowledgeSourceMetadata(
      source.id,
      { title: 'Guide', profileIds: ['default'], moduleIds: [] },
      new Set(['default'])
    )
    expect(assigned?.contentHash).toBe('a'.repeat(64))
    expect(getKnowledgeCatalogSnapshot().fingerprint).not.toBe(initialFingerprint)
  })

  it('fingerprints unassigned Core Data sources', () => {
    const initialFingerprint = getKnowledgeCatalogSnapshot().fingerprint
    insertKnowledgeSource({
      originalName: 'core.travaux.csv',
      fileType: 'csv',
      sizeBytes: 12,
      contentHash: 'e'.repeat(64),
      origin: 'ui',
      title: 'travaux',
      profileIds: [],
      moduleIds: []
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
        coreFingerprint: null
      })?.catalogFingerprint
    ).toBe('built-snapshot')
    expect(getKnowledgeBuild(build.id)?.catalogFingerprint).toBe('built-snapshot')
  })

  it('rejects output collisions within a profile', () => {
    const first = insertKnowledgeSource({
      originalName: 'A.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      title: 'A',
      profileIds: [],
      moduleIds: []
    })
    const second = insertKnowledgeSource({
      originalName: 'B.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      title: 'B',
      profileIds: [],
      moduleIds: []
    })
    const profiles = new Set(['default'])

    updateKnowledgeSourceMetadata(
      first.id,
      { title: 'Guide CAF', profileIds: ['default'], moduleIds: [] },
      profiles
    )

    expect(() =>
      updateKnowledgeSourceMetadata(
        second.id,
        { title: 'Guide CÀF', profileIds: ['default'], moduleIds: [] },
        profiles
      )
    ).toThrow('Knowledge title already used')
  })

  it('rejects a reserved Core Data title on an ordinary source', () => {
    const source = insertKnowledgeSource({
      originalName: 'A.xlsx',
      fileType: 'xlsx',
      sizeBytes: 1,
      origin: 'ui',
      title: 'Feuille',
      sheetName: 'Feuille',
      headerRow: 1,
      headerHash: 'a'.repeat(64),
      profileIds: [],
      moduleIds: []
    })

    expect(() =>
      updateKnowledgeSourceMetadata(
        source.id,
        { title: 'Reclamations', profileIds: ['default'], moduleIds: [] },
        new Set(['default'])
      )
    ).toThrow('Reserved Core Data title')
  })

  it('rejects duplicate workbook sheet names case-insensitively', () => {
    insertKnowledgeSource({
      originalName: 'Workbook.xlsx',
      fileType: 'xlsx',
      sizeBytes: 1,
      origin: 'ui',
      title: 'Premier',
      sheetName: 'États',
      headerRow: 1,
      headerHash: 'a'.repeat(64),
      profileIds: [],
      moduleIds: []
    })
    expect(() =>
      insertKnowledgeSource({
        originalName: 'Workbook.xlsx',
        fileType: 'xlsx',
        sizeBytes: 1,
        origin: 'ui',
        title: 'Second',
        sheetName: 'états',
        headerRow: 1,
        headerHash: 'b'.repeat(64),
        profileIds: [],
        moduleIds: []
      })
    ).toThrow('Knowledge source already exists')
    expect(() =>
      insertKnowledgeSource({
        originalName: 'workbook.xlsx',
        fileType: 'xlsx',
        sizeBytes: 1,
        origin: 'ui',
        title: 'Troisième',
        sheetName: 'États',
        headerRow: 1,
        headerHash: 'c'.repeat(64),
        profileIds: [],
        moduleIds: []
      })
    ).toThrow(/UNIQUE/)
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
    createKnowledgeBuild('manual', null, 'process-a')
    expect(() => createKnowledgeBuild('cron', null, 'process-b')).toThrow()
  })

  it('purges terminal builds older than 30 days', () => {
    const build = createKnowledgeBuild('manual', 'admin@example.org')
    const db = new Database(datastorePaths().database)
    db.run(
      `UPDATE knowledge_records
       SET created_at = ?, document = json_set(document, '$.status', 'succeeded', '$.finished_at', ?)
       WHERE id = ?`,
      ['2020-01-01T00:00:00.000Z', '2020-01-01T00:00:01.000Z', build.id]
    )
    db.close()

    expect(purgeOldKnowledgeBuilds()).toBe(1)
    expect(listKnowledgeBuilds()).toEqual([])
  })

  it('rejects a source document stored with camelCase keys', () => {
    const now = new Date().toISOString()
    const db = new Database(datastorePaths().database)
    db.run(
      "INSERT INTO knowledge_records (id, kind, document, created_at, updated_at) VALUES (?, 'source', ?, ?, ?)",
      [
        'legacy-doc',
        JSON.stringify({
          originalName: 'Guide.md',
          fileType: 'md',
          sizeBytes: 1,
          contentHash: null,
          origin: 'ui',
          title: 'Guide',
          profileIds: [],
          moduleIds: []
        }),
        now,
        now
      ]
    )
    db.close()

    expect(() => listKnowledgeSources()).toThrow()
  })

  it('publishes a module into its prompt database and ignores modules without one', () => {
    const assigned = {
      profileIds: [] as string[],
      moduleIds: ['about' as const]
    }
    const known = ['default', 'about', 'report', 'replies', 'repayment']
    expect(isKnowledgeSourceAssigned(assigned)).toBe(true)
    expect(knowledgePublishTargets(assigned, known)).toEqual(['about'])
    expect(knowledgePublishTargets({ ...assigned, moduleIds: ['automations'] }, known)).toEqual([])
    expect(knowledgePublishTargets({ ...assigned, moduleIds: ['repayment'] }, known)).toEqual([
      'repayment'
    ])
    expect(knowledgePublishTargets({ ...assigned, moduleIds: ['tickets'] }, known)).toEqual([])
    expect(
      knowledgePublishTargets({ ...assigned, profileIds: ['report'], moduleIds: [] }, known)
    ).toEqual(['report'])
    expect(
      knowledgePublishTargets(
        { ...assigned, profileIds: ['ticket.answer-ticket'], moduleIds: [] },
        known
      )
    ).toEqual([])

    const first = insertKnowledgeSource({
      originalName: 'A.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      title: 'A',
      profileIds: [],
      moduleIds: []
    })
    const second = insertKnowledgeSource({
      originalName: 'B.md',
      fileType: 'md',
      sizeBytes: 1,
      origin: 'ui',
      title: 'B',
      profileIds: [],
      moduleIds: []
    })
    const profiles = new Set(known)
    updateKnowledgeSourceMetadata(
      first.id,
      { title: 'Guide CAF', profileIds: [], moduleIds: ['about'] },
      profiles
    )
    expect(() =>
      updateKnowledgeSourceMetadata(
        second.id,
        { title: 'Guide CÀF', profileIds: [], moduleIds: ['about'] },
        profiles
      )
    ).toThrow('Knowledge title already used')
    expect(() =>
      insertKnowledgeSource(
        {
          originalName: 'C.md',
          fileType: 'md',
          sizeBytes: 1,
          origin: 'ui',
          title: 'Guide CAF',
          profileIds: [],
          moduleIds: ['about']
        },
        profiles
      )
    ).toThrow('Knowledge title already used')

    const snapshot = getKnowledgeCatalogSnapshot()
    expect(
      knowledgeProjections(snapshot, known)
        .map((entry) => entry.access)
        .sort()
    ).toEqual(['about'])
    expect(
      knowledgeProjections(
        {
          ...snapshot,
          sources: snapshot.sources.map((source) => ({
            ...source,
            moduleIds: ['tickets' as const]
          }))
        },
        known
      )
    ).toEqual([])
  })

  it('rejects a non-object document at the write boundary', () => {
    expect(() => insertKnowledgeSource([] as never)).toThrow()
  })
})
