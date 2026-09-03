import { Bot, BotMessageSquare, Hand, Rocket } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode
} from 'react'

import {
  CHAT_COMPOSER_PLACEHOLDER,
  ChatComposer,
  type ChatComposerHandle
} from '@/features/chat/components/ChatComposer'
import { ChatMessages } from '@/features/chat/components/ChatMessages'
import { ChatPublicEmpty } from '@/features/chat/components/ChatPublicEmpty'
import { QuestionCard } from '@/features/chat/components/QuestionCard'
import { isChatGenerating, useChatSession } from '@/features/chat/hooks/use-chat-session'
import {
  filesFromDataTransfer,
  hasDraggedFiles,
  mergeChatDropFiles
} from '@/features/chat/lib/chat-drop-files'
import type { ChatTransport } from '@/features/chat/lib/chat-transport'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/shared/components/ui/message-scroller'
import { cn } from '@/shared/lib/utils'
import type { ChatBoot } from '@/shared/types'

export type ChatPanelHandle = {
  stop: () => void
  clearMessages: () => void
  resetAfterAbortedStop: () => void
}

interface Props {
  boot: ChatBoot
  transport: ChatTransport
  composerAccessory?: ReactNode
  scroll?: 'panel' | 'window'
  arrival?: boolean
}

const CHAT_MEASURE = 'w-full max-w-3xl'

const GREETING_MARKS = [Hand, Bot, BotMessageSquare, Rocket] as const

function stripTrailingEmoji(line: string) {
  return line.replace(/\s*\p{Extended_Pictographic}\uFE0F?$/u, '').trimEnd()
}

function EmptyGreeting({
  greetings,
  arrival = false,
  compact = false
}: {
  greetings: string[]
  arrival?: boolean
  compact?: boolean
}) {
  const [pick] = useState(() => {
    const index = Math.min(greetings.length - 1, Math.floor(Math.random() * greetings.length))
    return { index, line: greetings[index]! }
  })

  if (!arrival) {
    return (
      <p
        data-slot="chat-empty-greeting"
        className="px-3 font-serif text-2xl leading-8 font-[450] tracking-normal [font-optical-sizing:auto]"
      >
        {pick.line}
      </p>
    )
  }

  const Mark = GREETING_MARKS[pick.index % GREETING_MARKS.length]!
  return (
    <div data-slot="chat-empty-greeting" className="flex items-start gap-3 px-3">
      <Mark className={cn('shrink-0', compact ? 'mt-0.5 size-6' : 'mt-1 size-8')} aria-hidden />
      <p
        className={cn(
          'min-w-0 font-serif font-[450] tracking-normal [font-optical-sizing:auto]',
          compact ? 'text-2xl leading-8' : 'text-4xl leading-tight'
        )}
      >
        {stripTrailingEmoji(pick.line)}
      </p>
    </div>
  )
}

function ChatDisclaimer({ text }: { text: string }) {
  return (
    <p
      data-slot="chat-disclaimer"
      className="text-muted-foreground mt-2 text-center text-[0.625rem] leading-4"
    >
      {text}
    </p>
  )
}

