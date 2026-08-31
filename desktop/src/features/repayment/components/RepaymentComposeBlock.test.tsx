import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { RepaymentActionDraft } from '../lib/repayment-action-activity'
import { REPAYMENT_TAG_OPTIONS } from '../lib/repayment-tags'
import { sampleRepaymentRow } from '../lib/repayment-test-fixtures'
import type { RepaymentComposeMode } from './RepaymentComposeBlock'

mock.module('../lib/outbound-email-templates.bundle', () => ({
  listOutboundTemplateGroups: () => [],
  listOutboundTemplates: () => [],
  resolveOutboundEmail: () => null,
  resolveOutboundRcs: () => null
}))

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof existingWindow?.setTimeout === 'function' &&
    typeof globals.Element === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'HTMLInputElement',
      'HTMLButtonElement',
      'HTMLTextAreaElement',
      'Element',
      'Node',
      'Event',
      'InputEvent',
      'MouseEvent',
      'KeyboardEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }

    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.HTMLInputElement = dom.window.HTMLInputElement
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
    globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.InputEvent = dom.window.InputEvent
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.KeyboardEvent = dom.window.KeyboardEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
    globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
    installedDom = true
  }
  if (typeof globalThis.ResizeObserver !== 'function') {
    originalGlobals.set('ResizeObserver', (globalThis as Record<string, unknown>).ResizeObserver)
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  const globals = globalThis as Record<string, unknown>
  if (!installedDom) {
    const observer = originalGlobals.get('ResizeObserver')
    if (observer === undefined) delete globals.ResizeObserver
    else if (originalGlobals.has('ResizeObserver')) globals.ResizeObserver = observer
    return
  }
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

function nativeInput(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(element) as { value?: PropertyDescriptor }
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(element, value)
  const EventCtor = element.ownerDocument.defaultView?.Event ?? Event
  element.dispatchEvent(new EventCtor('input', { bubbles: true }))
  element.dispatchEvent(new EventCtor('change', { bubbles: true }))
}

async function renderCompose(
  mode: RepaymentComposeMode = null,
  options: {
    gestionnaireAssignable?: boolean
    gestionnaireEmail?: string | null
    currentTags?: string[]
    activePlan?: { row: import('@/shared/types/activites').Activite; signed: boolean } | null
  } = {}
) {
  const { act, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { RepaymentComposeBlock } = await import('./RepaymentComposeBlock')

  const onSubmitAction = mock((_draft: RepaymentActionDraft) => {})
  const onSubmitNote = mock((_comment?: string) => {})
  const onStartNote = mock(() => {})
  const onStartTodo = mock(() => {})
  const onStartAction = mock(() => {})
  const onCreatePlan = mock(() => {})
  const onEditPlan = mock(() => {})
  const onImportEml = mock((_file: File) => {})
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  function Harness() {
    const [composeMode, setComposeMode] = useState(mode)
    const [draftComment, setDraftComment] = useState('')
    return (
      <RepaymentComposeBlock
        tenant={sampleRepaymentRow()}
        userLogin="alice"
        todayIso="2026-08-24T00:00:00.000Z"
        composeMode={composeMode}
        currentGestionnaire={{
          email: options.gestionnaireEmail ?? null,
          login: options.gestionnaireEmail ? 'bob' : null
        }}
        draftBucket={null}
        onDraftBucketChange={() => {}}
        draftTags={[]}
        onDraftTagsChange={() => {}}
        draftComment={draftComment}
        onDraftCommentChange={setDraftComment}
        advancementCanSave={false}
        tagsCanSave={false}
        currentTags={options.currentTags}
        gestionnaireAssignable={options.gestionnaireAssignable}
        onStartNote={() => {
          onStartNote()
          setComposeMode('note')
        }}
        onStartTodo={() => {
          onStartTodo()
          setComposeMode('todo')
        }}
        onStartAction={() => {
          onStartAction()
          setComposeMode('action')
        }}
        onStartAdvancement={() => {}}
        onStartTags={() => {}}
        onStartAssignGestionnaire={options.gestionnaireAssignable ? () => {} : undefined}
        onSelectRcsTemplate={() => {}}
        onSelectEmailTemplate={() => {}}
        onSelectMailtoTemplate={() => {}}
        onCreatePlan={onCreatePlan}
        activePlan={options.activePlan}
        onEditPlan={onEditPlan}
        onCancelCompose={() => setComposeMode(null)}
        onSubmitNote={onSubmitNote}
        onSubmitAdvancement={() => {}}
        onSubmitTags={() => {}}
        onSubmitAction={onSubmitAction}
        rcsMessage=""
        onRcsMessageChange={() => {}}
        onSubmitRcs={() => {}}
        emailSubject=""
        onEmailSubjectChange={() => {}}
        emailBody=""
        onEmailBodyChange={() => {}}
        onSubmitEmail={() => {}}
        onImportEml={onImportEml}
      />
    )
  }

  await act(async () => {
    root.render(<Harness />)
  })

  return {
    onSubmitAction,
    onSubmitNote,
    onStartNote,
    onStartTodo,
    onStartAction,
    onCreatePlan,
    onEditPlan,
    onImportEml,
    act,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

function buttonLabels() {
  return [...document.querySelectorAll('button')].map((button) => button.textContent)
}

describe('RepaymentComposeBlock', () => {
  test('montre la pile dépliée, sans Tracer ni Autres', async () => {
    const { cleanup } = await renderCompose()

    try {
      const labels = buttonLabels()
      expect(labels).toContain('Laisser une note')
      expect(labels).toContain('Créer une tâche')
      expect(labels).toContain('Consigner une action réalisée')
      expect(labels).toContain('Contacter un tiers')
      expect(labels).toContain('Créer un plan d’apurement')
      expect(labels).toContain('Importer un email')
      expect(labels).toContain('Changer le groupe')
      expect(labels).toContain('Changer les tags')
      expect(labels.indexOf('Contacter un tiers')).toBeLessThan(
        labels.indexOf('Créer un plan d’apurement')
      )
      expect(labels.indexOf('Créer un plan d’apurement')).toBeLessThan(
        labels.indexOf('Importer un email')
      )
      expect(labels.indexOf('Importer un email')).toBeLessThan(labels.indexOf('Changer le groupe'))
      expect(labels.indexOf('Changer le groupe')).toBeLessThan(labels.indexOf('Changer les tags'))
      expect(labels).not.toContain('Enregistrer une action')
      expect(labels).not.toContain('Ajouter un tag')
      expect(labels).not.toContain('Modifier les tags')
      expect(labels).not.toContain('Tracer les activités')
      expect(labels).not.toContain('Autres')
      expect(labels).not.toContain('Affecter à un référent')
      expect(labels).not.toContain('Joindre le locataire')
      expect(document.body.textContent).not.toContain('peut agir')
    } finally {
      await cleanup()
    }
  })

  test('uniformise la largeur et le rythme des CTA', async () => {
    const { cleanup } = await renderCompose()
    try {
      const noteButton = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Laisser une note'
      )
      const actionList = noteButton?.closest('ul')
      expect(actionList?.classList.contains('inline-grid')).toBe(true)
      expect(actionList?.classList.contains('gap-1')).toBe(true)
      expect(
        [...(actionList?.querySelectorAll('button') ?? [])].every(
          (button) =>
            button.classList.contains('w-full') &&
            button.classList.contains('border-border/60') &&
            button.classList.contains('hover:bg-muted')
        )
      ).toBe(true)
    } finally {
      await cleanup()
    }
  })

  test('Importer un email transmet le fichier .eml', async () => {
    const { cleanup, onImportEml, act } = await renderCompose()
    try {
      const input = document.querySelector<HTMLInputElement>('input[type="file"][accept=".eml"]')
      expect(input).not.toBeNull()
      const file = new File(['From: a@b.fr\nSubject: X\n\nHi'], 'mail.eml', {
        type: 'message/rfc822'
      })
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      await act(async () => {
        input?.dispatchEvent(new Event('change', { bubbles: true }))
      })
      expect(onImportEml).toHaveBeenCalledTimes(1)
      expect(onImportEml.mock.calls[0]?.[0]).toBe(file)
    } finally {
      await cleanup()
    }
  })

  test('garde Changer les tags même si un tag est déjà présent', async () => {
    const { cleanup } = await renderCompose(null, { currentTags: ['décès'] })
    try {
      expect(buttonLabels()).toContain('Changer les tags')
      expect(buttonLabels()).not.toContain('Ajouter un tag')
      expect(buttonLabels()).not.toContain('Modifier les tags')
    } finally {
      await cleanup()
    }
  })

  test('le compose tags propose des checkboxes et une note optionnelle', async () => {
    const { cleanup } = await renderCompose('tags')
    try {
      expect(document.body.textContent).toContain('Note (optionnel)')
      expect(document.body.textContent).toContain('décès')
      expect(document.body.textContent).toContain('+65 ans')
      const boxes = document.querySelectorAll('[data-slot="checkbox"]')
      expect(boxes.length).toBe(REPAYMENT_TAG_OPTIONS.length)
    } finally {
      await cleanup()
    }
  })

  test('réaffecte le référent s’il y en a déjà un', async () => {
    const without = await renderCompose(null, { gestionnaireAssignable: true })
    try {
      expect(buttonLabels()).toContain('Affecter à un référent')
    } finally {
      await without.cleanup()
    }

    const withReferent = await renderCompose(null, {
      gestionnaireAssignable: true,
      gestionnaireEmail: 'bob@example.org'
    })
    try {
      expect(buttonLabels()).toContain('Réaffecter à un référent')
      expect(buttonLabels()).not.toContain('Affecter à un référent')
    } finally {
      await withReferent.cleanup()
    }
  })

  test('l’affectation propose un commentaire optionnel', async () => {
    const { cleanup } = await renderCompose('assign_gestionnaire', { gestionnaireAssignable: true })
    try {
      expect(document.body.textContent).toContain('Note (optionnel)')
    } finally {
      await cleanup()
    }
  })

  test('le rang Plan est exclusif selon l’état du dossier', async () => {
    const unsigned = {
      id: 4,
      date_creation: '2026-08-22T10:00:00',
      rattachement: 'repayment:LOC-1',
      auteur: 'user:alice@example.org',
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      id_lot: null,
      type: 'repayment_plan' as const,
      statut: 'draft' as const,
      mentions: [],
      contenu: '{}'
    }
    const draft = await renderCompose(null, { activePlan: { row: unsigned, signed: false } })
    try {
      expect(buttonLabels()).toContain('Modifier le plan d’apurement')
      expect(buttonLabels()).not.toContain('Créer un plan d’apurement')
    } finally {
      await draft.cleanup()
    }

    const signed = await renderCompose(null, { activePlan: { row: unsigned, signed: true } })
    try {
      expect(buttonLabels()).toContain('Clôturer le plan d’apurement')
    } finally {
      await signed.cleanup()
    }
  })

  test('Créer une tâche ouvre Action / Qui / Quand', async () => {
    const { cleanup, onStartTodo } = await renderCompose()
    try {
      const todo = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Créer une tâche'
      )
      const { act } = await import('react')
      await act(async () => {
        todo?.click()
      })
      expect(onStartTodo).toHaveBeenCalledTimes(1)
    } finally {
      await cleanup()
    }

    const opened = await renderCompose('todo')
    try {
      const labels = buttonLabels()
      expect(labels).not.toContain('Créer une tâche')
      expect(document.body.textContent).toContain('Action')
      expect(document.body.textContent).toContain('Qui')
      expect(document.body.textContent).toContain('Quand')
      expect(labels.some((label) => label === 'Annuler')).toBe(true)
    } finally {
      await opened.cleanup()
    }
  })

  test('Consigner une action réalisée n’affiche pas Qui / Quand', async () => {
    const { cleanup } = await renderCompose('action')
    try {
      expect(document.body.textContent).toContain('Consigner une action réalisée')
      expect(document.body.textContent).toContain('Action')
      expect(document.body.textContent).toContain('Note')
      expect(document.body.textContent).not.toContain('Qui')
      expect(document.body.textContent).not.toContain('Quand')
      expect(document.querySelector('[data-inspector-compose-shell]')).not.toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('Laisser un commentaire envoie une note', async () => {
    const { act } = await import('react')
    const { cleanup, onSubmitNote, onSubmitAction } = await renderCompose('note')

    try {
      const comment = document.querySelector('textarea')
      expect(comment).toBeDefined()
      await act(async () => {
        nativeInput(comment as HTMLTextAreaElement, 'Juste un mot')
      })

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Ajouter'
      )
      await act(async () => {
        save?.click()
      })

      expect(onSubmitNote).toHaveBeenCalledWith('Juste un mot')
      expect(onSubmitAction).not.toHaveBeenCalled()
    } finally {
      await cleanup()
    }
  })

  test('Consigner une action réalisée envoie un acte fait', async () => {
    const { act } = await import('react')
    const { cleanup, onSubmitAction, onSubmitNote } = await renderCompose('action')

    try {
      const combobox = document.querySelector('[role="combobox"]') as HTMLInputElement | null
      expect(combobox).toBeDefined()
      await act(async () => {
        nativeInput(combobox as HTMLInputElement, 'Joindre le locataire')
      })

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Consigner'
      )
      await act(async () => {
        save?.click()
      })

      expect(onSubmitAction).toHaveBeenCalledWith({
        mode: 'enregistrer',
        action: 'Joindre le locataire',
        resultat: ''
      })
      expect(onSubmitNote).not.toHaveBeenCalled()
    } finally {
      await cleanup()
    }
  })

  test('Créer une tâche aujourd’hui planifie, sans enregistrer un fait', async () => {
    const { act } = await import('react')
    const { cleanup, onSubmitAction } = await renderCompose('todo')

    try {
      const combobox = document.querySelector('[role="combobox"]') as HTMLInputElement | null
      const due = document.querySelector<HTMLButtonElement>('[aria-label="Quand"]')
      expect(combobox).toBeDefined()
      expect(due?.textContent).toContain('24')
      expect(due?.textContent).toContain('2026')

      await act(async () => {
        nativeInput(combobox as HTMLInputElement, 'Joindre le locataire')
      })

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Planifier'
      )
      await act(async () => {
        save?.click()
      })

      expect(onSubmitAction).toHaveBeenCalledWith({
        mode: 'planifier',
        action: 'Joindre le locataire',
        assigneA: 'alice',
        dateEcheance: '2026-08-24',
        note: ''
      })
    } finally {
      await cleanup()
    }
  })

  test('Annuler ramène la pile et le shell n’est pas imbriqué', async () => {
    const { act } = await import('react')
    const opened = await renderCompose('note')
    try {
      expect(document.querySelectorAll('[data-inspector-compose-shell]').length).toBe(1)
      expect(document.body.textContent).toContain('Laisser une note')
      const cancel = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Annuler'
      )
      await act(async () => {
        cancel?.click()
        await new Promise((resolve) => setTimeout(resolve, 300))
      })
      expect(document.querySelector('[data-inspector-compose-shell]')).toBeNull()
      expect(buttonLabels()).toContain('Laisser une note')
      expect(buttonLabels()).toContain('Créer une tâche')
    } finally {
      await opened.cleanup()
    }
  })
})
