import { FileUpIcon, LoaderCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessages } from '@/features/chat/components/ChatMessages'
import { QuestionCard } from '@/features/chat/components/QuestionCard'
import { isChatGenerating, useChatSession } from '@/features/chat/hooks/use-chat-session'
import {
  filesFromDataTransfer,
  hasDraggedFiles,
  mergeChatDropFiles
} from '@/features/chat/lib/chat-drop-files'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/shared/components/ui/message-scroller'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import { cn } from '@/shared/lib/utils'
import type { ChatBootData } from '@/shared/types'

interface Props {
  url: string
  boot: ChatBootData
  agentName: string
  onBootChange: (boot: ChatBootData) => void
}

function DiscuterChat({ url, boot, agentName, onBootChange }: Props) {
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
      url,
      convId: boot.convId,
      configId: boot.configId,
      dataParam: boot.dataParam
    }),
    [url, boot.convId, boot.configId, boot.dataParam]
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
  } = useChatSession(chatConfig)

  useRegisterNavigationHandlers('chat', {
    beforeLeave: async () => {
      stop()
      releaseConversationVm(url, boot.convId)
    }
  })

  const handleProfileSelect = useCallback(
    async (newConfigId: string) => {
      if (newConfigId === boot.configId) return
      stop()
      releaseConversationVm(url, boot.convId)
      const data = await window.api.getChatBoot({ url, config: newConfigId })
      if (!data) {
        resetAfterAbortedStop()
        return
      }
      clearMessages()
      for (const previewUrl of pendingPreviewUrlsRef.current) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
      }
      pendingFilesRef.current = []
      pendingPreviewUrlsRef.current = []
      setPendingFiles([])
      setPendingPreviewUrls([])
      setFileErrors([])
      onBootChange(data)
    },
    [boot.configId, boot.convId, stop, resetAfterAbortedStop, clearMessages, onBootChange, url]
  )

  const generating = isChatGenerating(status)

  useEffect(() => {
    generatingRef.current = generating
  }, [generating])

  useEffect(() => {
    attachmentUsageRef.current = attachmentUsage
  }, [attachmentUsage])

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

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    if (generatingRef.current) return
    dragDepthRef.current += 1
    if (dragDepthRef.current === 1) setDropActive(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = generatingRef.current ? 'none' : 'copy'
  }, [])

  const handleDragLeave = useCallback(() => {
    if (dragDepthRef.current === 0) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current === 0) setDropActive(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event.dataTransfer)) return
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
    [replacePendingFiles, resetDropState]
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
      void sendMessage(text, { files })
    },
    [sendMessage]
  )

  return (
    <div
      className="relative mx-auto flex min-h-0 w-full flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {statusLiveRegion}
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
      <MessageScrollerProvider key={boot.configId} autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent
              aria-busy={generating}
              className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-6"
            >
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
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {pendingQuestionnaire ? (
          <QuestionCard
            pending={pendingQuestionnaire}
            error={questionnaireError}
            onAnswer={submitQuestionnaire}
          />
        ) : null}
        <ChatComposer
          boot={boot}
          status={status}
          agentName={agentName}
          files={pendingFiles}
          previewUrls={pendingPreviewUrls}
          fileErrors={fileErrors}
          dropActive={dropActive}
          onSend={handleSend}
          onRemoveFile={handleRemoveFile}
          onFilesSent={handleFilesSent}
          onStop={stop}
          onProfileSelect={handleProfileSelect}
        />
      </div>
    </div>
  )
}

export { DiscuterChat }