export const ChatPanel = forwardRef<ChatPanelHandle, Props>(function ChatPanel(
  { boot, transport, composerAccessory, scroll = 'panel', arrival = false },
  ref
) {
  const windowScroll = scroll === 'window'
  const composerRef = useRef<HTMLDivElement>(null)
  const composerFocusRef = useRef<ChatComposerHandle>(null)
  const [composerHeight, setComposerHeight] = useState(88)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<Array<string | undefined>>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [dropActive, setDropActive] = useState(false)
  const [examplePreview, setExamplePreview] = useState<string | null>(null)
  const pendingFilesRef = useRef<File[]>([])
  const pendingPreviewUrlsRef = useRef<Array<string | undefined>>([])
  const attachmentUsageRef = useRef({ files: 0, bytes: 0 })
  const generatingRef = useRef(false)
  const dragDepthRef = useRef(0)

  const chatConfig = useMemo(
    () => ({
      convId: boot.convId,
      configId: boot.configId,
      dataParam: boot.dataParam
    }),
    [boot.convId, boot.configId, boot.dataParam]
  )

  const {
    messages,
    attachmentUsage,
    status,
    statusLiveRegion,
    sendMessage,
    stop,
    regenerate,
    pendingQuestionnaire,
    questionnaireError,
    submitQuestionnaire,
    clearMessages,
    resetAfterAbortedStop
  } = useChatSession(chatConfig, transport)

  useImperativeHandle(ref, () => ({ stop, clearMessages, resetAfterAbortedStop }), [
    stop,
    clearMessages,
    resetAfterAbortedStop
  ])

  const generating = isChatGenerating(status)
  const allowAttachments = boot.attachments
  const isEmptyThread = messages.length === 0
  const showExamples = isEmptyThread && boot.examples.length > 0 && !pendingQuestionnaire
  const showEmptyGreeting = isEmptyThread && boot.greetings.length > 0 && !pendingQuestionnaire
  const previewedExample = showExamples ? examplePreview : null

  useEffect(() => {
    generatingRef.current = generating
  }, [generating])

  useEffect(() => {
    attachmentUsageRef.current = attachmentUsage
  }, [attachmentUsage])

  useEffect(() => {
    if (!windowScroll || isEmptyThread) {
      document.documentElement.style.scrollPaddingBottom = ''
      return
    }
    const el = composerRef.current
    if (!el) return
    const update = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      setComposerHeight(height)
      document.documentElement.style.scrollPaddingBottom = `${height}px`
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.scrollPaddingBottom = ''
    }
  }, [isEmptyThread, windowScroll])

  useEffect(() => {
    if (!windowScroll) return
    const root = document.documentElement
    const nearBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 96
    if (generating || nearBottom) {
      window.scrollTo({ top: root.scrollHeight })
    }
  }, [windowScroll, generating, messages])

  useEffect(
    () => () => {
      for (const previewUrl of pendingPreviewUrlsRef.current) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
      }
    },
    []
  )

  const replacePendingFiles = useCallback(
    (files: File[], previewUrls: Array<string | undefined>) => {
      pendingFilesRef.current = files
      pendingPreviewUrlsRef.current = previewUrls
      setPendingFiles(files)
      setPendingPreviewUrls(previewUrls)
    },
    []
  )

  const resetDropState = useCallback(() => {
    dragDepthRef.current = 0
    setDropActive(false)
  }, [])

  const applyIncomingFiles = useCallback(
    (incoming: File[]) => {
      const result = mergeChatDropFiles(
        pendingFilesRef.current,
        incoming,
        attachmentUsageRef.current
      )
      const previewUrls = result.files.map((file) => {
        const existingIndex = pendingFilesRef.current.indexOf(file)
        if (existingIndex >= 0) return pendingPreviewUrlsRef.current[existingIndex]
        return file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      })
      replacePendingFiles(result.files, previewUrls)
      setFileErrors(result.errors)
    },
    [replacePendingFiles]
  )

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!allowAttachments || !hasDraggedFiles(event.dataTransfer)) return
      event.preventDefault()
      if (generatingRef.current) return
      dragDepthRef.current += 1
      if (dragDepthRef.current === 1) setDropActive(true)
    },
    [allowAttachments]
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!allowAttachments || !hasDraggedFiles(event.dataTransfer)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = generatingRef.current ? 'none' : 'copy'
    },
    [allowAttachments]
  )

  const handleDragLeave = useCallback(() => {
    if (!allowAttachments || dragDepthRef.current === 0) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current === 0) setDropActive(false)
  }, [allowAttachments])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!allowAttachments || !hasDraggedFiles(event.dataTransfer)) return
      event.preventDefault()
      resetDropState()
      if (generatingRef.current) return
      applyIncomingFiles(filesFromDataTransfer(event.dataTransfer))
    },
    [allowAttachments, applyIncomingFiles, resetDropState]
  )

  const handleRemoveFile = useCallback(
    (index: number) => {
      const previewUrl = pendingPreviewUrlsRef.current[index]
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      replacePendingFiles(
        pendingFilesRef.current.filter((_, fileIndex) => fileIndex !== index),
        pendingPreviewUrlsRef.current.filter((_, fileIndex) => fileIndex !== index)
      )
      setFileErrors([])
    },
    [replacePendingFiles]
  )

  const handleFilesSent = useCallback(() => {
    for (const previewUrl of pendingPreviewUrlsRef.current) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    replacePendingFiles([], [])
    setFileErrors([])
  }, [replacePendingFiles])

  const handleSend = useCallback(
    (text: string, files: File[] = []) => {
      void sendMessage(text, { files: allowAttachments ? files : [] })
      composerFocusRef.current?.focus()
    },
    [allowAttachments, sendMessage]
  )

  const dropHandlers = allowAttachments
    ? {
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
      }
    : undefined

  const thread = windowScroll ? (
    <div
      className={cn('mx-auto flex flex-col gap-6 px-6 py-6', CHAT_MEASURE)}
      aria-busy={generating}
    >
      <ChatMessages
        messages={messages}
        status={status}
        boot={boot}
        onRegenerate={regenerate}
        scroller={false}
      />
    </div>
  ) : (
    <MessageScrollerProvider key={boot.configId} autoScroll defaultScrollPosition="last-anchor">
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent
            className={cn('mx-auto gap-6 px-6 py-6', CHAT_MEASURE)}
            aria-busy={generating}
          >
            <ChatMessages
              messages={messages}
              status={status}
              boot={boot}
              onRegenerate={regenerate}
            />
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full flex-col',
        windowScroll ? (isEmptyThread ? 'min-h-dvh' : undefined) : 'min-h-0 flex-1'
      )}
      style={windowScroll && !isEmptyThread ? { paddingBottom: composerHeight } : undefined}
      {...dropHandlers}
    >
      {statusLiveRegion}
      {isEmptyThread ? null : thread}
      <div
        data-slot={isEmptyThread ? 'chat-empty-stage' : undefined}
        className={cn(
          'flex flex-col',
          isEmptyThread && 'min-h-0 flex-1',
          isEmptyThread && !windowScroll && 'overflow-y-auto',
          !isEmptyThread && 'shrink-0'
        )}
      >
        {isEmptyThread ? (
          <div data-slot="chat-empty-rise" className="min-h-0 flex-1" aria-hidden />
        ) : null}
        <div
          ref={composerRef}
          className={cn(
            windowScroll &&
              !isEmptyThread &&
              'bg-background fixed inset-x-0 bottom-0 z-10 px-6 pt-3 pb-3',
            windowScroll && isEmptyThread && 'px-6',
            !windowScroll &&
              cn('mx-auto flex flex-col px-6', CHAT_MEASURE, !isEmptyThread && 'pb-6')
          )}
        >
          <div className={windowScroll ? cn('mx-auto flex flex-col', CHAT_MEASURE) : 'contents'}>
            <div data-slot="chat-invitation" className="flex flex-col gap-4">
              {pendingQuestionnaire ? (
                <QuestionCard
                  pending={pendingQuestionnaire}
                  error={questionnaireError}
                  onAnswer={submitQuestionnaire}
                />
              ) : null}
              <div className={cn('flex flex-col', arrival ? 'gap-4' : 'gap-2')}>
                {showEmptyGreeting ? (
                  <EmptyGreeting
                    key={boot.configId}
                    greetings={boot.greetings}
                    arrival={arrival}
                    compact={boot.embed}
                  />
                ) : null}
                <ChatComposer
                  ref={composerFocusRef}
                  status={status}
                  files={allowAttachments ? pendingFiles : []}
                  previewUrls={allowAttachments ? pendingPreviewUrls : []}
                  fileErrors={allowAttachments ? fileErrors : []}
                  dropActive={allowAttachments && dropActive}
                  allowAttachments={allowAttachments}
                  autoFocus={!boot.embed}
                  composerAccessory={composerAccessory}
                  placeholder={previewedExample ?? CHAT_COMPOSER_PLACEHOLDER}
                  onSend={handleSend}
                  onAddFiles={allowAttachments ? applyIncomingFiles : undefined}
                  onRemoveFile={handleRemoveFile}
                  onFilesSent={handleFilesSent}
                  onStop={stop}
                />
              </div>
              {showExamples ? (
                <ChatPublicEmpty
                  examples={boot.examples}
                  quiet={arrival}
                  onExample={(text) => handleSend(text)}
                  onPreview={setExamplePreview}
                />
              ) : null}
            </div>
            {!isEmptyThread && boot.disclaimer ? <ChatDisclaimer text={boot.disclaimer} /> : null}
          </div>
        </div>
        {isEmptyThread ? (
          <div data-slot="chat-empty-fall" className="min-h-0 flex-1" aria-hidden />
        ) : null}
      </div>
    </div>
  )
})
