import { ChevronRight, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Streamdown } from 'streamdown'

import type { PendingAiQuestionnaire } from '../../../shared/ai-stream-events'
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
  reasoningDisplay: 'off' | 'partial' | 'full'
  reasoningPlaceholders: string[]
}

function getBootData(): BootData {
  const el = document.getElementById('pierre-data')
  if (!el?.textContent) throw new Error('Missing #pierre-data script tag')
  return JSON.parse(el.textContent)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Greeting({ greeting }: { greeting: string[] }) {
  return (
    <>
      <img className="mt-6 mb-3" src="/branding/system.svg" height={33} width={33} alt="IA" />
      <div className="prose" data-role="system">
        <Streamdown isAnimating={false}>{greeting.join('\n\n')}</Streamdown>
      </div>
    </>
  )
}

function ConfigSelector({
  configs,
  isCompact
}: {
  configs: BootData['displayableConfigs']
  isCompact: boolean
}) {
  if (configs.length <= 1) return null
  return (
    <div>
      <p className="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500">VOUS ÊTES...</p>
      {configs.map((c) => (
        <a
          key={c.id}
          data-config=""
          href={`/?config=${c.id}${isCompact ? '&compact' : ''}`}
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

// Placeholder messages shown while the agent is reasoning (when reasoning_display is 'off')
function ThinkingIndicator({ reasoningPlaceholders }: { reasoningPlaceholders: string[] }) {
  const [statusText, setStatusText] = useState(
    () =>
      reasoningPlaceholders[Math.floor(Math.random() * reasoningPlaceholders.length)] ??
      reasoningPlaceholders[0]!
  )
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const rotate = () => {
      setFade(false)
      setTimeout(() => {
        setStatusText((current) => {
          let idx = Math.floor(Math.random() * reasoningPlaceholders.length)
          if (reasoningPlaceholders[idx] === current) {
            idx = (idx + 1) % reasoningPlaceholders.length
          }
          return reasoningPlaceholders[idx] ?? reasoningPlaceholders[0]!
        })
        setFade(true)
      }, 300)
    }
    const id = setInterval(rotate, 3000)
    return () => clearInterval(id)
  }, [reasoningPlaceholders])

  return (
    <div>
      <div className={`status-line ${fade ? 'status-in' : 'status-out'}`}>{statusText}</div>
      <div className="thinking" />
    </div>
  )
}

function ThinkingContent({ reasoning, mode }: { reasoning: string; mode: 'partial' | 'full' }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // In partial mode: collapsed by default; in full mode: always expanded
  const [open, setOpen] = useState(mode === 'full')
  const contentClass =
    mode === 'full' ? 'reasoning-content reasoning-content--full' : 'reasoning-content'

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [reasoning, open])

  return (
    <div className="reasoning-wrapper">
      {mode === 'partial' ? (
        <>
          <div
            className="reasoning-summary"
            onClick={() => setOpen((o) => !o)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
          >
            <span>Réflexion en cours…</span>
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </div>
          {!open && <div className="thinking" style={{ marginLeft: 0 }} />}
        </>
      ) : (
        <div className="mb-1 text-gray-400">Mon raisonnement :</div>
      )}
      {open && (
        <div ref={scrollRef} className={contentClass}>
          <Streamdown
            animated={{
              animation: 'blurIn',
              duration: 200,
              easing: 'ease-out'
            }}
            isAnimating={true}
            disallowedElements={[
              'table',
              'thead',
              'tbody',
              'tr',
              'th',
              'td',
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'hr',
              'blockquote',
              'pre',
              'code'
            ]}
            unwrapDisallowed
          >
            {reasoning}
          </Streamdown>
        </div>
      )}
    </div>
  )
}

function ThinkingContentDone({
  reasoning,
  durationSeconds,
  mode
}: {
  reasoning: string
  durationSeconds?: number
  mode: 'partial' | 'full'
}) {
  const [open, setOpen] = useState(false)
  const contentClass =
    mode === 'full' ? 'reasoning-content reasoning-content--full' : 'reasoning-content'

  return (
    <div className="reasoning-wrapper">
      <div
        className="reasoning-summary"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
      >
        <span>Réflexion pendant {durationSeconds ?? 0}s</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </div>
      {open && (
        <div className={contentClass}>
          <Streamdown
            isAnimating={false}
            disallowedElements={[
              'table',
              'thead',
              'tbody',
              'tr',
              'th',
              'td',
              'h1',
              'h2',
              'h3',
              'h4',
              'h5',
              'h6',
              'hr',
              'blockquote',
              'pre',
              'code'
            ]}
            unwrapDisallowed
          >
            {reasoning}
          </Streamdown>
        </div>
      )}
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
  reasoning,
  reasoningDuration,
  isStreaming,
  isSubmitted,
  isError,
  showThinking,
  reasoningPlaceholders,
  onRegenerate
}: {
  content: string
  reasoning?: string
  reasoningDuration?: number
  isStreaming: boolean
  isSubmitted: boolean
  isError: boolean
  showThinking: 'off' | 'partial' | 'full'
  reasoningPlaceholders: string[]
  onRegenerate: () => void
}) {
  if (isError && !content) {
    return (
      <div data-role="system">
        <div className="prose" data-section="response">
          <p className="pierre_error">
            Une erreur s'est produite chez le fournisseur de modèle de langage.{' '}
            <span
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
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
        {showThinking !== 'off' && reasoning ? (
          <ThinkingContent reasoning={reasoning} mode={showThinking} />
        ) : (
          <ThinkingIndicator reasoningPlaceholders={reasoningPlaceholders} />
        )}
      </div>
    )
  }

  return (
    <div data-role="system">
      {showThinking !== 'off' && reasoning && (
        <ThinkingContentDone
          reasoning={reasoning}
          durationSeconds={reasoningDuration}
          mode={showThinking}
        />
      )}
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

function Questionnaire({
  pending,
  error,
  onSubmit
}: {
  pending: PendingAiQuestionnaire
  error: string | null
  onSubmit: (answers: Array<{ question: string; answer: string }>) => Promise<boolean>
}) {
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="mx-6 mb-4 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (submitting) return
        const formData = new FormData(event.currentTarget)
        const answers = pending.questions.map((question, index) => {
          const selected = String(formData.get(`q${index}`) ?? '')
          return {
            question: question.question,
            answer:
              selected === '__other__'
                ? String(formData.get(`q${index}-other`) ?? '').trim()
                : selected
          }
        })
        if (answers.some(({ answer }) => !answer)) return
        setSubmitting(true)
        void onSubmit(answers).finally(() => setSubmitting(false))
      }}
    >
      <div className="space-y-4">
        {pending.questions.map((question, index) => (
          <fieldset key={question.question} disabled={submitting}>
            <legend className="mb-2 text-sm font-medium text-gray-700">{question.question}</legend>
            <div className="space-y-2">
              {question.choices.map((choice) => (
                <label key={choice} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name={`q${index}`} value={choice} required />
                  <span>{choice}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`q${index}`} value="__other__" required />
                <input
                  className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 outline-none focus:border-gray-400"
                  name={`q${index}-other`}
                  placeholder="Autre réponse…"
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Envoi…' : 'Répondre'}
      </button>
    </form>
  )
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
    <div>
      <div className="mx-6 mb-6 flex h-fit flex-none items-center justify-between gap-x-2 rounded-lg border border-gray-200 bg-white py-3 pr-2 pl-4 shadow-sm">
        <textarea
          ref={textareaRef}
          className="row-span-2 min-h-11 flex-1 resize-none border-none text-base/snug outline-0 placeholder:text-gray-400"
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
    </div>
  )
}

function ScrollAnchor({ messages, status }: { messages: unknown[]; status: ChatStatus }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const lastScrollRef = useRef(0)
  const isInitialMount = useRef(true)
  const userScrolledUp = useRef(false)

  // Detect manual scroll-up
  useEffect(() => {
    const onScroll = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      userScrolledUp.current = distanceFromBottom > 100
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reset "scrolled up" flag when the user submits a new message
  useEffect(() => {
    if (status === 'submitted') userScrolledUp.current = false
  }, [status])

  useEffect(() => {
    if (messages.length === 0) return
    // Skip scroll on initial load (e.g. resuming a conversation)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // Don't scroll if the user has scrolled up to read
    if (userScrolledUp.current) return
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
  const [boot] = useState(getBootData)
  const isCompact = new URLSearchParams(window.location.search).has('compact')
  const {
    messages,
    status,
    sendMessage,
    stop,
    regenerate,
    pendingQuestionnaire,
    questionnaireError,
    submitQuestionnaire
  } = usePierreChat({
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
        {!isCompact && <Greeting greeting={boot.greeting} />}
        {!hasMessages && <ConfigSelector configs={boot.displayableConfigs} isCompact={isCompact} />}
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
              reasoning={msg.reasoning}
              reasoningDuration={msg.reasoningDuration}
              isStreaming={isLastAssistant && status === 'streaming'}
              isSubmitted={isLastAssistant && status === 'submitted'}
              isError={isLastAssistant && status === 'error'}
              showThinking={boot.reasoningDisplay}
              reasoningPlaceholders={boot.reasoningPlaceholders}
              onRegenerate={regenerate}
            />
          )
        })}

        {showDisclaimer && <Disclaimer text={boot.disclaimer!} />}
        <ScrollAnchor messages={messages} status={status} />
      </main>

      <footer className="fixed bottom-0 w-full max-w-4xl bg-white shadow-[0_0_40px_40px_rgba(255,255,255,1)]">
        {pendingQuestionnaire ? (
          <Questionnaire
            pending={pendingQuestionnaire}
            error={questionnaireError}
            onSubmit={submitQuestionnaire}
          />
        ) : null}
        <ChatInput status={status} onSend={sendMessage} onStop={stop} />
      </footer>
    </>
  )
}
