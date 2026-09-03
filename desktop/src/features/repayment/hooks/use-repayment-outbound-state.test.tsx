import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { useRepaymentOutboundState } from './use-repayment-outbound-state'

let installedDom = false

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.Element
  delete globals.getComputedStyle
})

const first = {
  templateId: 'locataire_rcs_relance_impaye',
  body: 'Relance',
  sms_fallback: 'SMS Relance',
  choices: []
}

const second = {
  templateId: 'locataire_rcs_rappel_echeance_plan',
  body: 'Rappel',
  sms_fallback: 'SMS Rappel',
  choices: [{ type: 'reply' as const, label: 'OK' }]
}

describe('useRepaymentOutboundState', () => {
  test('préremplit le téléphone une fois et le garde d’un modèle à l’autre', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')

    const renders: ReturnType<typeof useRepaymentOutboundState>[] = []
    function Harness() {
      renders.push(useRepaymentOutboundState(() => {}))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })

    await act(async () => {
      renders.at(-1)?.selectRcsTemplate(first, '0601020304')
    })
    expect(renders.at(-1)?.rcsCompose).toEqual({
      destinataire: '0601020304',
      body: 'Relance',
      sms_fallback: 'SMS Relance',
      choices: []
    })
    expect(renders.at(-1)?.pendingRcsTemplateId).toBe('locataire_rcs_relance_impaye')

    await act(async () => {
      renders.at(-1)?.setRcsCompose({
        destinataire: '0700000000',
        body: 'Relance éditée',
        sms_fallback: 'SMS Relance',
        choices: []
      })
    })
    await act(async () => {
      renders.at(-1)?.selectRcsTemplate(second, '0601020304')
    })
    expect(renders.at(-1)?.rcsCompose).toEqual({
      destinataire: '0700000000',
      body: 'Rappel',
      sms_fallback: 'SMS Rappel',
      choices: [{ type: 'reply', label: 'OK' }]
    })
    expect(renders.at(-1)?.pendingRcsTemplateId).toBe('locataire_rcs_rappel_echeance_plan')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
