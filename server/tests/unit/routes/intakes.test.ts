import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import {
  type CreateIntakeBody,
  intakeKnowledgeOriginalName,
  type IntakeRecord
} from '../../../../shared/intakes'
import { createApp } from '../../../app'
import { openDatastore } from '../../../utils/datastore-db'
import { deleteAllUsers } from '../../../utils/handle-user'
import {
  cancelPendingIntakeKnowledgeRebuild,
  setIntakeKnowledgeDebounceForTests
} from '../../../utils/intakes/knowledge'
import { resetIntakeRateLimits } from '../../../utils/intakes/rate-limit'
import { findKnowledgeSourcesByFilename } from '../../../utils/knowledge/knowledge-sources'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import { setSpeechWorkerForTests } from '../../../utils/speech-session'
import { intakeCss, intakeJs } from '../../../views/assets'
import { seedInstanceSetup } from '../../seed-setup'
import { createTestUser } from '../../test-user'

const paths = testDatastorePaths('intake_routes')
const app = createApp()

const sampleBody = (overrides: Partial<CreateIntakeBody> = {}): CreateIntakeBody => ({
  name: 'Signalement incident',
  description: 'Formulaire public',
  tableName: 'signalements_route',
  publishToKnowledge: true,
  mentions: ['bob@example.org'],
  config: {
    form: {
      title: 'Signalement incident',
      description: 'Décrivez votre demande.',
      fields: [
        { type: 'short_text', label: 'Objet', required: true },
        { type: 'long_text', label: 'Details', required: false }
      ]
    },
    access: { passwords: ['secret-2026'] },
    notifications: { mode: 'none' }
  },
  ...overrides
})

async function signInCookie(email: string): Promise<string> {
  const res = await app.request('/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test-password-123' })
  })
  expect(res.status).toBe(200)
  const setCookie = res.headers.get('set-cookie') ?? ''
  const cookie = setCookie.split(';')[0] ?? ''
  expect(cookie).toContain('=')
  return cookie
}

const jsonReq = (method: string, cookie: string, body?: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
})

let aliceCookie = ''
let bobCookie = ''
let adminCookie = ''

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  await seedInstanceSetup()
})

beforeEach(async () => {
  cancelPendingIntakeKnowledgeRebuild()
  setIntakeKnowledgeDebounceForTests(60_000)
  resetIntakeRateLimits()
  setSpeechWorkerForTests(null)
  await deleteAllUsers()
  using db = openDatastore()
  const intakeTables = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'intake\\_%' ESCAPE '\\'"
    )
    .all()
  for (const row of intakeTables) {
    db.run(`DROP TABLE IF EXISTS "${row.name.replaceAll('"', '""')}"`)
  }
  db.run('DELETE FROM intakes')
  db.run("DELETE FROM knowledge_records WHERE kind = 'source'")
  for (const [email, isAdministrator] of [
    ['alice@example.org', false],
    ['bob@example.org', false],
    ['admin@example.org', true]
  ] as const) {
    await createTestUser({
      email,
      isAdministrator,
      moduleIds: ['intake'],
      chatbotIds: ['default']
    })
  }
  aliceCookie = await signInCookie('alice@example.org')
  bobCookie = await signInCookie('bob@example.org')
  adminCookie = await signInCookie('admin@example.org')
})

afterEach(() => {
  cancelPendingIntakeKnowledgeRebuild()
  setSpeechWorkerForTests(null)
})

