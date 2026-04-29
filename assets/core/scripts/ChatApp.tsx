import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Streamdown } from 'streamdown'

import { usePierreChat, type ChatStatus } from './hooks/usePierreChat'

// Boot data injected by the server via <script type="application/json">
type BootData = {
  convId: string
  configId: string
  dataParam: string
  disclaimer: string | null
  greeting: string[]
  examples: string[]
  displayableConfigs: { id: string; display: string; is_active: boolean }[]
  assetId: string
}

function getBootData(): BootData {
  const el = document.getElementById('pierre-data')
  if (!el?.textContent) throw new Error('Missing #pierre-data script tag')
  return JSON.parse(el.textContent)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Greeting({ greeting, assetId }: { greeting: string[]; assetId: string }) {
  return (
    <>
      <img
        className="mt-6 mb-3"
        src={`../assets/${assetId}/system.svg`}
        height={33}
        width={33}
        alt="IA"
      />
      <div className="prose" data-role="system">
        <Streamdown isAnimating={false}>{greeting.join('\n\n')}</Streamdown>
      </div>
    </>
  )
}

function ConfigSelector({ configs }: { configs: BootData['displayableConfigs'] }) {
  if (configs.length <= 1) return null
  return (
    <div>
      <p className="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500">VOUS ÊTES...</p>
      {configs.map((c) => (
        <a
          key={c.id}
          data-config=""
          href={`/?config=${c.id}`}
          {...(c.is_active ? { 'data-active': '' } : {})}
          className="mr-2 mb-2 inline-block w-fit cursor-pointer rounded border border-gray-200 px-3 py-2.5 text-left text-sm/snug text-gray-600 hover:border-gray-300 hover:bg-gray-50 data-active:border-gray-400 data-active:bg-gray-100"
        >
          {c.display}
        </a>
      ))}
    </div>
  )
}

function ExampleButtons({
  examples,
  onSelect
}: {
  examples: string[]
  onSelect: (text: string) => void
}) {
  return (
    <div>
      <p className="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500">EXEMPLES</p>
      {examples.map((eg, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(eg)}
          className="mb-2 block w-fit cursor-pointer rounded border border-gray-200 px-3 py-2.5 text-left text-sm/snug text-balance text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-progress disabled:text-gray-400 disabled:hover:bg-white"
        >
          {eg}
        </button>
      ))}
    </div>
  )
}

// Fake status messages shown while the agent is thinking
const STATUS_MESSAGES = [
  'Prise en compte de la question…',
  'Lecture de la demande…',
  'Analyse du besoin…',
  'Compréhension des attentes…',
  'Identification du contexte…',
  'Définition du périmètre…',
  'Cadrage de la réponse…',
  'Mise en structure…',
  'Organisation des éléments…',
  'Structuration des idées…',
  'Mise en cohérence des éléments…',
  'Analyse des points clés…',
  'Examen des éléments disponibles…',
  'Appréciation des enjeux…',
  'Affinage de l’analyse…',
  'Approfondissement du raisonnement…',
  'Consolidation de la réflexion…',
  'Hiérarchisation des priorités…',
  'Mise en relation des éléments…',
  'Articulation de la réponse…',
  'Construction de l’argumentation…',
  'Développement de la réponse…',
  'Précision du raisonnement…',
  'Clarification de la réponse…',
  'Synthèse des points essentiels…',
  'Formalisation des éléments…',
  'Rédaction structurée…',
  'Validation de la réponse…',
  'Contrôle de cohérence…',
  'Vérification globale…',
  'Mise au propre…',
  'Préparation de la restitution…'
]

