import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { getEmbed as controller } from '../../../../routes/public'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'

const paths = testDatastorePaths('embed_get')
const app = new Hono()
app.get('/embed', controller)

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('GET /embed', () => {
  it('redirects a top-level tab to /', async () => {
    const response = await app.request('/embed', {
      headers: { 'sec-fetch-dest': 'document' },
      redirect: 'manual'
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/')
  })

  it('serves the empty page when no public chatbot is ready', async () => {
    const response = await app.request('/embed?host=https://example.org', {
      headers: { 'sec-fetch-dest': 'iframe' }
    })
    expect(response.status).toBe(404)
    const html = await response.text()
    expect(html).toContain('/assets/404.svg')
  })
})
