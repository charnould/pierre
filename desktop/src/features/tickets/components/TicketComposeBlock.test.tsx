import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { TicketComposeMode } from '../lib/use-tickets-view-data'

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

function buttonLabels() {
  return [...document.querySelectorAll('button')].map((button) => button.textContent)
}

async function renderCompose(
  mode: TicketComposeMode = null,
  ticket: Record<string, unknown> = {
    id_reclamation: 'REC-1',
    id_locataire: 'LOC-1',
    message: 'Fuite'
  }
) {
  const { act, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { TicketComposeBlock } = await import('./TicketComposeBlock')

  const onSubmitComment = mock(() => {})
  const onStartComment = mock(() => {})
  const onRcsSend = mock(() => {})
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  function Harness() {
    const [composeMode, setComposeMode] = useState(mode)
    const [comment, setComment] = useState('')
    const [rcsMessage, setRcsMessage] = useState('Bonjour')
    return (
      <TicketComposeBlock
        ticket={ticket}
        composeMode={composeMode}
        hasTimelineHistory={false}
        comment={comment}
        onCommentChange={setComment}
        rcsMessage={rcsMessage}
        onRcsMessageChange={setRcsMessage}
        emailSubject=""
        onEmailSubjectChange={() => {}}
        emailBody=""
        onEmailBodyChange={() => {}}
        letterSubject=""
        onLetterSubjectChange={() => {}}
        letterBody=""
        onLetterBodyChange={() => {}}
        summarizeContent=""
        onSummarizeContentChange={() => {}}
        onStartComment={() => {
          onStartComment()
          setComposeMode('comment')
        }}
        onStartTodo={() => setComposeMode('todo')}
        onStartAction={() => setComposeMode('action')}
        onStartBucket={() => setComposeMode('bucket')}
        onStartTags={() => setComposeMode('tags')}
        onStartAssignment={() => setComposeMode('assignment')}
        onStartRcs={() => setComposeMode('rcs')}
        onStartEmail={() => setComposeMode('email')}
        onStartLetter={() => setComposeMode('letter')}
        onStartSummarize={() => setComposeMode('summarize')}
        onCancelCompose={() => setComposeMode(null)}
        onSubmitComment={onSubmitComment}
        onSubmitAction={() => {}}
        draftBucket="non_traitees"
        currentBucket="non_traitees"
        onDraftBucketChange={() => {}}
        bucketComment=""
        onBucketCommentChange={() => {}}
        onSubmitBucket={() => {}}
        draftTags={[]}
        currentTags={[]}
        onDraftTagsChange={() => {}}
        tagComment=""
        onTagCommentChange={() => {}}
        onSubmitTags={() => {}}
        onAssignReferent={() => {}}
        onImportEml={() => {}}
        onSummarizeDraft={() => {}}
        onSummarizeSave={() => {}}
        onRcsDraft={() => {}}
        onRcsSaveDraft={() => {}}
        onRcsSend={onRcsSend}
        onEmailDraft={() => {}}
        onEmailSaveDraft={() => {}}
        onEmailSend={() => {}}
        onLetterDraft={() => {}}
        onLetterSaveDraft={() => {}}
        onLetterExportWord={() => {}}
        onLetterMarkSent={() => {}}
      />
    )
  }

  await act(async () => {
    root.render(<Harness />)
  })

  return {
    onSubmitComment,
    onStartComment,
    onRcsSend,
    act,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('TicketComposeBlock', () => {
  test('affiche le message initial intégral dans le contexte', async () => {
    const message = 'Message intégral '.repeat(20).trim()
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { TicketSummaryCard } = await import('./TicketComposeBlock')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <TicketSummaryCard ticket={{ id_reclamation: 'REC-1', message_initial: message }} />
      )
    })
    try {
      expect(container.textContent).toContain(message)
      expect(container.textContent).not.toContain(`${message.slice(0, 120)}…`)
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })

  test('montre toutes les capacités de la réclamation', async () => {
    const { cleanup } = await renderCompose()
    try {
      const labels = buttonLabels()
      expect(labels).toContain('Ajouter une note')
      expect(labels).toContain('Créer une tâche')
      expect(labels).toContain('Consigner une action réalisée')
      expect(labels).toContain('Changer de panier')
      expect(labels).toContain('Envoyer un RCS au locataire')
      expect(labels).toContain('Envoyer un courriel au locataire')
      expect(labels).toContain('Envoyer un courrier postal au locataire')
      expect(labels).toContain('Importer un email')
      expect(labels).toContain('Changer les tags')
      expect(labels).toContain('Affecter à un référent')
      expect(labels).toContain('Générer un point de situation')
    } finally {
      await cleanup()
    }
  })

  test('le brouillon note remplace la pile dans un shell unique', async () => {
    const { act } = await import('react')
    const { cleanup, onSubmitComment } = await renderCompose('comment')
    try {
      expect(buttonLabels()).not.toContain('Ajouter une note')
      expect(document.querySelectorAll('[data-inspector-compose-shell]').length).toBe(1)
      expect(document.body.textContent).toContain('Ajouter une note')
      expect(document.body.textContent).toContain('Note')

      const comment = document.querySelector('textarea')
      await act(async () => {
        nativeInput(comment as HTMLTextAreaElement, 'Suivi locataire')
      })
      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Enregistrer'
      )
      await act(async () => {
        save?.click()
      })
      expect(onSubmitComment).toHaveBeenCalledTimes(1)
    } finally {
      await cleanup()
    }
  })

  test('alimente tags et paniers depuis la customization Tickets', async () => {
    const tags = await renderCompose('tags')
    try {
      expect(document.body.textContent).toContain('Sécurité des personnes')
      expect(document.body.textContent).toContain('Attente prestataire')
      expect(document.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0)
    } finally {
      await tags.cleanup()
    }

    const bucket = await renderCompose('bucket')
    try {
      expect(document.body.textContent).toContain('Changer de panier')
      expect(document.body.textContent).toContain('Non traitées')
    } finally {
      await bucket.cleanup()
    }
  })

  test('RCS expose un label Message et Envoyer le RCS', async () => {
    const { cleanup } = await renderCompose('rcs')
    try {
      expect(document.body.textContent).toContain('Envoyer un RCS au locataire')
      expect(document.body.textContent).toContain('Message')
      expect(buttonLabels()).toContain('Envoyer le RCS')
      expect(buttonLabels()).toContain('Rédiger avec IA')
    } finally {
      await cleanup()
    }
  })

  test('Annuler ramène la pile', async () => {
    const { act } = await import('react')
    const { cleanup } = await renderCompose('comment')
    try {
      const cancel = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Annuler'
      )
      await act(async () => {
        cancel?.click()
        await new Promise((resolve) => setTimeout(resolve, 300))
      })
      expect(buttonLabels()).toContain('Ajouter une note')
      expect(document.querySelector('[data-inspector-compose-shell]')).toBeNull()
    } finally {
      await cleanup()
    }
  })
})
