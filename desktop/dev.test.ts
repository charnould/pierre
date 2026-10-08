import { describe, expect, it } from 'bun:test'

import { startRenderer } from './dev'

const REFRESH = /reactRefresh|hmr\.reactRefreshAccept|\$RefreshReg\$/
const COMPILER = 'react/compiler-runtime'

async function collectScripts(page: URL, html: string): Promise<string> {
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].flatMap((match) =>
    match[1] ? [match[1]] : []
  )
  const queue = srcs.map((src) => new URL(src, page).href)
  const seen = new Set<string>()
  let text = html
  while (queue.length > 0 && seen.size < 80) {
    const url = queue.shift()
    if (!url || seen.has(url) || url.split('?')[0]?.endsWith('.css')) continue
    seen.add(url)
    const response = await fetch(url)
    if (!response.ok) continue
    const body = await response.text()
    text += `\n${body}`
    for (const match of body.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const spec = match[1]
      if (!spec || (!spec.startsWith('.') && !spec.startsWith('/'))) continue
      queue.push(new URL(spec, url).href)
    }
  }
  return text
}

describe('renderer dev server', () => {
  it('serves both pages with fast refresh and the compiler', async () => {
    const server = await startRenderer()
    try {
      const indexResponse = await fetch(new URL('/', server.url))
      const mascotResponse = await fetch(new URL('/mascot.html', server.url))
      expect(indexResponse.status).toBe(200)
      expect(mascotResponse.status).toBe(200)
      const indexHtml = await indexResponse.text()
      const mascotHtml = await mascotResponse.text()
      expect(mascotHtml).toContain('<script')
      const source = await collectScripts(new URL('/', server.url), indexHtml)
      expect(source).toContain(COMPILER)
      expect(source).toMatch(REFRESH)
      const stylesheets = [...new Set(source.match(/\.\/assets\/[^"'\\\s]+\.css/g) ?? [])]
      expect(stylesheets.length).toBeGreaterThan(0)
      const bodies = await Promise.all(
        stylesheets.map(async (href) => {
          const css = await fetch(new URL(href, server.url))
          expect(css.status).toBe(200)
          return css.text()
        })
      )
      expect(bodies.some((css) => css.includes('--font-sans'))).toBe(true)
    } finally {
      server.stop(true)
    }
  }, 120_000)
})
