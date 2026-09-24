import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/embed/get'

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

  it('does not load the retired /c chat route', async () => {
    const source = await Bun.file(
      new URL('../../../../assets/embed/pierre-embed.ts', import.meta.url)
    ).text()
    const dist = await Bun.file(
      new URL('../../../../assets/dist/js/pierre-embed.js', import.meta.url)
    ).text()
    expect(source).not.toContain('/c?')
    expect(source).not.toContain("'/c'")
    expect(dist).not.toContain('/c?')
    expect(dist).not.toContain("'/c'")
    expect(dist).not.toContain('"/c"')
  })

  it('ships host and embed scripts as IIFEs', async () => {
    const isIife = (code: string) =>
      /^\(?function\b|^!\s*function\b|^\(\s*\(\s*\)\s*=>/.test(code.trimStart())
    const host = await Bun.file(
      new URL('../../../../assets/dist/js/pierre.js', import.meta.url)
    ).text()
    const embed = await Bun.file(
      new URL('../../../../assets/dist/js/pierre-embed.js', import.meta.url)
    ).text()
    expect(isIife(host)).toBe(true)
    expect(isIife(embed)).toBe(true)
  })
})
