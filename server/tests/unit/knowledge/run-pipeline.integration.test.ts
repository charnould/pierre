import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import type { BusinessModuleId } from '../../../../shared/modules'
import { FIELDS } from '../../../utils/carl'
import { migrate_datastore } from '../../../utils/datastore-migrations'
import { CORE_DATA_CONTRACT } from '../../../utils/datastore-tables'
import { replaceKnowledgeSourceEntries } from '../../../utils/knowledge/catalog'
import { importKnowledgeFiles } from '../../../utils/knowledge/import-files'
import { runKnowledgePipeline } from '../../../utils/knowledge/run-pipeline'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('pipeline')
const TEST_PROFILE = 'default'
const PROFILES = new Set(['default', 'repayment', 'about', 'report', 'replies'])

const knowledgeDatabase = () => `${datastorePaths().knowledge}/${TEST_PROFILE}/db.sqlite`

const upload = async (
  filename: string,
  body: string,
  entry: {
    profileIds?: string[]
    moduleIds?: BusinessModuleId[]
    title?: string
  } = {}
) => {
  const imported = await importKnowledgeFiles([new File([body], filename)], 'ui')
  const source = imported.sources[0]!.source
  if (!entry.profileIds && !entry.moduleIds && !entry.title) return source
  const current = source.entries[0]!
  return replaceKnowledgeSourceEntries(
    source.id,
    [
      {
        ...current,
        title: entry.title ?? current.title,
        profileIds: entry.profileIds ?? current.profileIds,
        moduleIds: entry.moduleIds ?? current.moduleIds
      }
    ],
    PROFILES
  )!
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(() => {
  setDatastoreRoot(null)
})

beforeEach(async () => {
  await mkdir(paths.knowledge, { recursive: true })
  await migrate_datastore(paths.database)
  await seedInstanceSetup()
})

afterEach(async () => {
  await rm(datastorePaths().root, { recursive: true, force: true })
})

describe('knowledge pipeline', () => {
  it('indexes an assigned Markdown source', async () => {
    await upload('Guide.md', '# Guide test\n\nContenu propriétaire.', {
      title: 'Guide test',
      profileIds: [TEST_PROFILE]
    })

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const db = new Database(knowledgeDatabase(), { readonly: true })
    const row = db
      .query<{ content: string }, [string]>(
        'SELECT content FROM documents WHERE content LIKE ? LIMIT 1'
      )
      .get('%Contenu propriétaire%')
    db.close()
    expect(row?.content).toContain('Contenu propriétaire')
    const agents = await Bun.file(`${datastorePaths().knowledge}/default/AGENTS.md`).text()
    expect(agents).toContain('Agent.')
    expect(agents).not.toContain('Current date')
  }, 20_000)

  it('publishes Core CSV PII only to the datastore', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'lots_locatifs')!
    await upload(
      contract.filename,
      'id_lot;email_locataire;telephone_locataire;demande_sne\n' +
        'LOT-1;locataire@example.org;06 11 56 39 59;SNE-1',
      { profileIds: [TEST_PROFILE] }
    )

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const datastore = new Database(paths.database, { readonly: true })
    expect(
      datastore
        .query<{ email_locataire: string; telephone_locataire: string }, []>(
          'SELECT email_locataire, telephone_locataire FROM lots_locatifs'
        )
        .get()
    ).toEqual({
      email_locataire: 'locataire@example.org',
      telephone_locataire: '+33611563959'
    })
    expect(
      datastore
        .query<{ value: string; status: string }, [string]>(
          'SELECT value, status FROM contacts WHERE value = ?'
        )
        .get('+33611563959')
    ).toEqual({ value: '+33611563959', status: 'rcs_compatible' })
    datastore.close()
    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const columns = knowledge
      .query<{ name: string }, []>('PRAGMA table_info("lots_locatifs")')
      .all()
      .map(({ name }) => name)
    knowledge.close()
    expect(columns).not.toContain('email_locataire')
    expect(columns).not.toContain('telephone_locataire')
    expect(columns).not.toContain('demande_sne')
  }, 20_000)

  it('publishes an unassigned Core CSV to the datastore only', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'travaux')!
    await upload(contract.filename, 'id_travaux;contexte\nTRV-1;toiture')

    const result = await runKnowledgePipeline(Bun.randomUUIDv7())

    expect(result.coreFingerprint).toBeString()
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
    await upload(contract.filename, 'id_locataire;id_client;montant_en_euros\nLOC-1;CLI-1;120', {
      moduleIds: ['repayment']
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
    await upload('Private.md', '# Non affecté')
    await runKnowledgePipeline(Bun.randomUUIDv7())

    const db = new Database(knowledgeDatabase(), { readonly: true })
    const matches = db
      .query<{ n: number }, []>("SELECT COUNT(*) AS n FROM documents WHERE filename = 'private'")
      .get()?.n
    db.close()
    expect(matches).toBe(0)
  }, 20_000)

  it('rejects assignments to profiles that no longer exist', async () => {
    const source = await upload('Retired.md', '# Retiré')
    expect(() =>
      replaceKnowledgeSourceEntries(
        source.id,
        [
          {
            ...source.entries[0]!,
            profileIds: ['retired-profile']
          }
        ],
        PROFILES
      )
    ).toThrow('Unknown knowledge profile: retired-profile')
  })

  it('drops a Core table that the catalog does not own', async () => {
    const db = new Database(datastorePaths().database)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT PRIMARY KEY)')
    db.run("INSERT INTO reclamations VALUES ('REQ-EXISTING-DATA')")
    db.close()

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const updated = new Database(datastorePaths().database, { readonly: true })
    const tables = updated
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reclamations'"
      )
      .all()
    updated.close()
    expect(tables).toHaveLength(0)
  }, 20_000)

  it('keeps the live database when canonical content disappears', async () => {
    const source = await upload('Guide.md', '# Version valide', { profileIds: [TEST_PROFILE] })
    await runKnowledgePipeline(Bun.randomUUIDv7())
    const db = new Database(paths.database)
    db.run(
      `UPDATE knowledge_records
       SET content = NULL, document = json_set(document, '$.content_hash', ?)
       WHERE id = ?`,
      ['b'.repeat(64), source.id]
    )
    db.close()

    await expect(runKnowledgePipeline(Bun.randomUUIDv7())).rejects.toThrow('Contenu introuvable')

    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const row = knowledge
      .query<{ content: string }, [string]>(
        'SELECT content FROM documents WHERE content LIKE ? LIMIT 1'
      )
      .get('%Version valide%')
    knowledge.close()
    expect(row?.content).toContain('Version valide')
  }, 20_000)

  it('publishes cached CARL columns for an unassigned reclamations file', async () => {
    const db = new Database(paths.database)
    db.run(
      `INSERT INTO carl_qualifications (
         id_reclamation, domaine, sous_domaine, motif, integrite_physique, lieu,
         obligation_reglementaire, ton
       ) VALUES ('req-1', 'cache-preuve', 'sous', 'motif', 'intacte', 'logement', 'bailleur', 'neutre')`
    )
    db.close()
    await upload('core.reclamations.csv', 'id_reclamation;message;domaine\nreq-1;fuite;source')

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const datastore = new Database(paths.database, { readonly: true })
    const columns = datastore
      .query<{ name: string }, []>('PRAGMA table_info("reclamations")')
      .all()
      .map(({ name }) => name)
    const row = datastore.query<{ domaine: string }, []>('SELECT domaine FROM reclamations').get()
    const activities = datastore
      .query<{ n: number }, []>(
        "SELECT COUNT(*) AS n FROM activites WHERE type = 'ticket.field_changed'"
      )
      .get()?.n
    datastore.close()
    expect(columns).toEqual(['id_reclamation', 'message', ...FIELDS])
    expect(row).toEqual({ domaine: 'cache-preuve' })
    expect(activities).toBe(0)
    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const tables = knowledge
      .query<{ n: number }, []>(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'reclamations'"
      )
      .get()?.n
    knowledge.close()
    expect(tables).toBe(0)
  }, 20_000)

  it('publishes the same CARL columns to an assigned knowledge profile', async () => {
    const db = new Database(paths.database)
    db.run(
      `INSERT INTO carl_qualifications (
         id_reclamation, domaine, sous_domaine, motif, integrite_physique, lieu,
         obligation_reglementaire, ton
       ) VALUES ('req-1', 'cache-preuve', 'sous', 'motif', 'intacte', 'logement', 'bailleur', 'neutre')`
    )
    db.close()
    await upload('core.reclamations.csv', 'id_reclamation;message;domaine\nreq-1;fuite;source', {
      profileIds: [TEST_PROFILE]
    })

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const knowledge = new Database(knowledgeDatabase(), { readonly: true })
    const columns = knowledge
      .query<{ name: string }, []>('PRAGMA table_info("reclamations")')
      .all()
      .map(({ name }) => name)
    const row = knowledge.query<{ domaine: string }, []>('SELECT domaine FROM reclamations').get()
    knowledge.close()
    expect(columns).toEqual(['id_reclamation', 'message', ...FIELDS])
    expect(row).toEqual({ domaine: 'cache-preuve' })
  }, 20_000)

  it('creates CARL columns for a header-only reclamations file', async () => {
    await upload('core.reclamations.csv', 'id_reclamation;message\n')

    await runKnowledgePipeline(Bun.randomUUIDv7())

    const datastore = new Database(paths.database, { readonly: true })
    const columns = datastore
      .query<{ name: string }, []>('PRAGMA table_info("reclamations")')
      .all()
      .map(({ name }) => name)
    const count = datastore.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM reclamations').get()
    datastore.close()
    expect(columns).toEqual(['id_reclamation', 'message', ...FIELDS])
    expect(count?.n).toBe(0)
  }, 20_000)

  it('does not publish reclamations when the message column is missing', async () => {
    const db = new Database(paths.database)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT PRIMARY KEY)')
    db.run("INSERT INTO reclamations VALUES ('REQ-EXISTING')")
    db.close()
    await upload('core.reclamations.csv', 'id_reclamation;canal\nreq-1;appel')

    await expect(runKnowledgePipeline(Bun.randomUUIDv7())).rejects.toThrow(
      'La colonne message est absente.'
    )

    const datastore = new Database(paths.database, { readonly: true })
    const row = datastore
      .query<{ id_reclamation: string }, []>('SELECT id_reclamation FROM reclamations')
      .get()
    const cached = datastore
      .query<{ n: number }, []>('SELECT COUNT(*) AS n FROM carl_qualifications')
      .get()?.n
    datastore.close()
    expect(row).toEqual({ id_reclamation: 'REQ-EXISTING' })
    expect(cached).toBe(0)
  }, 20_000)

  it('does not rebuild an unchanged profile', async () => {
    await upload('Guide.md', '# Stable', { profileIds: [TEST_PROFILE] })
    await runKnowledgePipeline(Bun.randomUUIDv7())
    const first = await Bun.file(knowledgeDatabase()).arrayBuffer()
    await runKnowledgePipeline(Bun.randomUUIDv7())
    const second = await Bun.file(knowledgeDatabase()).arrayBuffer()
    expect(new Uint8Array(second)).toEqual(new Uint8Array(first))
  }, 20_000)
})