function ThinkingIndicator() {
  const [statusText, setStatusText] = useState(
    () => STATUS_MESSAGES[Math.floor(Math.random() * STATUS_MESSAGES.length)] ?? STATUS_MESSAGES[0]!
  )
  const [fade, setFade] = useState(true)

  useEffect(() => {
    let lastIdx = STATUS_MESSAGES.indexOf(statusText)
    const rotate = () => {
      setFade(false)
      setTimeout(() => {
        let idx = Math.floor(Math.random() * STATUS_MESSAGES.length)
        if (idx === lastIdx) idx = (idx + 1) % STATUS_MESSAGES.length
        lastIdx = idx
        setStatusText(STATUS_MESSAGES[idx] ?? STATUS_MESSAGES[0]!)
        setFade(true)
      }, 300)
    }
    const id = setInterval(rotate, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div className={`status-line ${fade ? 'status-in' : 'status-out'}`}>{statusText}</div>
      <div className="thinking" />
    </div>
  )
}

const UserMessage = memo(({ content }: { content: string }) => (
  <div data-role="user" className="user prose">
    <Streamdown isAnimating={false}>{content}</Streamdown>
  </div>
))

function AIMessage({
  content,
  isStreaming,
  isSubmitted,
  isError,
  onRegenerate
}: {
  content: string
  isStreaming: boolean
  isSubmitted: boolean
  isError: boolean
  onRegenerate: () => void
}) {
  if (isError && !content) {
    return (
      <div data-role="system">
        <div className="prose" data-section="response">
          <p className="pierre_error">
            Une erreur s'est produite chez le fournisseur de modèle de langage.{' '}
            <span
              style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              onClick={onRegenerate}
            >
              Cliquer pour regénérer une réponse
            </span>
            . Si le problème persiste, patienter quelques minutes.
          </p>
        </div>
      </div>
    )
  }

  // Waiting for first token or content reset during tool execution
  if (!content && (isSubmitted || isStreaming)) {
    return (
      <div data-role="system">
        <ThinkingIndicator />
      </div>
    )
  }

  return (
    <div data-role="system">
      <div className="prose" data-section="response">
        <Streamdown
          animated={{ animation: 'blurIn', duration: 200, easing: 'ease-out' }}
          isAnimating={isStreaming}
          caret="block"
        >
          {content}
        </Streamdown>
      </div>
    </div>
  )
}

function Disclaimer({ text }: { text: string }) {
  return <div data-role="disclaimer">{text}</div>
}

function ChatInput({
  status,
  onSend,
  onStop
}: {
  status: ChatStatus
  onSend: (text: string) => void
  onStop: () => void
}) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isDisabled = status === 'submitted' || status === 'streaming'

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 250)}px`
  }, [])

  const submit = useCallback(() => {
    const text = value.trim()
    if (!text || isDisabled) return
    onSend(text)
    setValue('')
    // Reset textarea height after clearing
    setTimeout(() => autoResize(), 0)
  }, [value, isDisabled, onSend, autoResize])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    },
    [submit]
  )

  return (
    <footer className="fixed bottom-0 w-full max-w-4xl bg-white shadow-[0_0_40px_40px_rgba(255,255,255,1)]">
      <div className="mx-6 mb-6 flex h-fit flex-none items-center justify-between gap-x-2 rounded-lg border border-gray-200 bg-white py-3 pr-2 pl-4 shadow-sm">
        <textarea
          ref={textareaRef}
          className="row-span-2 min-h-11 flex-1 resize-none border-none text-[15px]/snug outline-0 placeholder:text-gray-400"
          id="prompt__input"
          name="message"
          placeholder="Comment puis-je vous aider ?"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />
        <button
          className="group h-8 cursor-pointer px-3 text-xl font-black hover:rounded-lg hover:bg-gray-100 disabled:cursor-progress disabled:border-stone-200 disabled:text-gray-400 disabled:hover:bg-white"
          type="button"
          onClick={isDisabled ? onStop : submit}
          disabled={!isDisabled && !value.trim()}
        >
          {isDisabled ? (
            // Stop icon
            <svg
              className="pointer-events-none fill-gray-600"
              viewBox="0 0 16 16"
              height={22}
              width={22}
            >
              <rect x="3" y="3" width="10" height="10" rx="1" />
            </svg>
          ) : (
            // Send icon
            <svg
              className="pointer-events-none fill-gray-600 group-disabled:fill-gray-200"
              viewBox="0 0 16 16"
              height={22}
              width={22}
            >
              <path d="M.989 8 .064 2.68a1.342 1.342 0 0 1 1.85-1.462l13.402 5.744a1.13 1.13 0 0 1 0 2.076L1.913 14.782a1.343 1.343 0 0 1-1.85-1.463L.99 8Zm.603-5.288L2.38 7.25h4.87a.75.75 0 0 1 0 1.5H2.38l-.788 4.538L13.929 8Z" />
            </svg>
          )}
        </button>
      </div>
    </footer>
  )
}

function ScrollAnchor({ messages, status }: { messages: unknown[]; status: ChatStatus }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    // Throttle scroll to every 200ms during streaming
    if (status === 'streaming' && now - lastScrollRef.current < 200) return
    lastScrollRef.current = now
    anchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  return <div ref={anchorRef} className="h-1" />
}

// ---------------------------------------------------------------------------
// Main ChatApp
// ---------------------------------------------------------------------------

export function ChatApp() {
  const boot = useRef(getBootData()).current
  const { messages, status, sendMessage, stop, regenerate } = usePierreChat({
    convId: boot.convId,
    configParam: boot.configId,
    dataParam: boot.dataParam
  })

  const hasMessages = messages.length > 0
  // Show disclaimer after first completed assistant response
  const showDisclaimer =
    boot.disclaimer &&
    messages.some((m) => m.role === 'assistant' && m.content && status === 'ready')

  return (
    <>
      <header className="fixed top-0 left-0 w-full shadow-[0_0_15px_15px_rgba(255,255,255,1)]" />

      <main className="flex flex-col px-6 pb-40">
        <Greeting greeting={boot.greeting} assetId={boot.assetId} />
        {!hasMessages && <ConfigSelector configs={boot.displayableConfigs} />}
        {!hasMessages && <ExampleButtons examples={boot.examples} onSelect={sendMessage} />}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isLastAssistant = isLast && msg.role === 'assistant'

          return msg.role === 'user' ? (
            <UserMessage key={msg.id} content={msg.content} />
          ) : (
            <AIMessage
              key={msg.id}
              content={msg.content}
              isStreaming={isLastAssistant && status === 'streaming'}
              isSubmitted={isLastAssistant && status === 'submitted'}
              isError={isLastAssistant && status === 'error'}
              onRegenerate={regenerate}
            />
          )
        })}

        {showDisclaimer && <Disclaimer text={boot.disclaimer!} />}
        <ScrollAnchor messages={messages} status={status} />
      </main>

      <ChatInput status={status} onSend={sendMessage} onStop={stop} />
    </>
  )
}
