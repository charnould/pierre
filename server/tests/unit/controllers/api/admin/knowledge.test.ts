import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'
import * as XLSX from 'xlsx'

import {
  deleteKnowledgeSourceController,
  getKnowledge,
  patchKnowledgeSource,
  postKnowledgeSources,
  toKnowledgeSourceDto
} from '../../../../../controllers/api/admin/knowledge'
import type { User } from '../../../../../utils/_schema'
import { authenticateAdministratorApi } from '../../../../../utils/authenticate-user'
import { authorizeAdministrator } from '../../../../../utils/authorize-role'
import { CORE_DATA_CONTRACT, DATASTORE_TABLES } from '../../../../../utils/datastore-tables'
import * as buildCoordinator from '../../../../../utils/knowledge/build-coordinator'
import {
  completeKnowledgeBuild,
  createKnowledgeBuild,
  getKnowledgeCatalogSnapshot
} from '../../../../../utils/knowledge/catalog'
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

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  const actor = c.req.header('x-test-user')
  if (actor === 'admin') c.set('user', ADMIN)
  if (actor === 'user') c.set('user', USER)
  await next()
})
app.get('/api/admin/knowledge', authorizeAdministrator, getKnowledge)
app.post('/api/admin/knowledge/sources', authorizeAdministrator, postKnowledgeSources)
app.patch('/api/admin/knowledge/sources/:id', authorizeAdministrator, patchKnowledgeSource)
app.delete(
  '/api/admin/knowledge/sources/:id',
  authorizeAdministrator,
  deleteKnowledgeSourceController
)
const cliApp = new Hono()
cliApp.post(
  '/api/admin/knowledge/sources',
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
  Bun.env['AUTH_BEARER'] = originalBearer
})

