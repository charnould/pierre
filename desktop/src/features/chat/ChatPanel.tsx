import { LoaderCircleIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessages } from '@/features/chat/components/ChatMessages'
import { QuestionCard } from '@/features/chat/components/QuestionCard'
import { isChatGenerating, useChatSession } from '@/features/chat/hooks/use-chat-session'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/shared/components/ui/message-scroller'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import type { ChatBootData } from '@/shared/types'

interface Props {
  url: string
  boot: ChatBootData
  agentName: string
  onBootChange: (boot: ChatBootData) => void
}

function DiscuterChat({ url, boot, agentName, onBootChange }: Props) {
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
      onBootChange(data)
    },
    [boot.configId, boot.convId, stop, resetAfterAbortedStop, clearMessages, onBootChange, url]
  )

  const generating = isChatGenerating(status)

  return (
    <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col">
      {statusLiveRegion}
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
          onSend={sendMessage}
          onStop={stop}
          onProfileSelect={handleProfileSelect}
        />
      </div>
    </div>
  )
}

export { DiscuterChat }
