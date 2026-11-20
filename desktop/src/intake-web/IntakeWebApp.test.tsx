import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import type { IntakePublicBoot } from '@pierre/shared/intakes'
import { JSDOM } from 'jsdom'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.document !== 'undefined') return

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const globals = globalThis as Record<string, unknown>
  for (const key of [
    'document',
    'window',
    'HTMLElement',
    'Element',
    'Node',
    'Event',
    'MouseEvent',
    'MutationObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'navigator'
  ]) {
    originalGlobals.set(key, globals[key])
  }

  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Element = dom.window.Element
  globalThis.Node = dom.window.Node
  globalThis.Event = dom.window.Event
  globalThis.MouseEvent = dom.window.MouseEvent
  globalThis.MutationObserver = dom.window.MutationObserver
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
  globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
  globalThis.navigator = dom.window.navigator
  installedDom = true
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

const boot: IntakePublicBoot = {
  organizationName: 'PIERRE',
  form: {
    title: 'Affaires urgentes reçues durant la migration Aravis',
    description:
      'Liste des affaires urgentes collectées par les équipes durant la migration Aravis',
    notice: 'Mentions légales de la collecte.',
    fields: [
      { type: 'section', label: 'Signalement' },
      {
        type: 'short_text',
        label: 'Nom',
        description: 'Nom de la personne.',
        required: true
      }
    ]
  },
  hasPasswords: true,
  actionUrl: '/repondre/token',
  speechUrl: null,
  initialSubmissionId: 'submission-1'
}

describe('IntakeWebApp', () => {
  test('opens on a narrow form without the banner or the access title', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IntakeWebApp } = await import('./IntakeWebApp')

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(<IntakeWebApp boot={boot} />)
    })

    const main = host.querySelector('main')
    const mainClasses = main?.className.split(/\s+/) ?? []
    expect(mainClasses).toContain('max-w-md')
    expect(mainClasses).not.toContain('max-w-sm')
    expect(mainClasses).not.toContain('max-w-document')

    const heading = host.querySelector('h1')
    expect(heading?.textContent).toBe(boot.form.title)
    expect(heading?.className.split(/\s+/)).toContain('sr-only')
    expect(heading?.className).not.toContain('text-4xl')

    const text = host.textContent ?? ''
    expect(text).not.toContain('PIERRE')
    expect(text).not.toContain(boot.form.description)
    expect(text).not.toContain('Accès')
    expect(text).not.toContain('Saisissez le mot de passe')
    expect(text).toContain('Mot de passe')
    expect(text).toContain('Signalement')

    const form = host.querySelector('form')
    const cards = [...(form?.querySelectorAll('[data-slot="card"]') ?? [])]
    expect(cards).toHaveLength(1)
    const card = cards[0]

    const password = host.querySelector('[data-field-key="_password"]')
    expect(password?.getAttribute('data-orientation')).toBe('vertical')
    expect(card?.contains(password ?? null)).toBe(true)

    const sectionTitle = [...host.querySelectorAll('[data-slot="field-legend"]')].find(
      (title) => title.textContent === 'Signalement'
    )
    expect(sectionTitle).toBeTruthy()
    expect(card?.contains(sectionTitle ?? null)).toBe(true)
    expect(host.querySelector('[data-slot="card-title"]')).toBeNull()
    expect(
      card
        ?.querySelector('[data-slot="field"]:not([data-field-key="_password"])')
        ?.getAttribute('data-orientation')
    ).toBe('vertical')

    const submit = host.querySelector('button[type="submit"]')
    const descriptions = [...host.querySelectorAll('[data-slot="field-description"]')]
    const notice = descriptions.find((el) => el.textContent === boot.form.notice)
    const help = descriptions.find((el) => el.textContent === 'Nom de la personne.')
    expect(submit).toBeTruthy()
    expect(notice).toBeTruthy()
    expect(card?.contains(notice ?? null)).toBe(true)
    expect(card?.contains(submit ?? null)).toBe(false)
    expect(
      Boolean(card?.compareDocumentPosition(submit ?? card) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true)
    expect(notice?.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['font-serif', '[font-size:12px]', 'leading-4'])
    )
    expect(help?.className.split(/\s+/)).not.toContain('[font-size:12px]')
    expect(help?.className.split(/\s+/)).toContain('[font-size:14px]')

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
