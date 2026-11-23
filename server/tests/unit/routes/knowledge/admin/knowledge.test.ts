import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'
import * as XLSX from 'xlsx'

import {
  deleteKnowledgeSourceController,
  getKnowledge,
  patchKnowledgeSource,
  postInspectKnowledgeWorkbook,
  postKnowledgeSources,
  toKnowledgeSourceDto
} from '../../../../../routes/knowledge/handlers'
import type { User } from '../../../../../utils/_schema'
import { authenticateAdministratorApi } from '../../../../../utils/authenticate-user'
import { authorizeAdministrator } from '../../../../../utils/authorize-role'
import { CORE_DATA_CONTRACT, DATASTORE_TABLES } from '../../../../../utils/datastore-tables'
import * as markdownFormatter from '../../../../../utils/format-markdown'
import * as buildCoordinator from '../../../../../utils/knowledge/build-coordinator'
import {
  completeKnowledgeBuild,
  createKnowledgeBuild
} from '../../../../../utils/knowledge/knowledge-builds'
import { getKnowledgeCatalogSnapshot } from '../../../../../utils/knowledge/knowledge-sources'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { seedInstanceSetup } from '../../../../seed-setup'

const paths = testDatastorePaths('admin_knowledge')
const originalBearer = Bun.env['AUTH_BEARER']
const ADMIN: User = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: [],
  chatbotIds: []
}
const USER: User = { ...ADMIN, email: 'user@example.org', isAdministrator: false }

const coreCsv = (table: (typeof CORE_DATA_CONTRACT)[number]['table']) => {
  const contract = CORE_DATA_CONTRACT.find((candidate) => candidate.table === table)!
  return {
    filename: contract.filename,
    content: `id;valeur\n${table}-1;ok`
  }
}

const buildWorkbookBytes = (sheets: Array<[string, unknown[][]]>) => {
  const book = XLSX.utils.book_new()
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as number[])
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  const actor = c.req.header('x-test-user')
  if (actor === 'admin') c.set('user', ADMIN)
  if (actor === 'user') c.set('user', USER)
  await next()
})
app.get('/knowledge', authorizeAdministrator, getKnowledge)
app.post('/knowledge/sources/inspect', authorizeAdministrator, postInspectKnowledgeWorkbook)
app.post('/knowledge/sources', authorizeAdministrator, postKnowledgeSources)
app.patch('/knowledge/sources/:id', authorizeAdministrator, patchKnowledgeSource)
app.delete('/knowledge/sources/:id', authorizeAdministrator, deleteKnowledgeSourceController)
const cliApp = new Hono()
cliApp.post(
  '/knowledge/sources',
  authenticateAdministratorApi,
  authorizeAdministrator,
  postKnowledgeSources
)

const request = (path: string, init: RequestInit = {}, actor: 'admin' | 'user' | null = 'admin') =>
  app.request(path, {
    ...init,
    headers: {
      ...(actor ? { 'x-test-user': actor } : {}),
      ...init.headers
    }
  })

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  Bun.env['AUTH_BEARER'] = 'knowledge-api-test-token'
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  await seedInstanceSetup()
})

beforeEach(() => {
  const db = new Database(datastorePaths().database)
  db.run('DELETE FROM knowledge_records')
  db.close()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  Bun.env['AUTH_BEARER'] = originalBearer
})

