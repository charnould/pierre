import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'

import defaultConfig from '../../../../customization/chatbots/default/config'
import { chatCss, chatJs, readChatWebEntry, widgetAssets } from '../../../views/assets'
import { chatPage } from '../../../views/chat'
import { emptyPage } from '../../../views/empty'

const HASHED_JS = /^\/assets\/dist\/js\/ai-[a-zA-Z0-9_-]+\.js$/
const HASHED_CSS = /^\/assets\/dist\/css\/style-[a-zA-Z0-9_-]+\.css$/
const STAMPED_ASSET = /\.\d{13}\.(?:js|css)/

async function render(page: ReturnType<typeof chatPage> | ReturnType<typeof emptyPage>) {
  return String(await page)
}

describe('chat web assets', () => {
  it('resolves content-hashed files from the Vite manifest', () => {
    const entry = readChatWebEntry()
    expect(entry.jsHref).toMatch(HASHED_JS)
    expect(entry.cssHref).toMatch(HASHED_CSS)
    expect(entry.jsHref).toBe(chatJs)
    expect(entry.cssHref).toBe(chatCss)
    expect(existsSync(entry.jsPath)).toBe(true)
    expect(existsSync(entry.cssPath)).toBe(true)
  })
})

describe('pages', () => {
  it('serves the public chat shell without a build stamp', async () => {
    const html = await render(chatPage({ active_config: defaultConfig, dataParam: 'L-42' }))
    expect(html).toContain(`href="${chatCss}"`)
    expect(html).toContain(`src="${chatJs}"`)
    expect(html).toContain('id="pierre-data"')
    expect(html).toContain('"dataParam":"L-42"')
    expect(html).toContain('id="root"')
    expect(html).not.toContain('id="pierre-embed-modal"')
    expect(html).not.toContain(widgetAssets.embedJs)
    expect(html).not.toMatch(STAMPED_ASSET)
  })

  it('wraps the same chat in the embed modal chrome', async () => {
    const html = await render(chatPage({ active_config: defaultConfig, embed: true }))
    expect(html).toContain(widgetAssets.embedJs)
    expect(html).toContain(widgetAssets.frameCss)
    expect(html).toContain(widgetAssets.modalCss)
    expect(html).toContain('id="pierre-embed-modal"')
    expect(html.indexOf('id="pierre-embed-modal-chat"')).toBeLessThan(html.indexOf('id="root"'))
    expect(html).not.toMatch(STAMPED_ASSET)
  })

  it('keeps the empty page CSS-only', async () => {
    const html = await render(emptyPage())
    expect(html).toContain('<title>Rien de public ici !</title>')
    expect(html).toContain('/branding/404.svg')
    expect(html).toContain(`href="${chatCss}"`)
    expect(html).not.toContain(chatJs)
    expect(html).not.toContain('id="pierre-data"')
    expect(html).not.toMatch(/<body[^>]*>[\s\S]*Rien ici/)
    expect(html).not.toMatch(STAMPED_ASSET)
  })
})
