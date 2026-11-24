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

  test('uses an auto-highlight combobox for single_choice selects and rejects unmatched free text', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IntakeWebApp } = await import('./IntakeWebApp')

    const selectBoot: IntakePublicBoot = {
      ...boot,
      hasPasswords: false,
      form: {
        title: 'Signalement résidence',
        fields: [
          {
            type: 'single_choice',
            label: 'Résidence',
            required: true,
            display: 'select',
            options: ['Résidence Les Tilleuls', 'Étage 2 — Bâtiment B', 'Immeuble Pasteur']
          },
          {
            type: 'single_choice',
            label: 'Urgence',
            display: 'radio',
            options: ['Normale', 'Haute']
          }
        ]
      }
    }

    const flush = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }

    const setInputValue = async (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      await act(async () => {
        setter?.call(input, value)
        input.dispatchEvent(
          new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value })
        )
      })
      await flush()
    }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(<IntakeWebApp boot={selectBoot} />)
    })
    await flush()

    const form = host.querySelector('form')
    expect(form).not.toBeNull()

    // Radio display stays a RadioGroup
    expect(host.querySelector('[data-slot="radio-group"]')).not.toBeNull()
    expect(host.querySelector('[data-slot="select-trigger"]')).toBeNull()

    const label = [...host.querySelectorAll('label')].find((el) =>
      el.textContent?.includes('Résidence')
    )
    const input = host.querySelector<HTMLInputElement>(`#${label?.getAttribute('for')}`)
    expect(input).not.toBeNull()
    expect(input?.getAttribute('role')).toBe('combobox')

    // Typing an accent-free query filters options and auto-highlights the first match
    await act(async () => {
      input?.focus()
    })
    await setInputValue(input!, 'etage')

    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')]
    expect(items.map((item) => item.textContent)).toEqual(['Étage 2 — Bâtiment B'])
    expect(items[0]?.hasAttribute('data-highlighted')).toBe(true)

    // Pressing Enter selects the auto-highlighted option and populates FormData
    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
    })
    await flush()

    expect(input?.value).toBe('Étage 2 — Bâtiment B')
    expect(new window.FormData(form!).get('residence')).toBe('Étage 2 — Bâtiment B')

    // Clearing via showClear empties the selection
    const clearButton = host.querySelector<HTMLButtonElement>('[data-slot="combobox-clear"]')
    expect(clearButton).not.toBeNull()
    await act(async () => {
      clearButton?.click()
    })
    await flush()

    expect(input?.value).toBe('')
    expect(new window.FormData(form!).get('residence')).toBe('')

    // Typing unmatched text shows the empty state and never leaks invalid text into FormData
    await setInputValue(input!, 'Saisie libre inexistante')
    const empty = document.querySelector<HTMLElement>('[data-slot="combobox-empty"]')
    expect(empty?.textContent).toContain('Aucun résultat.')
    expect(new window.FormData(form!).get('residence')).toBe('')

    // Closing without a valid match resets the visible input back to empty
    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    await flush()
    expect(input?.value).toBe('')
    expect(new window.FormData(form!).get('residence')).toBe('')

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })

  test('marks combobox invalid on 422 validation error and clears it on selection', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IntakeWebApp } = await import('./IntakeWebApp')

    const selectBoot: IntakePublicBoot = {
      ...boot,
      hasPasswords: false,
      form: {
        title: 'Signalement résidence',
        fields: [
          {
            type: 'single_choice',
            label: 'Résidence',
            required: true,
            options: ['Résidence A', 'Résidence B']
          }
        ]
      }
    }

    const originalFetch = globalThis.fetch
    const originalCss = globalThis.CSS
    const originalScrollIntoView = Element.prototype.scrollIntoView
    globalThis.CSS = { escape: (value: string) => value } as typeof CSS
    Element.prototype.scrollIntoView = () => {}
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'validation_error',
            message: 'Veuillez corriger les champs en erreur.',
            fields: { residence: 'Ce champ est obligatoire.' }
          }
        }),
        { status: 422, headers: { 'content-type': 'application/json' } }
      )) as unknown as typeof fetch

    const flush = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    try {
      await act(async () => {
        root.render(<IntakeWebApp boot={selectBoot} />)
      })
      await flush()

      const form = host.querySelector('form')
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })
      await flush()

      const input = host.querySelector<HTMLInputElement>('input[role="combobox"]')
      expect(input?.getAttribute('aria-invalid')).toBe('true')
      expect(host.textContent).toContain('Ce champ est obligatoire.')

      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      await act(async () => {
        input?.focus()
        setter?.call(input, 'Résidence B')
        input?.dispatchEvent(
          new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Résidence B' })
        )
      })
      await flush()

      const item = document.querySelector<HTMLElement>('[data-slot="combobox-item"]')
      expect(item?.textContent).toBe('Résidence B')
      await act(async () => {
        item?.click()
      })
      await flush()

      expect(input?.getAttribute('aria-invalid')).toBeNull()
      expect(host.textContent).not.toContain('Ce champ est obligatoire.')
    } finally {
      globalThis.fetch = originalFetch
      globalThis.CSS = originalCss
      Element.prototype.scrollIntoView = originalScrollIntoView
      await act(async () => {
        root.unmount()
      })
      host.remove()
    }
  })
})