describe('administrator knowledge API', () => {
  it('derives Core Data bindings directly on the flat DTO', () => {
    const dto = toKnowledgeSourceDto({
      id: 'source-1',
      originalName: 'core.reclamations.csv',
      fileType: 'csv',
      sizeBytes: 1,
      contentHash: null,
      origin: 'ui',
      title: 'reclamations',
      sheetName: null,
      headerRow: null,
      headerHash: null,
      profileIds: ['default'],
      moduleIds: [],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z'
    })

    expect(dto.coreDataTable).toBe('reclamations')
  })

  it('requires an administrator role', async () => {
    expect((await request('/knowledge', {}, 'user')).status).toBe(403)
  })

  it('accepts a Bearer-authenticated CLI upload on the shared route', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# CLI'], 'Cli.md'))
    const response = await cliApp.request('/knowledge/sources', {
      method: 'POST',
      headers: { Authorization: 'Bearer knowledge-api-test-token' },
      body: form
    })
    expect(response.status).toBe(201)
  })

  it('never rebuilds after UI configuration changes', async () => {
    const initial = new FormData()
    initial.set('files[]', new File(['version 1'], 'Manuel.md'))
    const uploaded = (await (
      await request('/knowledge/sources', { method: 'POST', body: initial })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploaded.data.sources[0]!.source
    const requestBuild = spyOn(buildCoordinator, 'requestKnowledgeBuild').mockImplementation(
      () => null as never
    )

    try {
      const patched = await request(`/knowledge/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedAt: source.updatedAt,
          title: 'Manuel',
          profileIds: ['default'],
          moduleIds: []
        })
      })
      expect(patched.status).toBe(200)

      const replacement = new FormData()
      replacement.set('files[]', new File(['version 2'], 'Manuel.md'))
      expect(
        (
          await request('/knowledge/sources', {
            method: 'POST',
            body: replacement
          })
        ).status
      ).toBe(201)
      expect((await request(`/knowledge/sources/${source.id}`, { method: 'DELETE' })).status).toBe(
        200
      )
      expect(requestBuild).not.toHaveBeenCalled()
    } finally {
      requestBuild.mockRestore()
    }
  })

  it('requests one build after a complete Bearer upload batch with changed assigned sources', async () => {
    for (const name of ['Premier.md', 'Second.md']) {
      const form = new FormData()
      form.set('files[]', new File(['version 1'], name))
      const uploaded = (await (
        await request('/knowledge/sources', { method: 'POST', body: form })
      ).json()) as {
        data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
      }
      const source = uploaded.data.sources[0]!.source
      expect(
        (
          await request(`/knowledge/sources/${source.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updatedAt: source.updatedAt,
              title: name.replace('.md', ''),
              profileIds: ['default'],
              moduleIds: []
            })
          })
        ).status
      ).toBe(200)
    }

    const requestBuild = spyOn(buildCoordinator, 'requestKnowledgeBuild').mockImplementation(
      () => null as never
    )
    try {
      const changed = new FormData()
      changed.append('files[]', new File(['version 2'], 'Premier.md'))
      changed.append('files[]', new File(['version 2'], 'Second.md'))
      const response = await cliApp.request('/knowledge/sources', {
        method: 'POST',
        headers: { Authorization: 'Bearer knowledge-api-test-token' },
        body: changed
      })
      expect(response.status).toBe(201)
      expect(requestBuild).toHaveBeenCalledTimes(1)
      expect(requestBuild.mock.calls[0]?.[0]).toBe('upload')

      const identical = new FormData()
      identical.append('files[]', new File(['version 2'], 'Premier.md'))
      identical.append('files[]', new File(['version 2'], 'Second.md'))
      await cliApp.request('/knowledge/sources', {
        method: 'POST',
        headers: { Authorization: 'Bearer knowledge-api-test-token' },
        body: identical
      })

      for (const content of ['version 1', 'version 2']) {
        const unassigned = new FormData()
        unassigned.set('files[]', new File([content], 'Non affecté.md'))
        await cliApp.request('/knowledge/sources', {
          method: 'POST',
          headers: { Authorization: 'Bearer knowledge-api-test-token' },
          body: unassigned
        })
      }
      expect(requestBuild).toHaveBeenCalledTimes(1)
    } finally {
      requestBuild.mockRestore()
    }
  })

  it('reports only unpublished changes that affect build inputs', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# Guide'], 'Guide.md'))
    const uploaded = (await (
      await request('/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    let source = uploaded.data.sources[0]!.source
    const build = createKnowledgeBuild('manual', null)
    completeKnowledgeBuild(build.id, {
      catalogFingerprint: getKnowledgeCatalogSnapshot().fingerprint,
      diagnostics: [],
      items: [],
      coreFingerprint: null
    })

    expect(
      (
        (await (await request('/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(false)

    source = (
      (await (
        await request(`/knowledge/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updatedAt: source.updatedAt,
            title: 'Guide renommé',
            profileIds: [],
            moduleIds: []
          })
        })
      ).json()) as { data: { source: { id: string; updatedAt: string } } }
    ).data.source
    expect(
      (
        (await (await request('/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(false)

    await request(`/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        title: 'Guide renommé',
        profileIds: ['default'],
        moduleIds: []
      })
    })
    expect(
      (
        (await (await request('/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(true)
  })

  it('marks an unassigned Core Data upload as unpublished', async () => {
    const build = createKnowledgeBuild('manual', null)
    completeKnowledgeBuild(build.id, {
      catalogFingerprint: getKnowledgeCatalogSnapshot().fingerprint,
      diagnostics: [],
      items: [],
      coreFingerprint: null
    })

    const core = coreCsv('travaux')
    const form = new FormData()
    form.set('files[]', new File([core.content], core.filename))
    await request('/knowledge/sources', { method: 'POST', body: form })

    expect(
      (
        (await (await request('/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(true)
  })

  it('recognizes an exact Core Data filename and accepts ordinary CSV files', async () => {
    const core = coreCsv('reclamations')
    const form = new FormData()
    form.append('files[]', new File([core.content], core.filename))
    form.append('files[]', new File(['nom;valeur\nalpha;1'], 'indicateurs.csv'))

    const response = await request('/knowledge/sources', {
      method: 'POST',
      body: form
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      data: {
        sources: Array<{
          source: {
            originalName: string
            fileType: string
            title: string
            coreDataTable: string | null
          }
        }>
      }
    }
    expect(body.data.sources[0]?.source).toMatchObject({
      originalName: 'core.reclamations.csv',
      fileType: 'csv',
      title: 'reclamations',
      coreDataTable: 'reclamations'
    })
    expect(body.data.sources[1]?.source).toMatchObject({
      originalName: 'indicateurs.csv',
      fileType: 'csv',
      coreDataTable: null
    })
  })

  it('rejects invalid reserved names and keeps the previous file when the new CSV cannot be read', async () => {
    const wrongName = new FormData()
    wrongName.set('files[]', new File(['a;b\n1;2'], 'Core.reclamations.csv'))
    expect((await request('/knowledge/sources', { method: 'POST', body: wrongName })).status).toBe(
      400
    )

    const core = coreCsv('reclamations')
    const valid = new FormData()
    valid.set('files[]', new File([core.content], core.filename))
    const created = (await (
      await request('/knowledge/sources', { method: 'POST', body: valid })
    ).json()) as {
      data: { sources: Array<{ source: { contentHash: string; title: string } }> }
    }
    expect(created.data.sources[0]?.source.title).toBe('reclamations')

    const replacement = new FormData()
    replacement.set('files[]', new File(['id_reclamation\nREQ-2'], core.filename))
    expect(
      (await request('/knowledge/sources', { method: 'POST', body: replacement })).status
    ).toBe(201)

    const listed = (await (await request('/knowledge')).json()) as {
      data: { sources: Array<{ contentHash: string; title: string }> }
    }
    expect(listed.data.sources[0]?.contentHash).not.toBe(
      created.data.sources[0]?.source.contentHash
    )
    expect(listed.data.sources[0]?.title).toBe('reclamations')

    const comma = new FormData()
    comma.set('files[]', new File(['nom,valeur\nalpha,1'], core.filename))
    expect((await request('/knowledge/sources', { method: 'POST', body: comma })).status).toBe(400)
    const afterComma = (await (await request('/knowledge')).json()) as {
      data: { sources: Array<{ contentHash: string }> }
    }
    expect(afterComma.data.sources[0]?.contentHash).toBe(listed.data.sources[0]?.contentHash)
  })

  it('rejects non UTF-8 and comma-delimited ordinary CSV files', async () => {
    const invalidEncoding = new FormData()
    invalidEncoding.set('files[]', new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'encoding.csv'))
    expect(
      (await request('/knowledge/sources', { method: 'POST', body: invalidEncoding })).status
    ).toBe(400)

    const comma = new FormData()
    comma.set('files[]', new File(['nom,valeur\nalpha,1'], 'virgule.csv'))
    expect((await request('/knowledge/sources', { method: 'POST', body: comma })).status).toBe(400)
  })

  it('accepts a header-only Core snapshot', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'travaux')!
    const form = new FormData()
    form.set('files[]', new File(['id_travaux'], contract.filename))
    expect((await request('/knowledge/sources', { method: 'POST', body: form })).status).toBe(201)
  })

  it('defaults an ordinary CSV title to the filename stem and keeps an override', async () => {
    const form = new FormData()
    form.set('files[]', new File(['nom;valeur\nalpha;1'], 'Indicateurs 2024.csv'))
    const uploaded = (await (
      await request('/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string; title: string } }> }
    }
    const source = uploaded.data.sources[0]!.source
    expect(source.title).toBe('Indicateurs 2024')

    await request(`/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        title: 'Suivi des indicateurs',
        profileIds: [],
        moduleIds: []
      })
    })

    const again = new FormData()
    again.set('files[]', new File(['nom;valeur\nbeta;2'], 'Indicateurs 2024.csv'))
    const replaced = (await (
      await request('/knowledge/sources', { method: 'POST', body: again })
    ).json()) as {
      data: { sources: Array<{ source: { title: string } }> }
    }
    expect(replaced.data.sources[0]?.source.title).toBe('Suivi des indicateurs')
  })

  it('uploads and lists an unassigned source', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# Guide'], 'Guide.md', { type: 'text/markdown' }))

    expect((await request('/knowledge/sources', { method: 'POST', body: form })).status).toBe(201)

    const listed = await request('/knowledge')
    const body = (await listed.json()) as {
      data: {
        sources: Array<{ originalName: string; title: string; sheetName: string | null }>
        profiles: Array<{ kind: string }>
        coreDataTables: Array<{ table: string }>
      }
    }
    expect(body.data.sources).toEqual([
      expect.objectContaining({
        originalName: 'Guide.md',
        title: 'Guide',
        sheetName: null,
        profileIds: []
      })
    ])
    expect(body.data.profiles.some(({ kind }) => kind === 'skill')).toBe(true)
    expect(body.data.coreDataTables.map(({ table }) => table)).toEqual(DATASTORE_TABLES)
  })

  it('inspects a workbook without persisting anything', async () => {
    const bytes = buildWorkbookBytes([
      ['Patrimoine', [['Bandeau titre'], ['Code', 'Adresse'], ['RES-1', '10 rue des Lilas']]]
    ])
    const form = new FormData()
    form.set('file', new File([bytes], 'Patrimoine.xlsx'))
    const response = await request('/knowledge/sources/inspect', { method: 'POST', body: form })
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: {
        originalName: string
        sheets: Array<{ name: string; totalRows: number; rows: Array<{ rowNumber: number }> }>
      }
    }
    expect(body.data).toMatchObject({
      originalName: 'Patrimoine.xlsx',
      sheets: [{ name: 'Patrimoine', totalRows: 3 }]
    })
    expect(getKnowledgeCatalogSnapshot().sources).toHaveLength(0)
  })

  it('imports workbook sheets one by one via upsert, re-uploads silently when headerHash matches, and preserves sibling sheets & assignments on recovery', async () => {
    const v1 = buildWorkbookBytes([
      ['Patrimoine', [['Extraction janvier'], ['Code', 'Nom'], ['A1', 'Résidence A']]],
      [
        'Contacts',
        [
          ['Nom', 'Téléphone'],
          ['Alice', '0600000001']
        ]
      ],
      ['Ignoré', [['Note libre']]]
    ])
    const firstSheet = new FormData()
    firstSheet.set('files[]', new File([v1], 'Carnet.xlsx'))
    firstSheet.set(
      'sheet',
      JSON.stringify({
        sheetName: 'Patrimoine',
        headerRow: 2,
        title: 'Patrimoine immobilier'
      })
    )
    const firstUploaded = await request('/knowledge/sources', { method: 'POST', body: firstSheet })
    expect(firstUploaded.status).toBe(201)
    type SheetUploadBody = {
      data: {
        sources: Array<{
          changed: boolean
          source: {
            id: string
            title: string
            sheetName: string
            headerRow: number
            contentHash: string
            headerHash: string
            profileIds: string[]
            updatedAt: string
          }
        }>
      }
    }
    const patrimoineV1 = ((await firstUploaded.json()) as SheetUploadBody).data.sources[0]!.source
    expect(patrimoineV1).toMatchObject({
      title: 'Patrimoine immobilier',
      sheetName: 'Patrimoine',
      headerRow: 2,
      profileIds: []
    })

    // Assign Patrimoine via PATCH to verify assignments survive single-sheet re-imports
    expect(
      (
        await request(`/knowledge/sources/${patrimoineV1.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updatedAt: patrimoineV1.updatedAt,
            title: 'Patrimoine immobilier',
            profileIds: ['default'],
            moduleIds: []
          })
        })
      ).status
    ).toBe(200)

    // Second popup imports Contacts without deleting Patrimoine
    const secondSheet = new FormData()
    secondSheet.set('files[]', new File([v1], 'Carnet.xlsx'))
    secondSheet.set(
      'sheet',
      JSON.stringify({
        sheetName: 'Contacts',
        headerRow: 1,
        title: 'Contacts agences'
      })
    )
    const secondUploaded = await request('/knowledge/sources', {
      method: 'POST',
      body: secondSheet
    })
    expect(secondUploaded.status).toBe(201)
    const contactsV1 = ((await secondUploaded.json()) as SheetUploadBody).data.sources[0]!.source
    expect(getKnowledgeCatalogSnapshot().sources).toHaveLength(2)

    // Re-upload where only Patrimoine data changed (and banner date changed); Contacts untouched; Ignoré stays ignored.
    const v2 = buildWorkbookBytes([
      [
        'Patrimoine',
        [['Extraction février'], ['Code', 'Nom'], ['A1', 'Résidence A'], ['A2', 'Résidence B']]
      ],
      [
        'Contacts',
        [
          ['Nom', 'Téléphone'],
          ['Alice', '0600000001']
        ]
      ],
      ['Ignoré', [['Autre note']]]
    ])
    const reupload = new FormData()
    reupload.set('files[]', new File([v2], 'Carnet.xlsx'))
    const reuploaded = await request('/knowledge/sources', { method: 'POST', body: reupload })
    expect(reuploaded.status).toBe(201)
    const reuploadBody = (await reuploaded.json()) as SheetUploadBody
    expect(reuploadBody.data.sources).toHaveLength(2)
    expect(reuploadBody.data.sources[0]).toMatchObject({
      changed: true,
      source: {
        id: patrimoineV1.id,
        title: 'Patrimoine immobilier',
        headerHash: patrimoineV1.headerHash,
        profileIds: ['default']
      }
    })
    expect(reuploadBody.data.sources[1]).toMatchObject({
      changed: false,
      source: {
        id: contactsV1.id,
        contentHash: contactsV1.contentHash
      }
    })

    // Re-upload where Patrimoine headers are renamed on headerRow -> 400 spreadsheet_structure_changed
    const v3Renamed = buildWorkbookBytes([
      ['Patrimoine', [['Extraction mars'], ['Code', 'Libellé'], ['A1', 'Résidence A']]],
      [
        'Contacts',
        [
          ['Nom', 'Téléphone'],
          ['Alice', '0600000001']
        ]
      ]
    ])
    const renamed = new FormData()
    renamed.set('files[]', new File([v3Renamed], 'Carnet.xlsx'))
    const renamedRes = await request('/knowledge/sources', { method: 'POST', body: renamed })
    expect(renamedRes.status).toBe(400)
    expect(await renamedRes.json()).toMatchObject({
      error: { code: 'spreadsheet_structure_changed' }
    })

    // Re-upload where Patrimoine headers shifted down -> 400 invalid_spreadsheet_header
    const v3 = buildWorkbookBytes([
      [
        'Patrimoine',
        [['Nouveau bandeau 1'], ['Nouveau bandeau 2'], ['Code', 'Nom'], ['A1', 'Résidence A']]
      ],
      [
        'Contacts',
        [
          ['Nom', 'Téléphone'],
          ['Alice', '0600000001']
        ]
      ]
    ])
    const shifted = new FormData()
    shifted.set('files[]', new File([v3], 'Carnet.xlsx'))
    const shiftedRes = await request('/knowledge/sources', { method: 'POST', body: shifted })
    expect(shiftedRes.status).toBe(400)
    expect(await shiftedRes.json()).toMatchObject({
      error: { code: 'invalid_spreadsheet_header' }
    })

    // Single-sheet recovery updates Patrimoine in place (keeping id and assignments) without dropping Contacts
    const recovered = new FormData()
    recovered.set('files[]', new File([v3], 'Carnet.xlsx'))
    recovered.set(
      'sheet',
      JSON.stringify({
        sheetName: 'Patrimoine',
        headerRow: 3,
        title: 'Patrimoine immobilier'
      })
    )
    const recoveredRes = await request('/knowledge/sources', { method: 'POST', body: recovered })
    expect(recoveredRes.status).toBe(201)
    const remaining = getKnowledgeCatalogSnapshot().sources
    expect(remaining).toHaveLength(2)
    expect(remaining.find((source) => source.sheetName === 'Patrimoine')).toMatchObject({
      id: patrimoineV1.id,
      headerRow: 3,
      profileIds: ['default']
    })
    expect(remaining.find((source) => source.sheetName === 'Contacts')).toMatchObject({
      id: contactsV1.id
    })

    // Re-upload missing a configured sheet -> 400 missing_configured_sheet
    const v4 = buildWorkbookBytes([['Autre', [['a']]]])
    const missing = new FormData()
    missing.set('files[]', new File([v4], 'Carnet.xlsx'))
    const missingRes = await request('/knowledge/sources', { method: 'POST', body: missing })
    expect(missingRes.status).toBe(400)
    expect(await missingRes.json()).toMatchObject({
      error: { code: 'missing_configured_sheet' }
    })

    // Passing sheet config with a non-xlsx file or multiple files -> 400 invalid_config
    const nonXlsxSheet = new FormData()
    nonXlsxSheet.set('files[]', new File(['# Note'], 'Note.md'))
    nonXlsxSheet.set(
      'sheet',
      JSON.stringify({ sheetName: 'Patrimoine', headerRow: 1, title: 'Note' })
    )
    const nonXlsxRes = await request('/knowledge/sources', { method: 'POST', body: nonXlsxSheet })
    expect(nonXlsxRes.status).toBe(400)
    expect(await nonXlsxRes.json()).toMatchObject({
      error: { code: 'invalid_config' }
    })

    const multiFileSheet = new FormData()
    multiFileSheet.append('files[]', new File([v3], 'Carnet.xlsx'))
    multiFileSheet.append('files[]', new File([v3], 'Autre.xlsx'))
    multiFileSheet.set(
      'sheet',
      JSON.stringify({ sheetName: 'Patrimoine', headerRow: 3, title: 'Patrimoine' })
    )
    const multiFileRes = await request('/knowledge/sources', {
      method: 'POST',
      body: multiFileSheet
    })
    expect(multiFileRes.status).toBe(400)
    expect(await multiFileRes.json()).toMatchObject({
      error: { code: 'invalid_config' }
    })
  })

  it('keeps configuration when a known filename is uploaded again', async () => {
    const firstForm = new FormData()
    firstForm.set('files[]', new File(['v1'], 'Guide.md'))
    const firstResponse = await request('/knowledge/sources', {
      method: 'POST',
      body: firstForm
    })
    const firstBody = (await firstResponse.json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const firstSource = firstBody.data.sources[0]!.source
    const id = firstSource.id
    await request(`/knowledge/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: firstSource.updatedAt,
        title: 'Guide interne',
        profileIds: [],
        moduleIds: []
      })
    })

    const secondForm = new FormData()
    secondForm.set('files[]', new File(['version 2'], 'Guide.md'))
    await request('/knowledge/sources', { method: 'POST', body: secondForm })

    const listed = (await (await request('/knowledge')).json()) as {
      data: { sources: Array<{ id: string; title: string }> }
    }
    expect(listed.data.sources).toEqual([expect.objectContaining({ id, title: 'Guide interne' })])
  })

  it('does not mutate a source when the uploaded bytes are identical', async () => {
    const first = new FormData()
    first.set('files[]', new File(['identical'], 'Stable.md'))
    const firstBody = (await (
      await request('/knowledge/sources', { method: 'POST', body: first })
    ).json()) as {
      data: {
        sources: Array<{
          changed: boolean
          source: { contentHash: string; updatedAt: string }
        }>
      }
    }

    const second = new FormData()
    second.set('files[]', new File(['identical'], 'Stable.md'))
    const secondBody = (await (
      await request('/knowledge/sources', { method: 'POST', body: second })
    ).json()) as typeof firstBody

    expect(secondBody.data.sources[0]).toMatchObject({
      changed: false,
      source: {
        contentHash: firstBody.data.sources[0]!.source.contentHash,
        updatedAt: firstBody.data.sources[0]!.source.updatedAt
      }
    })
  })

  it('keeps distinct accented and unaccented filenames separate without artificial collisions', async () => {
    const first = new FormData()
    first.set('files[]', new File(['a'], 'Résumé.md'))
    expect((await request('/knowledge/sources', { method: 'POST', body: first })).status).toBe(201)

    const second = new FormData()
    second.set('files[]', new File(['b'], 'Resume.md'))
    expect((await request('/knowledge/sources', { method: 'POST', body: second })).status).toBe(201)
    expect(getKnowledgeCatalogSnapshot().sources).toHaveLength(2)
  })

  it('rejects a stale administrator edit', async () => {
    const form = new FormData()
    form.set('files[]', new File(['a'], 'Guide.md'))
    const uploaded = (await (
      await request('/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploaded.data.sources[0]!.source
    expect(
      (
        await request(`/knowledge/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Première modification',
            profileIds: [],
            moduleIds: [],
            updatedAt: source.updatedAt
          })
        })
      ).status
    ).toBe(200)

    const stale = await request(`/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Écrasement tardif',
        profileIds: [],
        moduleIds: [],
        updatedAt: source.updatedAt
      })
    })
    expect(stale.status).toBe(409)
  })

  it('rejects unknown profile assignments without changing the source', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# Guide'], 'Guide.md'))
    const uploaded = await request('/knowledge/sources', { method: 'POST', body: form })
    const uploadBody = (await uploaded.json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploadBody.data.sources[0]!.source

    const response = await request(`/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        title: 'Guide',
        profileIds: ['missing'],
        moduleIds: []
      })
    })
    expect(response.status).toBe(409)
  })

  it('returns 400 on corrupt docx and 500 on markdown formatter failure', async () => {
    const corruptDocx = new FormData()
    corruptDocx.set('files[]', new File(['not a docx'], 'Corrompu.docx'))
    expect(
      (await request('/knowledge/sources', { method: 'POST', body: corruptDocx })).status
    ).toBe(400)

    const formatSpy = spyOn(markdownFormatter, 'formatMarkdown').mockRejectedValue(
      new Error('bun fmt failed')
    )
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const md = new FormData()
      md.set('files[]', new File(['# Guide'], 'Panne.md'))
      expect((await request('/knowledge/sources', { method: 'POST', body: md })).status).toBe(500)
    } finally {
      formatSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})
