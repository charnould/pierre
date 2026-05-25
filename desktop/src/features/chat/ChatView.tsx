import { MessageSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationScrollReset
} from '@/features/chat/components/ai/conversation'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessages } from '@/features/chat/components/ChatMessages'
import { useChatSession } from '@/features/chat/hooks/use-chat-session'
import {
  PANEL_BG_CLASS,
  PANEL_CONTENT_MAX_W,
  panelContentStagger,
  panelScreen,
  panelScreenChild
} from '@/features/workflow/components/WorkflowPanelChrome'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import { cancelNdjsonStream } from '@/shared/lib/run-ndjson-stream'
import type { ChatBootData } from '@/shared/types'

interface PanelProps {
  hidden: boolean
  isLoggedIn: boolean
  url?: string
}

interface ChatProps {
  hidden: boolean
  url: string
  boot: ChatBootData
  onBootChange: (boot: ChatBootData) => void
}

function DiscuterChat({ hidden, url, boot, onBootChange }: ChatProps) {
  const chatConfig = useMemo(
    () => ({
      url,
      convId: boot.convId,
      configId: boot.configId,
      dataParam: boot.dataParam
    }),
    [url, boot.convId, boot.configId, boot.dataParam]
  )

  const { messages, status, sendMessage, stop, regenerate, clearMessages } =
    useChatSession(chatConfig)

  const stopRef = useRef(stop)
  stopRef.current = stop

  useRegisterNavigationHandlers('chat', {
    beforeLeave: async () => {
      stopRef.current()
      releaseConversationVm(url, boot.convId)
    }
  })

  const handleProfileSelect = useCallback(
    async (newConfigId: string) => {
      if (newConfigId === boot.configId) return
      cancelNdjsonStream()
      const data = await window.api.getChatBoot({ url, config: newConfigId })
      if (!data) return
      clearMessages()
      onBootChange(data)
    },
    [boot.configId, clearMessages, onBootChange, url]
  )

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col items-center px-4 pt-1 pb-4"
      variants={panelContentStagger}
      initial={false}
      animate={hidden ? 'hidden' : 'visible'}
    >
      <motion.div
        className={`relative flex min-h-0 w-full ${PANEL_CONTENT_MAX_W} flex-1 flex-col overflow-hidden`}
        variants={panelScreenChild}
      >
        <Conversation key={boot.configId} className="h-full min-h-0">
          <ConversationScrollReset />
          <ConversationContent className="gap-7 px-1 pt-2 pb-24">
            <ChatMessages
              messages={messages}
              status={status}
              boot={boot}
              onRegenerate={regenerate}
              onSend={sendMessage}
            />
          </ConversationContent>
          <div aria-hidden className="app-floating-dock-fade" />
          <ConversationScrollButton className="bottom-6" />
        </Conversation>
      </motion.div>

      <motion.div
        className={`relative z-10 w-full ${PANEL_CONTENT_MAX_W} shrink-0 pt-2`}
        variants={panelScreenChild}
      >
        <ChatComposer
          boot={boot}
          status={status}
          onSend={sendMessage}
          onStop={stop}
          onProfileSelect={handleProfileSelect}
        />
      </motion.div>
    </motion.div>
  )
}

export function ChatView({ hidden, isLoggedIn, url }: PanelProps) {
  const [boot, setBoot] = useState<ChatBootData | null>(null)
  const [loadingBoot, setLoadingBoot] = useState(false)

  const loadBoot = useCallback(async () => {
    if (!url || !window.api?.getChatBoot) return null
    setLoadingBoot(true)
    try {
      const data = await window.api.getChatBoot({ url })
      if (data) setBoot(data)
      return data
    } finally {
      setLoadingBoot(false)
    }
  }, [url])

  useEffect(() => {
    if (!isLoggedIn || !url || hidden) return
    void loadBoot()
  }, [isLoggedIn, url, hidden, loadBoot])

  const showPlaceholder = !isLoggedIn || !url || !boot
  const showBootLoading = loadingBoot && !boot

  return (
    <motion.div
      className={`tab-panel absolute inset-0 flex min-h-0 flex-col overflow-hidden ${PANEL_BG_CLASS}`}
      initial={false}
      animate={hidden ? 'hidden' : 'visible'}
      variants={panelScreen}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 2
      }}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
          <Empty className="max-w-sm border-0">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-muted text-muted-foreground size-12 [&_svg]:size-5"
              >
                {showBootLoading ? <Spinner /> : <MessageSquare strokeWidth={1.5} />}
              </EmptyMedia>
              <EmptyTitle>Discuter</EmptyTitle>
              <EmptyDescription>
                {!isLoggedIn || !url
                  ? 'Configurez et connectez-vous pour accéder au chatbot.'
                  : showBootLoading
                    ? 'Chargement du chatbot…'
                    : 'Impossible de charger le chatbot.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <DiscuterChat hidden={hidden} url={url} boot={boot} onBootChange={setBoot} />
      )}
    </motion.div>
  )
}
