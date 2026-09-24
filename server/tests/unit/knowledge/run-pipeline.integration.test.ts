import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import { CORE_DATA_CONTRACT } from '../../../utils/datastore-tables'
import {
  insertKnowledgeSource,
  replaceKnowledgeSourceEntries
} from '../../../utils/knowledge/catalog'
import { runKnowledgePipeline } from '../../../utils/knowledge/run-pipeline'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('pipeline')
const TEST_PROFILE = 'default'

const knowledgeDatabase = () => `${datastorePaths().knowledge}/${TEST_PROFILE}/db.sqlite`

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(() => {
  setDatastoreRoot(null)
})

beforeEach(async () => {
  await mkdir(paths.files, { recursive: true })
  await mkdir(paths.knowledge, { recursive: true })
  await migrate_datastore(paths.database)
  await seedInstanceSetup()
})

afterEach(async () => {
  await rm(datastorePaths().root, { recursive: true, force: true })
})

describe('knowledge pipeline', () => {
  it('indexes an assigned Markdown source', async () => {
    await Bun.write(`${paths.files}/guide.md`, '# Guide test\n\nContenu propriétaire.')
    const source = insertKnowledgeSource({
      storageName: 'guide.md',
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 38,
      origin: 'ui',
      entries: []
    })
    replaceKnowledgeSourceEntries(
      source.id,
      [
        {
          title: 'Guide test',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: [TEST_PROFILE]
        }
      ],
      new Set([TEST_PROFILE])
    )

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const db = new Database(knowledgeDatabase(), { readonly: true })
    const row = db.query<{ content: string }, []>('SELECT content FROM documents').get()
    db.close()
    expect(row?.content).toContain('Contenu propriétaire')
    const agents = await Bun.file(`${datastorePaths().knowledge}/default/AGENTS.md`).text()
    expect(agents).toContain('Agent.')
    expect(agents).not.toContain('Current date')
  }, 20_000)

  it('publishes Core CSV PII only to the datastore', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'lots_locatifs')!
    const csv = 'id_lot;email_locataire;demande_sne\nLOT-1;locataire@example.org;SNE-1'
    await Bun.write(`${paths.files}/core_lots_locatifs.csv`, csv)
    insertKnowledgeSource({
      storageName: 'core_lots_locatifs.csv',
      originalName: contract.filename,
      fileType: 'csv',
      sizeBytes: csv.length,
      contentHash: 'a'.repeat(64),
      origin: 'ui',
      entries: [
        {
          title: 'lots_locatifs',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: [TEST_PROFILE]
        }
      ]
    })

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const datastore = new Database(paths.database, { readonly: true })
    expect(
      datastore
        .query<{ email_locataire: string }, []>('SELECT email_locataire FROM lots_locatifs')
        .get()
    ).toEqual({ email_locataire: 'locataire@example.org' })
    datastore.close()
    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const columns = knowledge
      .query<{ name: string }, []>('PRAGMA table_info("lots_locatifs")')
      .all()
      .map(({ name }) => name)
    knowledge.close()
    expect(columns).not.toContain('email_locataire')
    expect(columns).not.toContain('demande_sne')
  }, 20_000)

  it('publishes an unassigned Core CSV to the datastore only', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'travaux')!
    const csv = 'id_travaux;contexte\nTRV-1;toiture'
    await Bun.write(`${paths.files}/core_travaux.csv`, csv)
    insertKnowledgeSource({
      storageName: 'core_travaux.csv',
      originalName: contract.filename,
      fileType: 'csv',
      sizeBytes: csv.length,
      contentHash: 'c'.repeat(64),
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

    const result = await runKnowledgePipeline(Bun.randomUUIDv7())

    expect(result.mirrorTables).toEqual(['travaux'])
    const datastore = new Database(paths.database, { readonly: true })
    expect(
      datastore
        .query<{ id_travaux: string; contexte: string }, []>(
          'SELECT id_travaux, contexte FROM travaux'
        )
        .get()
    ).toEqual({ id_travaux: 'trv-1', contexte: 'toiture' })
    datastore.close()
    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const tables = knowledge
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'travaux'"
      )
      .all()
    knowledge.close()
    expect(tables).toHaveLength(0)
  }, 20_000)

  it('publishes Core CSV assigned only to a module without skills', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'comptes_locataires')!
    const csv = 'id_locataire;id_client;montant_en_euros\nLOC-1;CLI-1;120'
    await Bun.write(`${paths.files}/core_comptes_locataires.csv`, csv)
    insertKnowledgeSource({
      storageName: 'core_comptes_locataires.csv',
      originalName: contract.filename,
      fileType: 'csv',
      sizeBytes: csv.length,
      contentHash: 'd'.repeat(64),
      origin: 'ui',
      entries: [
        {
          title: 'comptes_locataires',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: [],
          moduleIds: ['repayment']
        }
      ]
    })

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const datastore = new Database(paths.database, { readonly: true })
    expect(
      datastore
        .query<{ montant_en_euros: number }, []>('SELECT montant_en_euros FROM comptes_locataires')
        .get()
    ).toEqual({ montant_en_euros: 120 })
    datastore.close()
    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const tables = knowledge
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'comptes_locataires'"
      )
      .all()
    knowledge.close()
    expect(tables).toHaveLength(0)
  }, 20_000)

  it('does not index an unassigned source', async () => {
    await Bun.write(`${paths.files}/private.md`, '# Non affecté')
    insertKnowledgeSource({
      storageName: 'private.md',
      originalName: 'Private.md',
      fileType: 'md',
      sizeBytes: 13,
      origin: 'cli',
      entries: []
    })

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const db = new Database(knowledgeDatabase(), { readonly: true })
    const matches = db
      .query<{ n: number }, []>("SELECT COUNT(*) AS n FROM documents WHERE filename = 'private'")
      .get()?.n
    db.close()
    expect(matches).toBe(0)
  }, 20_000)

  it('rejects assignments to profiles that no longer exist', async () => {
    insertKnowledgeSource({
      storageName: 'retired.md',
      originalName: 'Retired.md',
      fileType: 'md',
      sizeBytes: 0,
      origin: 'ui',
      entries: [
        {
          title: 'Retired',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: ['retired-profile']
        }
      ]
    })

    await expect(runKnowledgePipeline(Bun.randomUUIDv7())).rejects.toThrow(
      'Unknown knowledge profile: retired-profile'
    )
  })

  it('preserves existing mirror tables until the catalog owns them', async () => {
    const db = new Database(datastorePaths().database)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT PRIMARY KEY)')
    db.run("INSERT INTO reclamations VALUES ('REQ-EXISTING-DATA')")
    db.close()

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const updated = new Database(datastorePaths().database, { readonly: true })
    const row = updated
      .query<{ id_reclamation: string }, []>('SELECT id_reclamation FROM reclamations')
      .get()
    updated.close()
    expect(row).toEqual({ id_reclamation: 'REQ-EXISTING-DATA' })
  }, 20_000)

  it('keeps the live database when source validation fails', async () => {
    await Bun.write(`${paths.files}/guide.md`, '# Version valide')
    const source = insertKnowledgeSource({
      storageName: 'guide.md',
      originalName: 'Guide.md',
      fileType: 'md',
      sizeBytes: 16,
      origin: 'ui',
      entries: []
    })
    replaceKnowledgeSourceEntries(
      source.id,
      [
        {
          title: 'Guide',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: [TEST_PROFILE]
        }
      ],
      new Set([TEST_PROFILE])
    )
    await runKnowledgePipeline(Bun.randomUUIDv7())
    await Bun.file(`${paths.files}/guide.md`).delete()

    await expect(runKnowledgePipeline(Bun.randomUUIDv7())).rejects.toThrow(
      'Knowledge source validation failed'
    )

    const db = new Database(knowledgeDatabase(), { readonly: true })
    const row = db.query<{ content: string }, []>('SELECT content FROM documents').get()
    db.close()
    expect(row?.content).toContain('Version valide')
  }, 20_000)
})
