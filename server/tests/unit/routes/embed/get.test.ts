import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { getEmbed as controller } from '../../../../routes/public'

const app = new Hono()
app.get('/embed', controller)

describe('GET /embed', () => {
  it('redirects a top-level tab to /', async () => {
    const response = await app.request('/embed', {
      headers: { 'sec-fetch-dest': 'document' },
      redirect: 'manual'
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/')
  })

  it('serves the public chat when loaded in an iframe', async () => {
    const response = await app.request('/embed?host=https://example.org', {
      headers: { 'sec-fetch-dest': 'iframe' }
    })
    expect(response.status).toBe(404)
    const html = await response.text()
    expect(html).toContain('/assets/404.svg')
  })
})
