import { FileUpIcon, LoaderCircleIcon } from 'lucide-react'
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

import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatIntro } from '@/features/chat/components/ChatIntro'
import { ChatMessages } from '@/features/chat/components/ChatMessages'
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
  MessageScrollerItem,
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
  intro?: { iconSrc: string }
  composerAccessory?: ReactNode
  scroll?: 'panel' | 'window'
}

const CHAT_MEASURE = 'w-full max-w-[calc(42rem*1.15)]'

function hasFinishedAssistantReply(
  messages: Array<{ role: string; parts: Array<{ type: string; text?: string }> }>
): boolean {
  return messages.some(
    (message) =>
      message.role === 'assistant' &&
      message.parts.some((part) => part.type === 'text' && Boolean(part.text?.trim()))
  )
}

export const ChatPanel = forwardRef<ChatPanelHandle, Props>(function ChatPanel(
  { boot, transport, intro, composerAccessory, scroll = 'panel' },
  ref
) {
  const windowScroll = scroll === 'window'
  const composerRef = useRef<HTMLDivElement>(null)
  const [composerHeight, setComposerHeight] = useState(88)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<Array<string | undefined>>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [dropActive, setDropActive] = useState(false)
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
    showActivity,
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

  useEffect(() => {
    generatingRef.current = generating
  }, [generating])

  useEffect(() => {
    attachmentUsageRef.current = attachmentUsage
  }, [attachmentUsage])

  useEffect(() => {
    if (!windowScroll) return
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
  }, [windowScroll])

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

      const result = mergeChatDropFiles(
        pendingFilesRef.current,
        filesFromDataTransfer(event.dataTransfer),
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
    [allowAttachments, replacePendingFiles, resetDropState]
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

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full flex-col',
        windowScroll ? 'min-h-svh' : 'min-h-0 flex-1'
      )}
      style={windowScroll ? { paddingBottom: composerHeight } : undefined}
      {...dropHandlers}
    >
      {statusLiveRegion}
      {allowAttachments ? (
        <div
          aria-hidden="true"
          className={cn(
            'bg-background/80 pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-150 motion-reduce:duration-0',
            dropActive && 'opacity-100'
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileUpIcon className="size-4" strokeWidth={1.5} />
              Déposer pour joindre
            </span>
            <span className="text-muted-foreground text-xs">
              PDF, Office, images et fichiers texte
            </span>
          </div>
        </div>
      ) : null}
      <MessageScrollerProvider key={boot.configId} autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className={windowScroll ? 'h-auto min-h-0 overflow-visible' : 'flex-1'}>
          <MessageScrollerViewport
            className={
              windowScroll
                ? 'h-auto min-h-0 w-full scrollbar-auto [scrollbar-gutter:auto] overflow-visible [contain:none]'
                : undefined
            }
          >
            <MessageScrollerContent
              aria-busy={generating}
              className={cn(
                'mx-auto flex flex-col px-6',
                CHAT_MEASURE,
                windowScroll ? 'gap-8 pt-8 pb-6' : 'gap-6 py-6'
              )}
            >
              {intro ? (
                <MessageScrollerItem messageId="intro">
                  <ChatIntro
                    boot={boot}
                    iconSrc={intro.iconSrc}
                    showExamples={messages.length === 0}
                    onExample={(text) => handleSend(text)}
                  />
                </MessageScrollerItem>
              ) : null}
              <ChatMessages
                messages={messages}
                status={status}
                boot={boot}
                onRegenerate={regenerate}
              />
              {showActivity && messages.at(-1)?.parts.length === 0 ? (
                <MessageScrollerItem messageId="thinking">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                    Réflexion
                  </div>
                </MessageScrollerItem>
              ) : null}
              {intro && boot.disclaimer && hasFinishedAssistantReply(messages) ? (
                <MessageScrollerItem messageId="disclaimer">
                  <p className="text-muted-foreground text-xs">{boot.disclaimer}</p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          {windowScroll ? null : <MessageScrollerButton />}
        </MessageScroller>
      </MessageScrollerProvider>

      <div
        ref={composerRef}
        className={cn(
          windowScroll
            ? 'bg-background fixed inset-x-0 bottom-0 z-10 px-6 pt-6 pb-6'
            : cn('mx-auto flex flex-col gap-2 px-6 pb-6', CHAT_MEASURE)
        )}
      >
        <div
          className={windowScroll ? cn('mx-auto flex flex-col gap-2', CHAT_MEASURE) : 'contents'}
        >
          {pendingQuestionnaire ? (
            <QuestionCard
              pending={pendingQuestionnaire}
              error={questionnaireError}
              onAnswer={submitQuestionnaire}
            />
          ) : null}
          <ChatComposer
            status={status}
            files={allowAttachments ? pendingFiles : []}
            previewUrls={allowAttachments ? pendingPreviewUrls : []}
            fileErrors={allowAttachments ? fileErrors : []}
            dropActive={allowAttachments && dropActive}
            composerAccessory={composerAccessory}
            onSend={handleSend}
            onRemoveFile={handleRemoveFile}
            onFilesSent={handleFilesSent}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  )
})
