import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { BulkTemplateField } from './BulkTemplateField'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const saved = {
  window: globalThis.window,
  document: globalThis.document,
  Node: globalThis.Node,
  Element: globalThis.Element,
  HTMLElement: globalThis.HTMLElement,
  HTMLDivElement: globalThis.HTMLDivElement,
  HTMLBRElement: globalThis.HTMLBRElement,
  MutationObserver: globalThis.MutationObserver
}

beforeAll(() => {
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    HTMLDivElement: dom.window.HTMLDivElement,
    HTMLBRElement: dom.window.HTMLBRElement,
    MutationObserver: dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true
  })
})

afterAll(() => Object.assign(globalThis, saved))

describe('BulkTemplateField', () => {
  test('affiche les placeholders stockés comme des jetons slash', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <BulkTemplateField
          id="message"
          value="Bonjour {{nom_locataire}}"
          fields={[{ value: 'nom_locataire', label: 'nom_locataire' }]}
          fieldsLoading={false}
          fieldsError={null}
          onChange={() => {}}
        />
      )
    })

    const token = container.querySelector<HTMLElement>('[data-field="nom_locataire"]')
    expect(token?.textContent).toBe('/nom_locataire')
    expect(token?.contentEditable).toBe('false')
    expect(container.textContent).not.toContain('{{nom_locataire}}')

    await act(async () => root.unmount())
    container.remove()
  })
})
