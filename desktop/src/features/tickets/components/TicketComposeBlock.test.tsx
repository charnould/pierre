import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { TicketComposeMode } from '../lib/use-tickets-view-data'
import type { TicketAiGenerationProps } from './TicketComposeBlock'

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
  },
  aiGeneration: TicketAiGenerationProps | null = null
) {
  const { act, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { AgentIdentityProvider } = await import('@/contexts/AgentIdentityContext')
  const { TicketComposeBlock } = await import('./TicketComposeBlock')

  const onSubmitComment = mock(() => {})
  const onStartComment = mock(() => {})
  const onRcsSend = mock(() => {})
  const onExternalInject = mock(() => {})
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  function Harness() {
    const [composeMode, setComposeMode] = useState(mode)
    const [comment, setComment] = useState('')
    const [rcsMessage, setRcsMessage] = useState('Bonjour')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [letterSubject, setLetterSubject] = useState('')
    const [letterBody, setLetterBody] = useState('')
    const [externalSubject, setExternalSubject] = useState('')
    const [externalBody, setExternalBody] = useState('Bonjour')
    return (
      <TicketComposeBlock
        ticket={ticket}
        composeMode={composeMode}
        aiGeneration={aiGeneration}
        hasTimelineHistory={false}
        comment={comment}
        onCommentChange={setComment}
        rcsMessage={rcsMessage}
        onRcsMessageChange={setRcsMessage}
        emailSubject={emailSubject}
        onEmailSubjectChange={setEmailSubject}
        emailBody={emailBody}
        onEmailBodyChange={setEmailBody}
        letterSubject={letterSubject}
        onLetterSubjectChange={setLetterSubject}
        letterBody={letterBody}
        onLetterBodyChange={setLetterBody}
        externalSubject={externalSubject}
        onExternalSubjectChange={setExternalSubject}
        externalBody={externalBody}
        onExternalBodyChange={setExternalBody}
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
        onStartReply={() => setComposeMode('external')}
        onReplyFormatChange={setComposeMode}
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
        onRcsSend={onRcsSend}
        onEmailDraft={() => {}}
        onEmailSend={() => {}}
        onLetterDraft={() => {}}
        onLetterExportWord={() => {}}
        onLetterSend={() => {}}
        onExternalDraft={() => {}}
        onExternalInject={onExternalInject}
      />
    )
  }

  await act(async () => {
    root.render(
      <AgentIdentityProvider name="Gustave">
        <Harness />
      </AgentIdentityProvider>
    )
  })

  return {
    onSubmitComment,
    onStartComment,
    onRcsSend,
    onExternalInject,
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
      expect(labels).toContain('Répondre au locataire')
      expect(labels).not.toContain('Envoyer un RCS au locataire')
      expect(labels).not.toContain('Envoyer un courriel au locataire')
      expect(labels).not.toContain('Envoyer un courrier postal au locataire')
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

  test('le composeur RCS masque l’objet et expose les actions communes', async () => {
    const { cleanup } = await renderCompose('rcs')
    try {
      expect(document.body.textContent).toContain('Répondre au locataire')
      expect(document.body.textContent).toContain('Format')
      expect(document.body.textContent).toContain('Message')
      expect(document.body.textContent).not.toContain('Objet')
      expect(buttonLabels()).toContain('Envoyer')
      expect(buttonLabels()).toContain('Rédiger avec Gustave')
      expect(buttonLabels()).not.toContain('Injecter dans Aravis')
      expect(buttonLabels()).not.toContain('Exporter en DOCX')
      expect(document.querySelector('textarea')?.className).toContain('h-full')
      expect(document.querySelector('[data-inspector-compose-shell]')?.className).toContain(
        'h-full'
      )
    } finally {
      await cleanup()
    }
  })

  test('réutilise le rendu de Synthèse pendant la génération', async () => {
    const compose = await renderCompose(
      'email',
      {
        id_reclamation: 'REC-1',
        id_locataire: 'LOC-1',
        message: 'Fuite'
      },
      {
        target: 'email',
        isStreaming: true,
        workParts: [{ type: 'thinking', contentIndex: 0, thinking: 'Analyse du dossier' }],
        output: '**Bonjour**',
        showReasoning: true
      }
    )
    try {
      expect(document.querySelector('textarea')).toBeNull()
      expect(document.body.textContent).toContain('Bonjour')
      expect(document.querySelector('.generated-stream-caret')).not.toBeNull()
      expect(document.querySelector('.typeset-docs')).not.toBeNull()
    } finally {
      await compose.cleanup()
    }
  })

  test('ouvre Aravis par défaut, remplace Envoyer et réserve le DOCX au courrier postal', async () => {
    const external = await renderCompose()
    try {
      await external.act(async () => {
        ;[...document.querySelectorAll('button')]
          .find((button) => button.textContent === 'Répondre au locataire')
          ?.click()
        await new Promise((resolve) => setTimeout(resolve, 300))
      })
      expect(document.body.textContent).toContain('Via Aravis')
      expect(document.body.textContent).toContain('Objet')
      expect(buttonLabels()).toContain('Injecter dans Aravis')
      expect(buttonLabels()).not.toContain('Envoyer')
      expect(buttonLabels()).not.toContain('Exporter en DOCX')
      await external.act(async () => {
        ;[...document.querySelectorAll('button')]
          .find((button) => button.textContent === 'Injecter dans Aravis')
          ?.click()
      })
      expect(external.onExternalInject).toHaveBeenCalledTimes(1)
    } finally {
      await external.cleanup()
    }

    const letter = await renderCompose('letter')
    try {
      expect(document.body.textContent).toContain('Via la poste')
      expect(document.body.textContent).toContain('Objet')
      expect(buttonLabels()).toContain('Exporter en DOCX')
    } finally {
      await letter.cleanup()
    }
  })

  test('conserve les champs propres à chaque format', async () => {
    const compose = await renderCompose('email')
    try {
      const emailSubject = document.querySelector('input[placeholder="Objet du courriel"]')
      const emailBody = document.querySelector('textarea')
      await compose.act(async () => {
        nativeInput(emailSubject as HTMLInputElement, 'Objet conservé')
        nativeInput(emailBody as HTMLTextAreaElement, 'Corps conservé')
        document.querySelector<HTMLElement>('[data-slot="select-trigger"]')?.click()
      })
      const rcsOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
        (option) => option.textContent === 'SMS / RCS'
      )
      await compose.act(async () => rcsOption?.click())
      expect(document.querySelector('input[placeholder="Objet du courriel"]')).toBeNull()

      await compose.act(async () => {
        document.querySelector<HTMLElement>('[data-slot="select-trigger"]')?.click()
      })
      const emailOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
        (option) => option.textContent === 'Courriel'
      )
      await compose.act(async () => emailOption?.click())
      expect(
        (document.querySelector('input[placeholder="Objet du courriel"]') as HTMLInputElement).value
      ).toBe('Objet conservé')
      expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
        'Corps conservé'
      )
    } finally {
      await compose.cleanup()
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
