import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { Hono } from 'hono'

import { emptyRepaymentForms } from '../../../../../../shared/repayment-plan'
import { exportRepaymentDocument } from '../../../../../routes/repayment'
import type { AuthEnv } from '../../../../../utils/authenticate-user'
import { authorizeModule } from '../../../../../utils/authorize-role'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'
import { writeSetup } from '../../../../../utils/setup-store'

const paths = testDatastorePaths('repayment_document_export')
const dossier = emptyRepaymentForms()

const app = new Hono<AuthEnv>()
app.use('*', async (context, next) => {
  const email = context.req.header('x-user')
  if (email) {
    context.set('user', {
      email,
      isAdministrator: false,
      moduleIds: email === 'nope@example.org' ? [] : ['repayment'],
      chatbotIds: []
    })
  }
  await next()
})
app.post('/repayment/documents', authorizeModule('repayment'), exportRepaymentDocument)

const request = (body: unknown, email = 'ada@example.org') =>
  app.request('/repayment/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user': email },
    body: JSON.stringify(body)
  })

beforeAll(() => setDatastoreRoot(paths.root))
beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})
afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('POST /repayment/documents', () => {
  it('refuse un dossier illisible ou un module absent', async () => {
    expect((await request({})).status).toBe(400)
    expect(
      (await request({ document: 'plan', format: 'docx', dossier }, 'nope@example.org')).status
    ).toBe(403)
  })

  it('rend le plan déposé', async () => {
    expect((await request({ document: 'plan', format: 'docx', dossier })).status).toBe(400)
    const bytes = new Uint8Array(
      readFileSync(
        join(
          import.meta.dir,
          "../../../../../../docs/04-core-intelligence-hlm/templates/Impayés - docx - Plan d'apurement.docx"
        )
      )
    )
    await writeSetup('repayment/plan.docx', bytes)
    const response = await request({ document: 'plan', format: 'docx', dossier })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('wordprocessingml')
    expect(decodeURIComponent(response.headers.get('content-disposition') ?? '')).toContain(
      'Plan d’apurement.docx'
    )
    const body = new Uint8Array(await response.arrayBuffer())
    expect(body[0]).toBe(0x50)
    expect(body[1]).toBe(0x4b)
  })
})