describe('administrator knowledge API', () => {
  it('derives stable item keys and Core Data bindings for every entry', () => {
    const dto = toKnowledgeSourceDto({
      id: 'source-1',
      storageName: 'core_reclamations.csv',
      originalName: 'core.reclamations.csv',
      fileType: 'csv',
      sizeBytes: 1,
      contentHash: null,
      origin: 'ui',
      entries: [
        {
          title: 'reclamations',
          sheet: null,
          sheetName: null,
          headerRow: null,
          profileIds: ['default'],
          moduleIds: []
        }
      ],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z'
    })

    expect(dto.itemKeys).toEqual(['source-1:document'])
    expect(dto.coreDataEntries).toEqual([{ index: 0, table: 'reclamations' }])
  })

  it('requires an administrator', async () => {
    expect((await request('/api/admin/knowledge', {}, null)).status).toBe(401)
    expect((await request('/api/admin/knowledge', {}, 'user')).status).toBe(403)
  })

  it('accepts a Bearer-authenticated CLI upload on the shared route', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# CLI'], 'Cli.md'))
    const response = await cliApp.request('/api/admin/knowledge/sources', {
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
      await request('/api/admin/knowledge/sources', { method: 'POST', body: initial })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploaded.data.sources[0]!.source
    const requestBuild = spyOn(buildCoordinator, 'requestKnowledgeBuild').mockImplementation(
      () => null as never
    )

    try {
      const patched = await request(`/api/admin/knowledge/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedAt: source.updatedAt,
          entries: [
            {
              title: 'Manuel',
              sheet: null,
              sheetName: null,
              headerRow: null,
              profileIds: ['default']
            }
          ]
        })
      })
      expect(patched.status).toBe(200)

      const replacement = new FormData()
      replacement.set('files[]', new File(['version 2'], 'Manuel.md'))
      expect(
        (
          await request('/api/admin/knowledge/sources', {
            method: 'POST',
            body: replacement
          })
        ).status
      ).toBe(201)
      expect(
        (await request(`/api/admin/knowledge/sources/${source.id}`, { method: 'DELETE' })).status
      ).toBe(200)
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
        await request('/api/admin/knowledge/sources', { method: 'POST', body: form })
      ).json()) as {
        data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
      }
      const source = uploaded.data.sources[0]!.source
      expect(
        (
          await request(`/api/admin/knowledge/sources/${source.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updatedAt: source.updatedAt,
              entries: [
                {
                  title: name.replace('.md', ''),
                  sheet: null,
                  sheetName: null,
                  headerRow: null,
                  profileIds: ['default']
                }
              ]
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
      const response = await cliApp.request('/api/admin/knowledge/sources', {
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
      await cliApp.request('/api/admin/knowledge/sources', {
        method: 'POST',
        headers: { Authorization: 'Bearer knowledge-api-test-token' },
        body: identical
      })

      for (const content of ['version 1', 'version 2']) {
        const unassigned = new FormData()
        unassigned.set('files[]', new File([content], 'Non affecté.md'))
        await cliApp.request('/api/admin/knowledge/sources', {
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
      await request('/api/admin/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    let source = uploaded.data.sources[0]!.source
    const build = createKnowledgeBuild('manual', null)
    completeKnowledgeBuild(build.id, {
      catalogFingerprint: getKnowledgeCatalogSnapshot().fingerprint,
      diagnostics: [],
      items: [],
      mirrorTables: []
    })

    expect(
      (
        (await (await request('/api/admin/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(false)

    source = (
      (await (
        await request(`/api/admin/knowledge/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updatedAt: source.updatedAt,
            entries: [
              {
                title: 'Guide renommé',
                sheet: null,
                sheetName: null,
                headerRow: null,
                profileIds: []
              }
            ]
          })
        })
      ).json()) as { data: { source: { id: string; updatedAt: string } } }
    ).data.source
    expect(
      (
        (await (await request('/api/admin/knowledge')).json()) as {
          data: { needsRebuild: boolean }
        }
      ).data.needsRebuild
    ).toBe(false)

    await request(`/api/admin/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        entries: [
          {
            title: 'Guide renommé',
            sheet: null,
            sheetName: null,
            headerRow: null,
            profileIds: ['default']
          }
        ]
      })
    })
    expect(
      (
        (await (await request('/api/admin/knowledge')).json()) as {
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
      mirrorTables: []
    })

    const core = coreCsv('travaux')
    const form = new FormData()
    form.set('files[]', new File([core.content], core.filename))
    await request('/api/admin/knowledge/sources', { method: 'POST', body: form })

    expect(
      (
        (await (await request('/api/admin/knowledge')).json()) as {
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

    const response = await request('/api/admin/knowledge/sources', {
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
            entries: Array<{ title: string }>
            coreDataEntries: Array<{ table: string }>
          }
        }>
      }
    }
    expect(body.data.sources[0]?.source).toMatchObject({
      originalName: 'core.reclamations.csv',
      fileType: 'csv',
      entries: [{ title: 'reclamations' }],
      coreDataEntries: [{ table: 'reclamations' }]
    })
    expect(body.data.sources[1]?.source).toMatchObject({
      originalName: 'indicateurs.csv',
      fileType: 'csv',
      coreDataEntries: []
    })
  })

  it('rejects invalid reserved names and keeps the previous file when the new CSV cannot be read', async () => {
    const wrongName = new FormData()
    wrongName.set('files[]', new File(['a;b\n1;2'], 'Core.reclamations.csv'))
    expect(
      (
        await request('/api/admin/knowledge/sources', {
          method: 'POST',
          body: wrongName
        })
      ).status
    ).toBe(400)

    const core = coreCsv('reclamations')
    const valid = new FormData()
    valid.set('files[]', new File([core.content], core.filename))
    const created = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: valid })
    ).json()) as {
      data: {
        sources: Array<{ source: { contentHash: string; entries: Array<{ title: string }> } }>
      }
    }
    expect(created.data.sources[0]?.source.entries[0]?.title).toBe('reclamations')

    const replacement = new FormData()
    replacement.set('files[]', new File(['id_reclamation\nREQ-2'], core.filename))
    const accepted = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: replacement
    })
    expect(accepted.status).toBe(201)

    const listed = (await (await request('/api/admin/knowledge')).json()) as {
      data: { sources: Array<{ contentHash: string; entries: Array<{ title: string }> }> }
    }
    expect(listed.data.sources[0]?.contentHash).not.toBe(
      created.data.sources[0]?.source.contentHash
    )
    expect(listed.data.sources[0]?.entries[0]?.title).toBe('reclamations')

    const comma = new FormData()
    comma.set('files[]', new File(['nom,valeur\nalpha,1'], core.filename))
    expect(
      (await request('/api/admin/knowledge/sources', { method: 'POST', body: comma })).status
    ).toBe(400)
    const afterComma = (await (await request('/api/admin/knowledge')).json()) as {
      data: { sources: Array<{ contentHash: string }> }
    }
    expect(afterComma.data.sources[0]?.contentHash).toBe(listed.data.sources[0]?.contentHash)
  })

  it('rejects non UTF-8 and comma-delimited ordinary CSV files', async () => {
    const invalidEncoding = new FormData()
    invalidEncoding.set('files[]', new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'encoding.csv'))
    expect(
      (
        await request('/api/admin/knowledge/sources', {
          method: 'POST',
          body: invalidEncoding
        })
      ).status
    ).toBe(400)

    const comma = new FormData()
    comma.set('files[]', new File(['nom,valeur\nalpha,1'], 'virgule.csv'))
    expect(
      (
        await request('/api/admin/knowledge/sources', {
          method: 'POST',
          body: comma
        })
      ).status
    ).toBe(400)
  })

  it('accepts a header-only Core snapshot', async () => {
    const contract = CORE_DATA_CONTRACT.find(({ table }) => table === 'travaux')!
    const form = new FormData()
    form.set('files[]', new File(['id_travaux'], contract.filename))
    const response = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: form
    })
    expect(response.status).toBe(201)
  })

  it('defaults an ordinary CSV title to the filename stem and keeps an override', async () => {
    const form = new FormData()
    form.set('files[]', new File(['nom;valeur\nalpha;1'], 'Indicateurs 2024.csv'))
    const uploaded = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: {
        sources: Array<{
          source: { id: string; updatedAt: string; entries: Array<{ title: string }> }
        }>
      }
    }
    const source = uploaded.data.sources[0]!.source
    expect(source.entries[0]?.title).toBe('Indicateurs 2024')

    await request(`/api/admin/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        entries: [
          {
            title: 'Suivi des indicateurs',
            sheet: null,
            sheetName: null,
            headerRow: null,
            profileIds: []
          }
        ]
      })
    })

    const again = new FormData()
    again.set('files[]', new File(['nom;valeur\nbeta;2'], 'Indicateurs 2024.csv'))
    const replaced = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: again })
    ).json()) as {
      data: { sources: Array<{ source: { entries: Array<{ title: string }> } }> }
    }
    expect(replaced.data.sources[0]?.source.entries[0]?.title).toBe('Suivi des indicateurs')
  })

  it('uploads and lists an unassigned source', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# Guide'], 'Guide.md', { type: 'text/markdown' }))

    const uploaded = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: form
    })
    expect(uploaded.status).toBe(201)

    const listed = await request('/api/admin/knowledge')
    const body = (await listed.json()) as {
      data: {
        sources: Array<{ originalName: string; entries: unknown[] }>
        profiles: Array<{ kind: string }>
        coreDataTables: Array<{ table: string }>
      }
    }
    expect(body.data.sources).toEqual([
      expect.objectContaining({
        originalName: 'Guide.md',
        entries: [
          expect.objectContaining({
            title: 'Guide',
            sheetName: null,
            profileIds: []
          })
        ]
      })
    ])
    expect(body.data.profiles.some(({ kind }) => kind === 'skill')).toBe(true)
    expect(body.data.coreDataTables.map(({ table }) => table)).toEqual(DATASTORE_TABLES)
  })

  it('creates one entry per workbook sheet and does not return a preview', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['nom', 'valeur'],
      ['alpha', 1]
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Données')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['autre']]), 'Autre')
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const form = new FormData()
    form.set('files[]', new File([bytes], 'Données.xlsx'))
    const uploaded = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: form
    })
    const uploadBody = (await uploaded.json()) as {
      data: {
        sources: Array<{
          changed: boolean
          source: {
            id: string
            entries: Array<{ sheet: number; sheetName: string; profileIds: string[] }>
          }
        }>
      }
    }
    expect(uploadBody.data.sources[0]).toMatchObject({
      changed: true,
      source: {
        entries: [
          { sheet: 0, sheetName: 'Données', profileIds: [] },
          { sheet: 1, sheetName: 'Autre', profileIds: [] }
        ]
      }
    })
    expect(uploadBody.data.sources[0]).not.toHaveProperty('sheets')
    expect(
      (
        await request(
          `/api/admin/knowledge/sources/${uploadBody.data.sources[0]!.source.id}/preview`
        )
      ).status
    ).toBe(404)
  })

  it('keeps configuration when a known filename is uploaded again', async () => {
    const firstForm = new FormData()
    firstForm.set('files[]', new File(['v1'], 'Guide.md'))
    const firstResponse = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: firstForm
    })
    const firstBody = (await firstResponse.json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const firstSource = firstBody.data.sources[0]!.source
    const id = firstSource.id
    await request(`/api/admin/knowledge/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: firstSource.updatedAt,
        entries: [
          {
            title: 'Guide interne',
            sheet: null,
            headerRow: null,
            profileIds: []
          }
        ]
      })
    })

    const secondForm = new FormData()
    secondForm.set('files[]', new File(['version 2'], 'Guide.md'))
    await request('/api/admin/knowledge/sources', { method: 'POST', body: secondForm })

    const listed = (await (await request('/api/admin/knowledge')).json()) as {
      data: { sources: Array<{ id: string; entries: Array<{ title: string }> }> }
    }
    expect(listed.data.sources).toEqual([
      expect.objectContaining({
        id,
        entries: [expect.objectContaining({ title: 'Guide interne' })]
      })
    ])
  })

  it('does not mutate a source when the uploaded bytes are identical', async () => {
    const first = new FormData()
    first.set('files[]', new File(['identical'], 'Stable.md'))
    const firstBody = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: first })
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
      await request('/api/admin/knowledge/sources', { method: 'POST', body: second })
    ).json()) as typeof firstBody

    expect(secondBody.data.sources[0]).toMatchObject({
      changed: false,
      source: {
        contentHash: firstBody.data.sources[0]!.source.contentHash,
        updatedAt: firstBody.data.sources[0]!.source.updatedAt
      }
    })
  })

  it('reconciles workbook configuration by sheet name', async () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['a']]), 'Retiré')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['b']]), 'Conservé')
    const first = new FormData()
    first.set(
      'files[]',
      new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'Classeur.xlsx')
    )
    const uploaded = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: first })
    ).json()) as {
      data: {
        sources: Array<{
          source: {
            id: string
            updatedAt: string
            entries: Array<Record<string, unknown>>
          }
        }>
      }
    }
    const source = uploaded.data.sources[0]!.source
    const configured = source.entries.map((entry) =>
      entry['sheetName'] === 'Conservé'
        ? { ...entry, title: 'Titre conservé', headerRow: 3 }
        : entry
    )
    await request(`/api/admin/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: configured, updatedAt: source.updatedAt })
    })

    const replacement = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(replacement, XLSX.utils.aoa_to_sheet([['b2']]), 'Conservé')
    XLSX.utils.book_append_sheet(replacement, XLSX.utils.aoa_to_sheet([['c']]), 'Nouveau')
    const second = new FormData()
    second.set(
      'files[]',
      new File([XLSX.write(replacement, { type: 'array', bookType: 'xlsx' })], 'Classeur.xlsx')
    )
    const replaced = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: second })
    ).json()) as {
      data: {
        sources: Array<{
          source: {
            entries: Array<{
              title: string
              sheet: number
              sheetName: string
              headerRow: number
              profileIds: string[]
              moduleIds: string[]
            }>
          }
        }>
      }
    }

    expect(replaced.data.sources[0]!.source.entries).toEqual([
      {
        title: 'Titre conservé',
        sheet: 0,
        sheetName: 'Conservé',
        headerRow: 3,
        profileIds: [],
        moduleIds: []
      },
      {
        title: 'Nouveau',
        sheet: 1,
        sheetName: 'Nouveau',
        headerRow: 0,
        profileIds: [],
        moduleIds: []
      }
    ])
  })

  it('rejects distinct filenames that normalize to the same storage name', async () => {
    const first = new FormData()
    first.set('files[]', new File(['a'], 'Résumé.md'))
    expect(
      (
        await request('/api/admin/knowledge/sources', {
          method: 'POST',
          body: first
        })
      ).status
    ).toBe(201)

    const conflicting = new FormData()
    conflicting.set('files[]', new File(['b'], 'Resume.md'))
    const response = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: conflicting
    })
    expect(response.status).toBe(409)
  })

  it('rejects a stale administrator edit', async () => {
    const form = new FormData()
    form.set('files[]', new File(['a'], 'Guide.md'))
    const uploaded = (await (
      await request('/api/admin/knowledge/sources', { method: 'POST', body: form })
    ).json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploaded.data.sources[0]!.source
    const entry = {
      title: 'Première modification',
      sheet: null,
      headerRow: null,
      profileIds: []
    }
    expect(
      (
        await request(`/api/admin/knowledge/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: [entry], updatedAt: source.updatedAt })
        })
      ).status
    ).toBe(200)

    const stale = await request(`/api/admin/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: [{ ...entry, title: 'Écrasement tardif' }],
        updatedAt: source.updatedAt
      })
    })
    expect(stale.status).toBe(409)
  })

  it('rejects unknown profile assignments without changing the source', async () => {
    const form = new FormData()
    form.set('files[]', new File(['# Guide'], 'Guide.md'))
    const uploaded = await request('/api/admin/knowledge/sources', {
      method: 'POST',
      body: form
    })
    const uploadBody = (await uploaded.json()) as {
      data: { sources: Array<{ source: { id: string; updatedAt: string } }> }
    }
    const source = uploadBody.data.sources[0]!.source

    const response = await request(`/api/admin/knowledge/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedAt: source.updatedAt,
        entries: [
          {
            title: 'Guide',
            sheet: null,
            headerRow: null,
            profileIds: ['missing']
          }
        ]
      })
    })
    expect(response.status).toBe(409)
  })
})
