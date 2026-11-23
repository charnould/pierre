import { describe, expect, test } from 'bun:test'

import { BulkTemplateField } from './BulkTemplateField'

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
