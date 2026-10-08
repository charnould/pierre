import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { SetupChecklist } from './SetupPanel'

describe('SetupChecklist', () => {
  test('counts stored pieces without a separate frame', () => {
    const html = renderToStaticMarkup(
      <SetupChecklist
        pieces={[
          { id: 'configuration', done: true, label: 'Configuration' },
          { id: 'consigne', done: false, label: 'Consigne' },
          { id: 'icon', done: false, label: 'Icône' }
        ]}
      />
    )
    expect(html).toContain('Avancement')
    expect(html).toContain('1 sur 3')
    expect(html).toContain('Configuration')
    expect(html).toContain('Consigne')
    expect(html).toContain('Icône')
    expect(html).toContain('enregistrée')
    expect(html).toContain('à faire')
    expect(html).not.toContain('Pièces')
    expect(html).not.toContain('rounded-md border p-3')
    expect(html.split('lucide-circle-check').length - 1).toBe(1)
    expect(html.split('lucide-circle ').length - 1).toBe(2)
  })

  test('agrees the recorded word with Courrier', () => {
    const html = renderToStaticMarkup(
      <SetupChecklist pieces={[{ id: 'letter', done: true, label: 'Courrier' }]} />
    )
    expect(html).toContain('1 sur 1')
    expect(html).toContain('enregistré')
    expect(html).not.toContain('enregistrée')
  })
})
