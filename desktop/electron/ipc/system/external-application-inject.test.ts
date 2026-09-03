import { describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import {
  buildExternalApplicationErrorHtml,
  buildExternalApplicationInjectScript
} from './external-application-inject'

function runInjection(
  html: string,
  message: string,
  selector: string
): {
  result: boolean
  document: Document
} {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { runScripts: 'outside-only' })
  const result = dom.window.eval(buildExternalApplicationInjectScript(message, selector)) as boolean
  return { result, document: dom.window.document }
}

describe('buildExternalApplicationInjectScript', () => {
  test('injecte et notifie un champ de formulaire', () => {
    const { document, result } = runInjection(
      '<textarea id="reply"></textarea>',
      'Bonjour "Alice"\nÀ bientôt',
      '#reply'
    )
    expect(result).toBe(true)
    expect((document.querySelector('#reply') as HTMLTextAreaElement).value).toBe(
      'Bonjour "Alice"\nÀ bientôt'
    )
    expect(document.querySelector('#__pierre_close__')).not.toBeNull()
  })

  test('injecte un id, une classe, un data-* et refuse une cible absente ou invalide', () => {
    const byId = runInjection('<div id="reply"></div>', 'id', '#reply')
    expect(byId.result).toBe(true)
    expect(byId.document.querySelector('#reply')?.textContent).toBe('id')
    const byClass = runInjection('<div class="classe"></div>', 'classe', '.classe')
    expect(byClass.result).toBe(true)
    expect(byClass.document.querySelector('.classe')?.textContent).toBe('classe')
    const text = runInjection('<div data-reply></div>', '<Réponse>', '[data-reply]')
    expect(text.result).toBe(true)
    expect(text.document.querySelector('[data-reply]')?.textContent).toBe('<Réponse>')
    expect(runInjection('<div></div>', 'test', '#absent').result).toBe(false)
    expect(runInjection('<div></div>', 'test', '[').result).toBe(false)
  })
})

describe('buildExternalApplicationErrorHtml', () => {
  test('échappe l’URL et permet de fermer la fenêtre', () => {
    const html = buildExternalApplicationErrorHtml('https://example.test/?a=<b>&c=1')
    expect(html).toContain('&lt;b&gt;&amp;c=1')
    expect(html).not.toContain('<b>')
    expect(html).toContain('window.close()')
  })
})