afterAll(async () => {
  cancelPendingIntakeKnowledgeRebuild()
  await deleteAllUsers()
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('intakes authenticated and public routes', () => {
  it('serves /repondre/:token with strict CSP, handles 404/422/honeypot/idempotency/knowledge guards', async () => {
    // Unknown token -> 404 emptyPage with noindex and strict CSP
    const missing = await app.request('/repondre/does-not-exist')
    expect(missing.status).toBe(404)
    expect(missing.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(missing.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")

    // Create + publish via authenticated API
    const createdRes = await app.request('/intakes', jsonReq('POST', aliceCookie, sampleBody()))
    expect(createdRes.status).toBe(201)
    const created = ((await createdRes.json()) as { data: IntakeRecord }).data

    const pubRes = await app.request(`/intakes/${created.id}/publish`, {
      method: 'POST',
      headers: { Cookie: aliceCookie }
    })
    expect(pubRes.status).toBe(200)
    const published = ((await pubRes.json()) as { data: IntakeRecord }).data
    expect(published.token).toBeTruthy()

    // Public GET renders React shell with desktop stylesheet, JSON boot without leaking passwords, and no inline script
    const pageRes = await app.request(`/repondre/${published.token}`)
    expect(pageRes.status).toBe(200)
    expect(pageRes.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(pageRes.headers.get('Content-Security-Policy')).toContain("script-src 'self'")
    const html = await pageRes.text()
    expect(html).toContain(`href="${intakeCss}"`)
    expect(html).toContain(`src="${intakeJs}"`)
    expect(html).toContain('id="intake-data"')
    expect(html).toContain('"hasPasswords":true')
    expect(html).not.toContain('secret-2026')
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/json")[^>]*>/)

    // Honeypot returns 400 without storing a row
    const botFd = new FormData()
    botFd.set('_website', 'https://spam.example')
    const botRes = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      body: botFd
    })
    expect(botRes.status).toBe(400)

    // Missing required field + wrong password -> 422
    const badFd = new FormData()
    badFd.set('_id', '0198f1a0-7b6c-7000-8000-000000000401')
    badFd.set('_password', 'wrong')
    const badRes = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      body: badFd
    })
    expect(badRes.status).toBe(422)

    // Valid submission -> 201 with reference ID
    const okFd = new FormData()
    okFd.set('_id', '0198f1a0-7b6c-7000-8000-000000000402')
    okFd.set('_password', 'secret-2026')
    okFd.set('objet', 'Ascenseur bloqué')
    okFd.set('details', 'Bâtiment B')
    const okRes = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      body: okFd
    })
    expect(okRes.status).toBe(201)
    const okJson = (await okRes.json()) as { data: { id: string } }
    expect(okJson.data.id).toBe('0198f1a0-7b6c-7000-8000-000000000402')

    // Duplicate retry on same _id -> 200 without duplicate insert
    const dupRes = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      body: okFd
    })
    expect(dupRes.status).toBe(200)
    const dupJson = (await dupRes.json()) as { data: { id: string } }
    expect(dupJson.data.id).toBe('0198f1a0-7b6c-7000-8000-000000000402')

    // Collaborator can export ZIP, cannot close
    const zipRes = await app.request(`/intakes/${published.id}/export.zip`, {
      headers: { Cookie: bobCookie }
    })
    expect(zipRes.status).toBe(200)
    expect(zipRes.headers.get('Content-Type')).toBe('application/zip')

    const forbiddenClose = await app.request(`/intakes/${published.id}/close`, {
      method: 'POST',
      headers: { Cookie: bobCookie }
    })
    expect(forbiddenClose.status).toBe(403)

    // Admin cannot rename title or delete an intake knowledge source from /admin/knowledge
    const ks = findKnowledgeSourcesByFilename(intakeKnowledgeOriginalName(published.tableName))[0]
    expect(ks?.id).toBeTruthy()

    const renameRes = await app.request(
      `/knowledge/sources/${ks!.id}`,
      jsonReq('PATCH', adminCookie, {
        title: 'nouveau_titre',
        profileIds: ks!.profileIds,
        moduleIds: ks!.moduleIds,
        updatedAt: ks!.updatedAt
      })
    )
    expect(renameRes.status).toBe(400)
    const renameBody = (await renameRes.json()) as { error: { code: string; message: string } }
    expect(renameBody.error.message).toContain('collecte')

    const deleteKsRes = await app.request(`/knowledge/sources/${ks!.id}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    })
    expect(deleteKsRes.status).toBe(409)

    // Admin can close any intake; closing turns /repondre/:token into 404
    const closeRes = await app.request(`/intakes/${published.id}/close`, {
      method: 'POST',
      headers: { Cookie: adminCookie }
    })
    expect(closeRes.status).toBe(200)
    const afterClose = await app.request(`/repondre/${published.token}`)
    expect(afterClose.status).toBe(404)
  })

  it('rate-limits repeated wrong passwords on /repondre/:token', async () => {
    const created = (
      (await (
        await app.request('/intakes', jsonReq('POST', aliceCookie, sampleBody()))
      ).json()) as {
        data: IntakeRecord
      }
    ).data
    const published = (
      (await (
        await app.request(`/intakes/${created.id}/publish`, {
          method: 'POST',
          headers: { Cookie: aliceCookie }
        })
      ).json()) as { data: IntakeRecord }
    ).data

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const fd = new FormData()
      fd.set('_password', 'mauvais')
      fd.set('objet', 'Test')
      const res = await app.request(`/repondre/${published.token}`, {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.10' },
        body: fd
      })
      expect(res.status).toBe(422)
    }

    const blockedFd = new FormData()
    blockedFd.set('_password', 'secret-2026')
    blockedFd.set('objet', 'Test')
    const blocked = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.10' },
      body: blockedFd
    })
    expect(blocked.status).toBe(429)
  })

  it('rejects /repondre/:token/speech for invalid token and handles runtime readiness', async () => {
    const missing = await app.request('/repondre/unknown-token/speech', {
      method: 'POST',
      body: new Uint8Array(64)
    })
    expect(missing.status).toBe(404)

    const created = (
      (await (
        await app.request('/intakes', jsonReq('POST', aliceCookie, sampleBody()))
      ).json()) as {
        data: IntakeRecord
      }
    ).data
    const published = (
      (await (
        await app.request(`/intakes/${created.id}/publish`, {
          method: 'POST',
          headers: { Cookie: aliceCookie }
        })
      ).json()) as { data: IntakeRecord }
    ).data

    setSpeechWorkerForTests(() => ({
      write: () => undefined,
      readLine: async () => JSON.stringify({ ok: true, text: 'Fuite dans la cuisine.' }),
      kill: () => undefined
    }))

    const speechRes = await app.request(`/repondre/${published.token}/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(16_000)
    })
    expect([200, 503]).toContain(speechRes.status)
    if (speechRes.status === 200) {
      expect(await speechRes.json()).toEqual({ data: { text: 'Fuite dans la cuisine.' } })
    }
  })

  it('downloads attachments with non-Latin1 French filenames without failing Content-Disposition', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.7\nhello-unicode\n')
    const filename = 'Attestation d’assurance 150€ cœur.pdf'
    const created = (
      (await (
        await app.request(
          '/intakes',
          jsonReq(
            'POST',
            aliceCookie,
            sampleBody({
              tableName: 'pieces_unicode',
              publishToKnowledge: false,
              config: {
                form: {
                  title: 'Pièces',
                  fields: [
                    {
                      type: 'file',
                      label: 'Justificatif',
                      required: true,
                      accept: ['application/pdf'],
                      maxFiles: 1
                    }
                  ]
                },
                access: { passwords: [] },
                notifications: { mode: 'none' }
              }
            })
          )
        )
      ).json()) as { data: IntakeRecord }
    ).data
    const published = (
      (await (
        await app.request(`/intakes/${created.id}/publish`, {
          method: 'POST',
          headers: { Cookie: aliceCookie }
        })
      ).json()) as { data: IntakeRecord }
    ).data

    const submissionId = '0198f1a0-7b6c-7000-8000-000000000777'
    const fd = new FormData()
    fd.set('_id', submissionId)
    fd.append('justificatif', new File([pdfBytes], filename, { type: 'application/pdf' }))
    const submitRes = await app.request(`/repondre/${published.token}`, {
      method: 'POST',
      body: fd
    })
    expect(submitRes.status).toBe(201)

    const downloadRes = await app.request(
      `/intakes/${published.id}/submissions/${submissionId}/files/${encodeURIComponent(filename)}`,
      { headers: { Cookie: bobCookie } }
    )
    expect(downloadRes.status).toBe(200)
    const disposition = downloadRes.headers.get('content-disposition') ?? ''
    expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent(filename)}`)
    expect(Array.from(new Uint8Array(await downloadRes.arrayBuffer()))).toEqual(
      Array.from(pdfBytes)
    )
  })
})
